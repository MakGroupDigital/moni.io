import React, { useState } from 'react';
import { AuthUser } from '../types';

interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export const PersonalInfoModal: React.FC<PersonalInfoModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Informations personnelles</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-moni-bg rounded-2xl p-4">
            <p className="text-moni-gray text-xs mb-2">Nom complet</p>
            <p className="text-moni-white font-semibold">{user.displayName}</p>
          </div>

          <div className="bg-moni-bg rounded-2xl p-4">
            <p className="text-moni-gray text-xs mb-2">Email</p>
            <p className="text-moni-white break-all">{user.email}</p>
          </div>

          <div className="bg-moni-bg rounded-2xl p-4">
            <p className="text-moni-gray text-xs mb-2">Numéro Moni</p>
            <p className="text-moni-white font-mono font-bold">{user.moniNumber}</p>
          </div>

          <div className="bg-moni-bg rounded-2xl p-4">
            <p className="text-moni-gray text-xs mb-2">Solde</p>
            <p className="text-moni-accent font-bold text-lg">${user.balance.toLocaleString()}</p>
          </div>

          <div className="bg-moni-bg rounded-2xl p-4">
            <p className="text-moni-gray text-xs mb-2">Compte créé le</p>
            <p className="text-moni-white">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinSet, setPinSet] = useState(false);

  const handleSetPin = () => {
    if (pin.length < 4) {
      alert('Le PIN doit contenir au moins 4 chiffres');
      return;
    }
    if (pin !== confirmPin) {
      alert('Les PINs ne correspondent pas');
      return;
    }
    localStorage.setItem('moni_pin', pin);
    setPinSet(true);
    setPin('');
    setConfirmPin('');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Sécurité & PIN</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {pinSet ? (
          <div className="bg-green-500/20 border border-green-500 rounded-2xl p-6 text-center mb-6">
            <i className="fas fa-check-circle text-green-400 text-3xl mb-3 block"></i>
            <p className="text-green-200 font-semibold">PIN défini avec succès!</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Nouveau PIN (4-6 chiffres)</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-center text-2xl tracking-widest"
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-3 text-moni-gray hover:text-moni-white"
                >
                  <i className={`fas fa-eye${showPin ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>

            <div>
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Confirmer le PIN</label>
              <input
                type={showPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-center text-2xl tracking-widest"
              />
            </div>

            <div className="bg-moni-bg rounded-2xl p-4">
              <p className="text-moni-gray text-xs mb-2">Conseils de sécurité</p>
              <ul className="text-moni-gray text-xs space-y-1">
                <li>• Utilisez un PIN unique et facile à retenir</li>
                <li>• Ne partagez jamais votre PIN</li>
                <li>• Changez votre PIN régulièrement</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 p-3 bg-white/10 text-moni-white rounded-xl font-semibold hover:bg-white/20 transition-all"
          >
            Annuler
          </button>
          {!pinSet && (
            <button
              onClick={handleSetPin}
              className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
            >
              Définir le PIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState({
    transfers: true,
    requests: true,
    promotions: false,
    security: true
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    localStorage.setItem('moni_notifications', JSON.stringify({
      ...notifications,
      [key]: !notifications[key]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Notifications</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { key: 'transfers', label: 'Transferts reçus', icon: 'fas fa-arrow-down' },
            { key: 'requests', label: 'Demandes de paiement', icon: 'fas fa-hand-holding-heart' },
            { key: 'security', label: 'Alertes de sécurité', icon: 'fas fa-shield-alt' },
            { key: 'promotions', label: 'Promotions & Offres', icon: 'fas fa-gift' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleToggle(item.key as keyof typeof notifications)}
              className="w-full flex justify-between items-center p-4 bg-moni-bg rounded-2xl border border-white/10 hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <i className={`${item.icon} text-moni-accent w-5 text-center`}></i>
                <span className="text-moni-white text-sm">{item.label}</span>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all ${notifications[item.key as keyof typeof notifications] ? 'bg-moni-accent' : 'bg-white/10'}`}>
                <div className={`w-5 h-5 rounded-full bg-moni-white transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

interface BiometryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BiometryModal: React.FC<BiometryModalProps> = ({ isOpen, onClose }) => {
  const [biometry, setBiometry] = useState({
    fingerprint: false,
    faceId: false
  });

  const handleToggle = (key: keyof typeof biometry) => {
    setBiometry(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    localStorage.setItem('moni_biometry', JSON.stringify({
      ...biometry,
      [key]: !biometry[key]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Biométrie</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleToggle('fingerprint')}
            className="w-full flex justify-between items-center p-4 bg-moni-bg rounded-2xl border border-white/10 hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-4">
              <i className="fas fa-fingerprint text-moni-accent w-5 text-center"></i>
              <span className="text-moni-white text-sm">Empreinte digitale</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-all ${biometry.fingerprint ? 'bg-moni-accent' : 'bg-white/10'}`}>
              <div className={`w-5 h-5 rounded-full bg-moni-white transition-transform ${biometry.fingerprint ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
            </div>
          </button>

          <button
            onClick={() => handleToggle('faceId')}
            className="w-full flex justify-between items-center p-4 bg-moni-bg rounded-2xl border border-white/10 hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-4">
              <i className="fas fa-face-smile text-moni-accent w-5 text-center"></i>
              <span className="text-moni-white text-sm">Reconnaissance faciale</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-all ${biometry.faceId ? 'bg-moni-accent' : 'bg-white/10'}`}>
              <div className={`w-5 h-5 rounded-full bg-moni-white transition-transform ${biometry.faceId ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
            </div>
          </button>
        </div>

        <div className="bg-moni-bg rounded-2xl p-4 mb-6">
          <p className="text-moni-gray text-xs">La biométrie vous permet de vous authentifier rapidement et en toute sécurité.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState('fr');

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ];

  const handleSelectLanguage = (code: string) => {
    setLanguage(code);
    localStorage.setItem('moni_language', code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Langue</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${
                language === lang.code
                  ? 'bg-moni-accent/20 border-moni-accent'
                  : 'bg-moni-bg border-white/10 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{lang.flag}</span>
                <span className={`text-sm font-semibold ${language === lang.code ? 'text-moni-accent' : 'text-moni-white'}`}>
                  {lang.name}
                </span>
              </div>
              {language === lang.code && <i className="fas fa-check text-moni-accent"></i>}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Aide & Support</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <button className="w-full flex justify-between items-center p-4 bg-moni-bg rounded-2xl border border-white/10 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-4 text-moni-white">
              <i className="fas fa-question-circle text-moni-accent w-5 text-center"></i>
              <span className="text-sm">FAQ</span>
            </div>
            <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
          </button>

          <button className="w-full flex justify-between items-center p-4 bg-moni-bg rounded-2xl border border-white/10 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-4 text-moni-white">
              <i className="fas fa-envelope text-moni-accent w-5 text-center"></i>
              <span className="text-sm">Nous contacter</span>
            </div>
            <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
          </button>

          <button className="w-full flex justify-between items-center p-4 bg-moni-bg rounded-2xl border border-white/10 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-4 text-moni-white">
              <i className="fas fa-bug text-moni-accent w-5 text-center"></i>
              <span className="text-sm">Signaler un problème</span>
            </div>
            <i className="fas fa-chevron-right text-moni-gray text-xs"></i>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Conditions Générales</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="space-y-4 mb-6 text-moni-gray text-xs">
          <div>
            <h3 className="text-moni-white font-semibold mb-2">1. Acceptation des conditions</h3>
            <p>En utilisant Moni.io, vous acceptez ces conditions générales et notre politique de confidentialité.</p>
          </div>

          <div>
            <h3 className="text-moni-white font-semibold mb-2">2. Utilisation du service</h3>
            <p>Vous vous engagez à utiliser Moni.io uniquement à des fins légales et conformément à toutes les lois applicables.</p>
          </div>

          <div>
            <h3 className="text-moni-white font-semibold mb-2">3. Responsabilité</h3>
            <p>Moni.io n'est pas responsable des pertes ou dommages résultant de l'utilisation du service.</p>
          </div>

          <div>
            <h3 className="text-moni-white font-semibold mb-2">4. Modifications</h3>
            <p>Nous nous réservons le droit de modifier ces conditions à tout moment.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
