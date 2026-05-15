import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Notification } from '../types';

const toDate = (value: any): Date => {
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value || Date.now());
};

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<(Notification & { id: string })[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          amount: data.amount,
          senderName: data.senderName,
          senderMoniNumber: data.senderMoniNumber,
          senderId: data.senderId,
          timestamp: toDate(data.timestamp),
          read: Boolean(data.read),
          actionRequired: Boolean(data.actionRequired),
          transactionId: data.transactionId,
        };
      }) as (Notification & { id: string })[];

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      console.error('Error listening to notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    });

    return unsubscribe;
  }, [userId]);

  return { notifications, unreadCount };
};
