import { useState, useCallback } from 'react';
import { ToastNotification } from '../components/NotificationToast';

export const useNotificationToast = () => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = useCallback((
    notification: Omit<ToastNotification, 'id'>
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newNotification: ToastNotification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
      sound: notification.sound !== false
    };

    setNotifications((prev) => [...prev, newNotification]);

    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback((title: string, message: string) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration: 4000,
      sound: true
    });
  }, [addNotification]);

  const error = useCallback((title: string, message: string) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 5000,
      sound: true
    });
  }, [addNotification]);

  const info = useCallback((title: string, message: string) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
      sound: false
    });
  }, [addNotification]);

  const transferReceived = useCallback((senderName: string, amount: number) => {
    return addNotification({
      type: 'transfer-received',
      title: 'Transfert reçu',
      message: `${senderName} vous a envoyé ${amount}`,
      duration: 0, // Ne pas auto-dismiss
      sound: true
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    dismissNotification,
    success,
    error,
    info,
    transferReceived
  };
};
