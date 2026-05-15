import React from 'react';
import { Notification } from '../types';
import { markNotificationAsRead } from '../lib/transactionUtils';

interface NotificationCenterProps {
  notifications: (Notification & { id: string })[];
  onNotificationRead?: (notificationId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const formatDate = (timestamp: any) => {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getIcon = (type: Notification['type']) => {
  if (type === 'transfer-received') return 'fas fa-arrow-down';
  if (type === 'p2p-received' || type === 'p2p-request') return 'fas fa-hand-holding-heart';
  if (type === 'deposit-completed' || type === 'withdraw-completed') return 'fas fa-check-circle';
  return 'fas fa-file-invoice-dollar';
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onNotificationRead, isOpen, onClose }) => {
  const unreadNotifications = notifications.filter(n => !n.read);
  const visibleNotifications = notifications.slice(0, 30);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      onNotificationRead?.(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (isOpen === false) return null;
  if (isOpen === undefined && unreadNotifications.length === 0) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
      onClick={onClose}
    >
      <div
        className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto border-t border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 id="notification-center-title" className="text-xl font-bold text-moni-white font-montserrat">Notifications</h2>
            <p className="text-moni-gray text-xs mt-1">
              {unreadNotifications.length > 0
                ? `${unreadNotifications.length} non lue${unreadNotifications.length > 1 ? 's' : ''}`
                : 'Tout est à jour'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadNotifications.length > 0 && (
              <span className="bg-moni-accent text-moni-bg text-xs font-bold px-3 py-1 rounded-full">
                {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 text-moni-white hover:bg-white/20 transition-colors"
                type="button"
                aria-label="Fermer les notifications"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {visibleNotifications.length === 0 ? (
          <div className="bg-moni-bg rounded-2xl p-5 border border-white/10 text-center">
            <div className="w-12 h-12 rounded-full bg-moni-accent/10 flex items-center justify-center text-moni-accent mx-auto mb-3">
              <i className="far fa-bell"></i>
            </div>
            <h3 className="text-moni-white text-sm font-semibold">Aucune notification</h3>
            <p className="text-moni-gray text-xs mt-1">Les activités importantes de votre compte apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-moni-bg rounded-2xl p-4 border transition-all ${
                notification.read ? 'border-white/10 opacity-75' : 'border-moni-accent/30 hover:border-moni-accent'
              }`}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-moni-accent/20 flex items-center justify-center text-moni-accent flex-shrink-0">
                  <i className={getIcon(notification.type)}></i>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-moni-white font-semibold text-sm">{notification.title}</h3>
                    {!notification.read && <span className="w-2 h-2 rounded-full bg-moni-accent flex-shrink-0 mt-1.5"></span>}
                  </div>
                  <p className="text-moni-gray text-xs mt-1">{notification.message}</p>
                  {notification.senderName && (
                    <p className="text-moni-accent text-xs font-semibold mt-2">
                      De: {notification.senderName}
                    </p>
                  )}
                  {notification.actionRequired && (
                    <p className="text-yellow-300 text-[10px] font-semibold mt-2">Action requise</p>
                  )}
                  {notification.timestamp && (
                    <p className="text-moni-gray text-[10px] mt-2">{formatDate(notification.timestamp)}</p>
                  )}
                </div>
              </div>

              {notification.amount && (
                <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-moni-gray text-xs">Montant</span>
                    <span className="text-moni-accent font-bold text-sm">${notification.amount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {!notification.read ? (
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="w-full bg-moni-accent text-moni-bg py-2 rounded-xl font-semibold text-sm hover:bg-moni-accent/90 transition-all active:scale-95"
                  type="button"
                >
                  Marquer comme lu
                </button>
              ) : (
                <div className="w-full bg-white/5 text-moni-gray py-2 rounded-xl font-semibold text-xs text-center">
                  Lu
                </div>
              )}
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
