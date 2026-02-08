import React from 'react';
import { Notification } from '../types';
import { markNotificationAsRead } from '../lib/transactionUtils';

interface NotificationCenterProps {
  notifications: (Notification & { id: string })[];
  onNotificationRead?: (notificationId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onNotificationRead }) => {
  const unreadNotifications = notifications.filter(n => !n.read);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      onNotificationRead?.(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (unreadNotifications.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Notifications</h2>
          <span className="bg-moni-accent text-moni-bg text-xs font-bold px-3 py-1 rounded-full">
            {unreadNotifications.length}
          </span>
        </div>

        {/* Notifications List */}
        <div className="space-y-3 mb-6">
          {unreadNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-moni-bg rounded-2xl p-4 border border-moni-accent/30 hover:border-moni-accent transition-all"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-moni-accent/20 flex items-center justify-center text-moni-accent flex-shrink-0">
                  <i className={`fas fa-${
                    notification.type === 'transfer-received' ? 'arrow-down' :
                    notification.type === 'p2p-received' ? 'hand-holding-heart' :
                    notification.type === 'deposit-completed' ? 'check-circle' :
                    notification.type === 'withdraw-completed' ? 'check-circle' :
                    'file-invoice-dollar'
                  }`}></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">{notification.title}</h3>
                  <p className="text-moni-gray text-xs mt-1">{notification.message}</p>
                  {notification.senderName && (
                    <p className="text-moni-accent text-xs font-semibold mt-2">
                      De: {notification.senderName}
                    </p>
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

              <button
                onClick={() => handleMarkAsRead(notification.id)}
                className="w-full bg-moni-accent text-moni-bg py-2 rounded-xl font-semibold text-sm hover:bg-moni-accent/90 transition-all active:scale-95"
              >
                OK
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
