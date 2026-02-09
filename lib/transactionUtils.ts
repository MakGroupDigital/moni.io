import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  increment,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { FirestoreTransaction, Notification } from '../types';

// Créer une transaction
export const createTransaction = async (transaction: Omit<FirestoreTransaction, 'id' | 'timestamp'>) => {
  try {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...transaction,
      timestamp: Timestamp.now(),
      status: 'pending'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

// Mettre à jour le statut d'une transaction
export const updateTransactionStatus = async (transactionId: string, status: 'completed' | 'failed') => {
  try {
    await updateDoc(doc(db, 'transactions', transactionId), {
      status
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    throw error;
  }
};

// Créer une notification
export const createNotification = async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notification,
      timestamp: Timestamp.now(),
      read: false
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Marquer une notification comme lue
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      actionRequired: false
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Obtenir les notifications non lues d'un utilisateur
export const getUnreadNotifications = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (Notification & { id: string })[];
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
};

// Nettoyer les données en supprimant les champs undefined et null
const cleanData = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Effectuer un transfert (dépôt, retrait, envoi, etc.)
export const performTransfer = async (
  senderId: string,
  recipientMoniNumber: string | null,
  amount: number,
  type: 'deposit' | 'withdraw' | 'send' | 'p2p-send' | 'bill',
  transactionData: Omit<FirestoreTransaction, 'id' | 'timestamp' | 'userId' | 'type' | 'amount' | 'status'>
) => {
  try {
    // Vérifier si le document utilisateur existe
    const senderRef = doc(db, 'users', senderId);
    
    let senderDoc;
    try {
      senderDoc = await getDoc(senderRef);
    } catch (error: any) {
      if (error?.code === 'failed-precondition' || error?.message?.includes('offline')) {
        throw new Error('Connexion perdue. Vérifiez votre connexion Internet et réessayez.');
      }
      throw error;
    }
    
    // Si le document n'existe pas, le créer avec un solde initial
    if (!senderDoc.exists()) {
      await setDoc(senderRef, {
        uid: senderId,
        balance: 0,
        paypalBalance: 0,
        createdAt: Timestamp.now()
      });
    }

    // Maintenant on peut faire le batch
    const batch = writeBatch(db);

    // Créer la transaction
    const transactionRef = doc(collection(db, 'transactions'));
    batch.set(transactionRef, cleanData({
      userId: senderId,
      type,
      amount,
      status: 'completed',
      timestamp: Timestamp.now(),
      ...transactionData
    }));

    // Mettre à jour le solde de l'expéditeur
    if (type === 'deposit') {
      batch.update(senderRef, { balance: increment(amount) });
    } else if (type === 'withdraw' || type === 'send' || type === 'p2p-send' || type === 'bill') {
      batch.update(senderRef, { balance: increment(-amount) });
    }

    // Si c'est un transfert vers un destinataire, mettre à jour son solde et créer une notification
    if (recipientMoniNumber && (type === 'send' || type === 'p2p-send')) {
      // Chercher l'utilisateur destinataire par moniNumber
      const recipientQuery = query(
        collection(db, 'users'),
        where('moniNumber', '==', recipientMoniNumber)
      );
      
      const recipientSnapshot = await getDocs(recipientQuery);
      
      if (recipientSnapshot.empty) {
        throw new Error('Destinataire non trouvé');
      }

      const recipientDoc = recipientSnapshot.docs[0];
      const recipientRef = recipientDoc.ref;
      const recipientId = recipientDoc.id;

      batch.update(recipientRef, { balance: increment(amount) });

      // Créer une transaction de réception pour le destinataire
      const receiveTransactionRef = doc(collection(db, 'transactions'));
      batch.set(receiveTransactionRef, cleanData({
        userId: recipientId,
        type: type === 'send' ? 'receive' : 'p2p-receive',
        amount,
        status: 'completed',
        timestamp: Timestamp.now(),
        title: 'Argent reçu',
        description: `De ${transactionData.senderName}`,
        icon: 'fas fa-arrow-down',
        color: '#00F5D4',
        reference: transactionData.reference,
        metadata: transactionData.metadata,
        senderId,
        senderName: transactionData.senderName,
        senderMoniNumber: transactionData.senderMoniNumber,
        message: transactionData.message
      }));

      // Créer une notification persistante pour le destinataire
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, cleanData({
        userId: recipientId,
        type: type === 'send' ? 'transfer-received' : 'p2p-received',
        title: `Vous avez reçu ${amount}`,
        message: `${transactionData.senderName} vous a envoyé ${amount}${transactionData.message ? ': ' + transactionData.message : ''}`,
        amount,
        senderName: transactionData.senderName,
        senderMoniNumber: transactionData.senderMoniNumber,
        timestamp: Timestamp.now(),
        read: false,
        actionRequired: true,
        transactionId: receiveTransactionRef.id
      }));
    }

    await batch.commit();
    return transactionRef.id;
  } catch (error: any) {
    console.error('Error performing transfer:', error);
    
    // Améliorer le message d'erreur pour les cas offline
    if (error?.code === 'failed-precondition' || error?.message?.includes('offline')) {
      throw new Error('Connexion perdue. Vérifiez votre connexion Internet et réessayez.');
    }
    
    throw error;
  }
};

// Obtenir les transactions d'un utilisateur
export const getUserTransactions = async (userId: string, limit: number = 10) => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (FirestoreTransaction & { id: string })[];
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    throw error;
  }
};

// Obtenir le solde d'un utilisateur
export const getUserBalance = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().balance || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching user balance:', error);
    throw error;
  }
};

// Mettre à jour le solde d'un utilisateur
export const updateUserBalance = async (userId: string, amount: number) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      balance: increment(amount)
    });
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  }
};


// Créer une demande P2P (demander de l'argent)
export const createP2PRequest = async (
  senderId: string,
  recipientMoniNumber: string,
  amount: number,
  message?: string
) => {
  try {
    // Chercher l'utilisateur destinataire par moniNumber
    const recipientQuery = query(
      collection(db, 'users'),
      where('moniNumber', '==', recipientMoniNumber)
    );
    
    const recipientSnapshot = await getDocs(recipientQuery);
    
    if (recipientSnapshot.empty) {
      throw new Error('Destinataire non trouvé');
    }

    const recipientDoc = recipientSnapshot.docs[0];
    const recipientId = recipientDoc.id;
    const recipientData = recipientDoc.data();
    
    console.log('Recipient found:', { recipientId, moniNumber: recipientData.moniNumber });

    // Récupérer les données de l'expéditeur
    const senderRef = doc(db, 'users', senderId);
    const senderDoc = await getDoc(senderRef);
    
    if (!senderDoc.exists()) {
      throw new Error('Utilisateur non trouvé');
    }

    const senderData = senderDoc.data();

    // Créer une notification de demande P2P pour le destinataire
    const senderName = senderData.displayName || 'Utilisateur';
    const senderMoniNumber = senderData.moniNumber;
    console.log('Creating P2P request - senderMoniNumber:', senderMoniNumber, 'senderData:', senderData);
    const docRef = await addDoc(collection(db, 'notifications'), {
      userId: recipientId,
      type: 'p2p-request',
      title: 'Demande de paiement',
      message: `${senderName} vous demande ${amount}$${message ? ': ' + message : ''}`,
      amount,
      senderName: senderName,
      senderMoniNumber: senderMoniNumber,
      senderId,
      timestamp: Timestamp.now(),
      read: false,
      actionRequired: true
    });
    console.log('P2P request notification created:', docRef.id);

    return docRef.id;
  } catch (error: any) {
    console.error('Error creating P2P request:', error);
    throw error;
  }
};

// Récupérer les demandes P2P reçues par un utilisateur
export const getReceivedP2PRequests = async (userId: string) => {
  try {
    console.log('Fetching P2P requests for user:', userId);
    // Récupérer toutes les notifications de l'utilisateur
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    console.log('Total notifications found:', snapshot.docs.length);
    
    // Filtrer les demandes P2P en JavaScript
    const p2pRequests = snapshot.docs
      .filter(doc => {
        const type = doc.data().type;
        console.log('Notification type:', type);
        return type === 'p2p-request';
      })
      .map(doc => {
        const data = doc.data();
        console.log('P2P request data:', { senderMoniNumber: data.senderMoniNumber, senderId: data.senderId });
        return {
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName || 'Utilisateur',
          senderMoniNumber: data.senderMoniNumber,
          amount: data.amount,
          status: 'pending' as const,
          timestamp: data.timestamp?.toDate?.() || new Date(),
          message: data.message
        };
      });
    
    console.log('P2P requests found:', p2pRequests.length);
    return p2pRequests;
  } catch (error) {
    console.error('Error fetching P2P requests:', error);
    return [];
  }
};
