
import React, { useState } from 'react';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCY_SYMBOLS } from '../types';
import QRCodeModal from '../components/QRCodeModal';
import {
  PersonalInfoModal,
  SecurityModal,
  NotificationsModal,
  BiometryModal,
  LanguageModal,
  HelpModal,
  TermsModal
} from '../components/SettingsModals';

const Settings: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const { user, logout } = useAuth();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Modales
  const [showQRCode, setShowQRCode] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBiometry, setShowBiometry] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const currencies = ['USD', 'EUR', 'CDF', 'XOF', 'FCFA'] as const;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('onboarding_completed');
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="px-5">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-xl font-bold text-moni-white font-montserrat">Paramètres</h1>
        <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
      </header>

      {/* Profile Header */}
      <div className="bg-moni-card rounded-3xl p-6 border border-white/5 mb-8 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-moni-bg border-4 border-moni-accent/20 overflow-hidden">
            <img src={user?.photoURL || "https://picsum.photos/seed/moussa/200"} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-moni-accent rounded-full flex items-center justify-center text-moni-bg text-sm border-2 border-moni-card">
            <i className="fas fa-camera"></i>
          </button>
        </div>
        <h2 className="text-moni-white font-bold text-lg">{user?.displayName || 'Utilisateur'}</h2>
        <p className="text-moni-gray text-xs">{user?.moniNumber}</p>
        <button
          onClick={() => setShowQRCode(true)}
          className="mt-4 px-4 py-2 bg-moni-accent/20 text-moni-accent rounded-lg text-xs font-semibold hover:bg-moni-accent/30 transition-all flex items-center gap-2"
        >
          <i className="fas fa-qrcode"></i>
          Mon QR Code
        </button>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        <div>
          <h3 className="text-moni-gray text-[10px] uppercase font-bold tracking-widest mb-4">Compte</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowPersonalInfo(true)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-user-edit text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Informations personnelles</span>
              </div>
              <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
            </button>

            <button
              onClick={() => setShowSecurity(true)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-shield-alt text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Sécurité & PIN</span>
              </div>
              <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
            </button>

            <button
              onClick={() => setShowNotifications(true)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-bell text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Notifications</span>
              </div>
              <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
            </button>

            <button
              onClick={() => setShowBiometry(true)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-fingerprint text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Biométrie</span>
              </div>
              <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-moni-gray text-[10px] uppercase font-bold tracking-widest mb-4">Application</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowLanguage(true)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-globe text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Langue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-moni-gray">Français</span>
                <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
              </div>
            </button>

            <button
              onClick={() => setShowHelp(true)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-question-circle text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Aide & Support</span>
              </div>
              <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
            </button>

            <button
              onClick={() => setShowTerms(true)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-file-alt text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Conditions Générales</span>
              </div>
              <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-moni-gray text-[10px] uppercase font-bold tracking-widest mb-4">Devise</h3>
          <div className="relative">
            <button 
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-moni-white">
                <i className="fas fa-dollar-sign text-moni-accent w-5 text-center"></i>
                <span className="text-sm">Devise préférée</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-moni-gray">{currency}</span>
                <i className={`fas fa-chevron-${showCurrencyMenu ? 'up' : 'down'} text-moni-gray text-xs`}></i>
              </div>
            </button>
            
            {showCurrencyMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-moni-card rounded-2xl border border-white/5 overflow-hidden z-10">
                {currencies.map((curr) => (
                  <button
                    key={curr}
                    onClick={() => {
                      setCurrency(curr);
                      setShowCurrencyMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      currency === curr 
                        ? 'bg-moni-accent/20 text-moni-accent' 
                        : 'text-moni-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm font-medium">{curr}</span>
                    <span className="text-xs text-moni-gray">{CURRENCY_SYMBOLS[curr]}</span>
                    {currency === curr && <i className="fas fa-check ml-auto text-moni-accent"></i>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full p-4 text-moni-danger font-bold text-sm bg-moni-danger/5 rounded-2xl border border-moni-danger/20 flex items-center justify-center gap-2 mt-8 mb-10 active:scale-95 transition-transform disabled:opacity-50"
        >
          <i className={`fas fa-${isLoggingOut ? 'spinner animate-spin' : 'sign-out-alt'}`}></i>
          {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
        </button>
      </div>

      {/* Modales */}
      <QRCodeModal isOpen={showQRCode} onClose={() => setShowQRCode(false)} user={user} />
      <PersonalInfoModal isOpen={showPersonalInfo} onClose={() => setShowPersonalInfo(false)} user={user} />
      <SecurityModal isOpen={showSecurity} onClose={() => setShowSecurity(false)} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <BiometryModal isOpen={showBiometry} onClose={() => setShowBiometry(false)} />
      <LanguageModal isOpen={showLanguage} onClose={() => setShowLanguage(false)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};

export default Settings;
