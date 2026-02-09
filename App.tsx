import React, { useState, createContext, useContext } from 'react';
import { AppTab, Currency } from './types';
import Dashboard from './views/Dashboard';
import Stats from './views/Stats';
import Cards from './views/Cards';
import Settings from './views/Settings';
import Scan from './views/Scan';
import Layout from './components/Layout';
import DepositModal from './components/DepositModal';
import WithdrawModal from './components/WithdrawModal';
import PayPalModal from './components/PayPalModal';
import SendModal from './components/SendModal';
import P2PModal from './components/P2PModal';
import BillsModal from './components/BillsModal';
import USSDModal from './components/USSDModal';
import NotificationCenter from './components/NotificationCenter';
import Splash from './views/Splash';
import Login from './views/Login';
import Onboarding from './views/Onboarding';
import UserProfile from './views/UserProfile';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useNotifications } from './lib/useNotifications';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

const AppContent: React.FC<{ currency: Currency; setCurrency: (c: Currency) => void }> = ({ currency, setCurrency }) => {
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.HOME);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [showUSSDModal, setShowUSSDModal] = useState(false);
  
  // Récupérer l'utilisateur et les notifications
  const { user, loading } = useAuth();
  const { notifications } = useNotifications(user?.uid);

  // Gérer la redirection après le splash
  const handleSplashComplete = (isAuthenticated: boolean, onboardingCompleted: boolean) => {
    setShowSplash(false);

    if (isAuthenticated) {
      // Utilisateur authentifié
      if (!onboardingCompleted) {
        // Première connexion - afficher l'onboarding
        setShowOnboarding(true);
      }
      // Sinon, le dashboard s'affichera automatiquement
    }
    // Si pas authentifié, le login s'affichera automatiquement
  };

  // Toujours afficher le splash d'abord
  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  // Si pas connecté, afficher la page de login
  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Si en train de charger, afficher un écran de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-moni-dark">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse mx-auto">
            <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
          </div>
          <p className="text-moni-gray text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si connecté mais pas d'onboarding, afficher l'onboarding
  if (showOnboarding) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.setItem('onboarding_completed', 'true');
          setShowOnboarding(false);
          setShowUserProfile(true);
        }}
      />
    );
  }

  // Afficher le profil utilisateur après l'onboarding
  if (showUserProfile) {
    return (
      <UserProfile
        onComplete={() => {
          setShowUserProfile(false);
        }}
      />
    );
  }

  const renderView = () => {
    switch (currentTab) {
      case AppTab.HOME:
        return <Dashboard onShowDeposit={() => setShowDepositModal(true)} onShowWithdraw={() => setShowWithdrawModal(true)} onShowPayPal={() => setShowPayPalModal(true)} onShowSend={() => setShowSendModal(true)} onShowP2P={() => setShowP2PModal(true)} onShowBills={() => setShowBillsModal(true)} onShowUSSD={() => setShowUSSDModal(true)} />;
      case AppTab.STATS:
        return <Stats />;
      case AppTab.SCAN:
        return <Scan />;
      case AppTab.CARDS:
        return <Cards />;
      case AppTab.SETTINGS:
        return <Settings />;
      default:
        return <Dashboard onShowDeposit={() => setShowDepositModal(true)} onShowWithdraw={() => setShowWithdrawModal(true)} onShowPayPal={() => setShowPayPalModal(true)} onShowSend={() => setShowSendModal(true)} onShowP2P={() => setShowP2PModal(true)} onShowBills={() => setShowBillsModal(true)} onShowUSSD={() => setShowUSSDModal(true)} />;
    }
  };

  return (
    <div className="md:flex md:items-center md:justify-center md:min-h-screen bg-moni-dark md:p-4">
      <Layout 
        currentTab={currentTab} 
        onTabChange={setCurrentTab}
        depositModal={<DepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} onDepositSuccess={() => setShowDepositModal(false)} />}
        withdrawModal={<WithdrawModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} onWithdrawSuccess={() => setShowWithdrawModal(false)} />}
        paypalModal={<PayPalModal isOpen={showPayPalModal} onClose={() => setShowPayPalModal(false)} paypalBalance={145.00} />}
        sendModal={<SendModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} userBalance={user?.balance || 0} onSendSuccess={() => setShowSendModal(false)} />}
        p2pModal={<P2PModal isOpen={showP2PModal} onClose={() => setShowP2PModal(false)} userBalance={user?.balance || 0} onP2PSuccess={() => setShowP2PModal(false)} />}
        billsModal={<BillsModal isOpen={showBillsModal} onClose={() => setShowBillsModal(false)} userBalance={user?.balance || 0} onBillPaySuccess={() => setShowBillsModal(false)} />}
        ussdModal={<USSDModal isOpen={showUSSDModal} onClose={() => setShowUSSDModal(false)} />}
      >
        {renderView()}
      </Layout>
      <NotificationCenter notifications={notifications} />
    </div>
  );
};

const App: React.FC = () => {
  const [currency, setCurrency] = useState<Currency>('USD');

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      <NotificationProvider>
        <AppContent currency={currency} setCurrency={setCurrency} />
      </NotificationProvider>
    </CurrencyContext.Provider>
  );
};

export default App;
