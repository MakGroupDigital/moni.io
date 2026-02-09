import React, { useEffect, useState } from 'react';
import { IncomingNotification, useIncomingNotifications } from '../lib/useIncomingNotifications';
import { playSuccessSound } from '../lib/notificationSound';

interface PersistentNotificationsProps {
  userId: string | undefined;
}

const PersistentNotifications: React.FC<PersistentNotificationsProps> = ({ userId }) => {
  const { notifications, dismissNotification } = useIncomingNotifications(userId);
  const [playedNotifications, setPlayedNotifications] = useState<Set<string>>(new Set());

  // Jouer le son pour les nouvelles notifications non lues
  useEffect(() => {
    notifications.forEach((notif) => {
      if (!notif.read && !playedNotifications.has(notif.id)) {
        playSuccessSound();
        setPlayedNotifications((prev) => new Set(prev).add(notif.id));
      }
    });
  }, [notifications, playedNotifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'transfer-received':
      case 'p2p-received':
        return 'fas fa-arrow-down';
      case 'p2p-request':
        return 'fas fa-hand-holding-heart';
      case 'deposit-completed':
        return 'fas fa-check-circle';
      case 'withdraw-completed':
        return 'fas fa-arrow-up';
      case 'bill-paid':
        return 'fas fa-file-invoice-dollar';
      default:
        return 'fas fa-bell';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'transfer-received':
      case 'p2p-received':
        return 'bg-moni-accent/10 border-moni-accent/30';
      case 'p2p-request':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'deposit-completed':
        return 'bg-green-500/10 border-green-500/30';
      case 'withdraw-completed':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'bill-paid':
        return 'bg-purple-500/10 border-purple-500/30';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'transfer-received':
      case 'p2p-received':
        return 'text-moni-accent';
      case 'p2p-request':
        return 'text-yellow-400';
      case 'deposit-completed':
        return 'text-green-400';
      case 'withdraw-completed':
        return 'text-blue-400';
      case 'bill-paid':
        return 'text-purple-400';
      default:
        return 'text-moni-white';
    }
  };

  // Afficher seulement les notifications non lues
  const unreadNotifications = notifications.filter((n) => !n.read);

  if (unreadNotifications.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-start justify-center pt-4 px-4">
      <div className="pointer-events-auto max-w-sm w-full space-y-3">
        {unreadNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`${getColor(notification.type)} border rounded-2xl p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300`}
          >
            <div className="flex items-start gap-3">
              <div className={`${getTextColor(notification.type)} text-xl flex-shrink-0 mt-0.5`}>
                <i className={getIcon(notification.type)}></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-moni-white font-semibold text-sm">{notification.title}</h4>
                <p className="text-moni-gray text-xs mt-1 break-words">{notification.message}</p>
                {notification.amount && (
                  <p className={`${getTextColor(notification.type)} font-bold text-sm mt-2`}>
                    {notification.amount}$
                  </p>
                )}
                <p className="text-moni-gray text-[10px] mt-2">
                  {notification.timestamp.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-moni-gray hover:text-moni-white transition-colors flex-shrink-0 text-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersistentNotifications;
