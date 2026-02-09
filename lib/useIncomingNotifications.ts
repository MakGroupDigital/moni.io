import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export interface IncomingNotification {
  id: string;
  userId: string;
  type: 'transfer-received' | 'p2p-received' | 'p2p-request' | 'deposit-completed' | 'withdraw-completed' | 'bill-paid';
  title: string;
  message: string;
  amount?: number;
  senderName?: string;
  senderMoniNumber?: string;
  senderId?: string;
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  transactionId?: string;
}

export const useIncomingNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<IncomingNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifs: IncomingNotification[] = [];
      let unread = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Convertir le timestamp Firestore en Date
        let dateObj: Date;
        if (data.timestamp?.toDate) {
          dateObj = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
          dateObj = data.timestamp;
        } else {
          dateObj = new Date(data.timestamp);
        }

        const notification: IncomingNotification = {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          amount: data.amount,
          senderName: data.senderName,
          senderMoniNumber: data.senderMoniNumber,
          timestamp: dateObj,
          read: data.read || false,
          actionRequired: data.actionRequired || false,
          transactionId: data.transactionId
        };

        notifs.push(notification);
        if (!notification.read) {
          unread++;
        }
      });

      // Trier par timestamp décroissant
      notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return unsubscribe;
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        actionRequired: false
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    dismissNotification
  };
};
