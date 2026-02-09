import React, { createContext, useContext } from 'react';
import { useNotificationToast } from '../lib/useNotificationToast';

interface NotificationContextType {
  success: (title: string, message: string) => string;
  error: (title: string, message: string) => string;
  info: (title: string, message: string) => string;
  transferReceived: (senderName: string, amount: number) => string;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { success, error, info, transferReceived, dismissNotification } = useNotificationToast();

  return (
    <NotificationContext.Provider value={{
      success,
      error,
      info,
      transferReceived,
      dismiss: dismissNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  
  // Si pas de contexte, créer des fonctions par défaut
  if (!context) {
    return {
      success: (title: string, message: string) => {
        console.log(`Success: ${title} - ${message}`);
        return '';
      },
      error: (title: string, message: string) => {
        console.log(`Error: ${title} - ${message}`);
        return '';
      },
      info: (title: string, message: string) => {
        console.log(`Info: ${title} - ${message}`);
        return '';
      },
      transferReceived: (senderName: string, amount: number) => {
        console.log(`Transfer received from ${senderName}: ${amount}`);
        return '';
      },
      dismiss: (id: string) => {
        console.log(`Dismiss: ${id}`);
      }
    };
  }
  
  return context;
};
