import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Notification } from '../types';

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
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Notification & { id: string })[];

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return unsubscribe;
  }, [userId]);

  return { notifications, unreadCount };
};
