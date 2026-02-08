
import React from 'react';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCY_SYMBOLS } from '../types';

const Settings: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const { user, logout } = useAuth();
  const [showCurrencyMenu, setShowCurrencyMenu] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

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
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        <div>
          <h3 className="text-moni-gray text-[10px] uppercase font-bold tracking-widest mb-4">Compte</h3>
          <div className="space-y-3">
             {[
               { icon: 'fas fa-user-edit', label: 'Informations personnelles' },
               { icon: 'fas fa-shield-alt', label: 'Sécurité & PIN' },
               { icon: 'fas fa-bell', label: 'Notifications' },
               { icon: 'fas fa-fingerprint', label: 'Biométrie' }
             ].map((item, i) => (
               <button key={i} className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4 text-moni-white">
                    <i className={`${item.icon} text-moni-accent w-5 text-center`}></i>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
               </button>
             ))}
          </div>
        </div>

        <div>
          <h3 className="text-moni-gray text-[10px] uppercase font-bold tracking-widest mb-4">Application</h3>
          <div className="space-y-3">
             {[
               { icon: 'fas fa-globe', label: 'Langue', value: 'Français' },
               { icon: 'fas fa-question-circle', label: 'Aide & Support' },
               { icon: 'fas fa-file-alt', label: 'Conditions Générales' }
             ].map((item, i) => (
               <button key={i} className="w-full flex justify-between items-center p-4 bg-moni-card rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4 text-moni-white">
                    <i className={`${item.icon} text-moni-accent w-5 text-center`}></i>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && <span className="text-xs text-moni-gray">{item.value}</span>}
                    <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
                  </div>
               </button>
             ))}
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
    </div>
  );
};

export default Settings;
