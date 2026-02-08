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

// Effectuer un transfert (dépôt, retrait, envoi, etc.)
export const performTransfer = async (
  senderId: string,
  recipientId: string | null,
  amount: number,
  type: 'deposit' | 'withdraw' | 'send' | 'p2p-send' | 'bill',
  transactionData: Omit<FirestoreTransaction, 'id' | 'timestamp' | 'userId' | 'type' | 'amount' | 'status'>
) => {
  try {
    // Vérifier si le document utilisateur existe
    const senderRef = doc(db, 'users', senderId);
    const senderDoc = await getDoc(senderRef);
    
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
    batch.set(transactionRef, {
      userId: senderId,
      type,
      amount,
      status: 'completed',
      timestamp: Timestamp.now(),
      ...transactionData
    });

    // Mettre à jour le solde de l'expéditeur
    if (type === 'deposit') {
      batch.update(senderRef, { balance: increment(amount) });
    } else if (type === 'withdraw' || type === 'send' || type === 'p2p-send' || type === 'bill') {
      batch.update(senderRef, { balance: increment(-amount) });
    }

    // Si c'est un transfert vers un destinataire, mettre à jour son solde et créer une notification
    if (recipientId && (type === 'send' || type === 'p2p-send')) {
      const recipientRef = doc(db, 'users', recipientId);
      const recipientDoc = await getDoc(recipientRef);
      
      // Si le document du destinataire n'existe pas, le créer
      if (!recipientDoc.exists()) {
        await setDoc(recipientRef, {
          uid: recipientId,
          balance: 0,
          paypalBalance: 0,
          createdAt: Timestamp.now()
        });
      }

      batch.update(recipientRef, { balance: increment(amount) });

      // Créer une transaction de réception pour le destinataire
      const receiveTransactionRef = doc(collection(db, 'transactions'));
      batch.set(receiveTransactionRef, {
        userId: recipientId,
        type: type === 'send' ? 'receive' : 'p2p-receive',
        amount,
        status: 'completed',
        timestamp: Timestamp.now(),
        ...transactionData,
        senderId,
        senderName: transactionData.senderName,
        senderMoniNumber: transactionData.senderMoniNumber
      });

      // Créer une notification persistante pour le destinataire
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
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
      });
    }

    await batch.commit();
    return transactionRef.id;
  } catch (error) {
    console.error('Error performing transfer:', error);
    throw error;
  }
};

// Obtenir les transactions d'un utilisateur
export const getUserTransactions = async (userId: string, limit: number = 10) => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      // Note: limit is applied in the component if needed
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
