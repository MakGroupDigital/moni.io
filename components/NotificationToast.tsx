import React, { useEffect, useState } from 'react';
import { playNotificationSound, playSuccessSound } from '../lib/notificationSound';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'transfer-received';
  title: string;
  message: string;
  duration?: number;
  sound?: boolean;
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onDismiss }) => {
  useEffect(() => {
    notifications.forEach((notification) => {
      // Jouer le son si demandé
      if (notification.sound) {
        if (notification.type === 'success' || notification.type === 'transfer-received') {
          playSuccessSound();
        } else {
          playNotificationSound();
        }
      }

      // Auto-dismiss après la durée spécifiée
      if (notification.duration) {
        const timer = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, onDismiss]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'transfer-received':
        return 'fas fa-arrow-down';
      default:
        return 'fas fa-info-circle';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500 text-green-200';
      case 'error':
        return 'bg-red-500/20 border-red-500 text-red-200';
      case 'transfer-received':
        return 'bg-moni-accent/20 border-moni-accent text-moni-accent';
      default:
        return 'bg-blue-500/20 border-blue-500 text-blue-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getColor(notification.type)} border rounded-xl p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300`}
        >
          <div className="flex items-start gap-3">
            <i className={`${getIcon(notification.type)} text-lg mt-0.5 flex-shrink-0`}></i>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-xs opacity-90 mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-lg opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
