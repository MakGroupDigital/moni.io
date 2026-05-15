import React, { useEffect, useState } from 'react';
import { AuthUser } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getUserPinState, isValidPin, setTransactionPin } from '../lib/pinUtils';
import {
  disableBiometricAuthenticator,
  getBiometricAuthState,
  registerBiometricAuthenticator
} from '../lib/biometricAuth';
import { getLegalDocument, legalDocuments, type LegalDocumentId } from '../lib/legalContent';

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
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPin = async () => {
      if (!isOpen || !user?.uid) return;

      setError('');
      setPinSet(false);

      try {
        const pinState = await getUserPinState(user.uid);
        if (active) {
          setHasExistingPin(pinState.exists);
        }
      } catch (err) {
        console.error('Security PIN load error:', err);
        if (active) {
          setError('Impossible de charger l’état du PIN.');
        }
      }
    };

    loadPin();

    return () => {
      active = false;
    };
  }, [isOpen, user?.uid]);

  const handleSetPin = async () => {
    setError('');

    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return;
    }

    if (!isValidPin(pin)) {
      setError('Le PIN doit contenir 4 à 6 chiffres.');
      return;
    }

    if (pin !== confirmPin) {
      setError('Les PINs ne correspondent pas.');
      return;
    }

    setIsSaving(true);

    try {
      await setTransactionPin(user.uid, pin);
      setPinSet(true);
      setHasExistingPin(true);
      setPin('');
      setConfirmPin('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Security PIN save error:', err);
      setError(err?.message || 'Impossible de définir le PIN.');
    } finally {
      setIsSaving(false);
    }
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
            {hasExistingPin && (
              <div className="bg-moni-bg rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <i className="fas fa-lock text-moni-accent"></i>
                  <p className="text-moni-white text-sm">Un PIN est déjà défini. La saisie ci-dessous le remplace.</p>
                </div>
              </div>
            )}

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
                <li>Utilisez un PIN unique et facile à retenir</li>
                <li>Ne partagez jamais votre PIN</li>
                <li>Changez votre PIN régulièrement</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}
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
              disabled={isSaving}
              className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
            >
              {isSaving ? 'Enregistrement...' : 'Définir le PIN'}
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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadBiometry = async () => {
      if (!isOpen || !user?.uid) return;

      setIsLoading(true);
      setMessage('');
      setError('');

      try {
        const state = await getBiometricAuthState(user.uid);
        if (!active) return;

        setAvailable(state.available);
        setEnabled(state.enabled);
        if (!state.available && state.reason) {
          setError(state.reason);
        }
      } catch (err: any) {
        console.error('Biometry load error:', err);
        if (active) {
          setAvailable(false);
          setEnabled(false);
          setError(err?.message || 'Impossible de vérifier la biométrie.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadBiometry();

    return () => {
      active = false;
    };
  }, [isOpen, user?.uid]);

  const handleEnable = async () => {
    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await registerBiometricAuthenticator(user.uid, user.displayName, user.email);
      setEnabled(true);
      setAvailable(true);
      setMessage('Biométrie activée. Le téléphone demandera Face ID, empreinte ou le déverrouillage système selon l’appareil.');
    } catch (err: any) {
      console.error('Biometry enable error:', err);
      setError(err?.message || 'Activation biométrique impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!user?.uid) return;

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await disableBiometricAuthenticator(user.uid);
      setEnabled(false);
      setMessage('Biométrie désactivée. L’accès se fera uniquement par PIN.');
    } catch (err: any) {
      console.error('Biometry disable error:', err);
      setError(err?.message || 'Désactivation biométrique impossible.');
    } finally {
      setIsSaving(false);
    }
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

        <div className="space-y-4 mb-6">
          <div className="bg-moni-bg rounded-2xl p-4 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-moni-accent/15 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-fingerprint text-moni-accent text-lg"></i>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-moni-white text-sm font-semibold">Authentification système</p>
                <p className="text-moni-gray text-xs mt-1">
                  Moni utilise la biométrie réelle du téléphone via WebAuthn. Selon l’appareil, le système affiche Face ID, empreinte ou le déverrouillage local.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-400' : available ? 'bg-moni-accent' : 'bg-red-400'}`}></span>
                  <span className="text-moni-gray text-xs">
                    {isLoading ? 'Vérification...' : enabled ? 'Activée' : available ? 'Disponible' : 'Non disponible'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="bg-green-500/15 border border-green-500/50 rounded-xl p-3">
              <p className="text-green-100 text-xs">{message}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/60 rounded-xl p-3">
              <p className="text-red-100 text-xs">{error}</p>
            </div>
          )}

          {enabled ? (
            <button
              onClick={handleDisable}
              disabled={isSaving}
              className="w-full p-3 bg-white/10 text-moni-white rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Traitement...' : 'Désactiver'}
            </button>
          ) : (
            <button
              onClick={handleEnable}
              disabled={!available || isSaving || isLoading}
              className="w-full p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Activation...' : 'Activer la biométrie'}
            </button>
          )}

          <div className="bg-moni-bg rounded-2xl p-4">
            <p className="text-moni-gray text-xs">
              Le PIN reste obligatoire comme méthode de secours et sera demandé si la biométrie n’est pas disponible.
            </p>
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
  initialDocumentId?: LegalDocumentId;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, initialDocumentId = 'terms' }) => {
  const [activeDocumentId, setActiveDocumentId] = useState<LegalDocumentId>(initialDocumentId);

  useEffect(() => {
    if (isOpen) {
      setActiveDocumentId(initialDocumentId);
    }
  }, [initialDocumentId, isOpen]);

  if (!isOpen) return null;

  const activeDocument = getLegalDocument(activeDocumentId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-5">
          <div>
            <p className="text-moni-accent text-[10px] font-bold uppercase tracking-widest mb-1">Documents légaux</p>
            <h2 className="text-xl font-bold text-moni-white font-montserrat">{activeDocument.title}</h2>
            <p className="text-moni-gray text-xs mt-1">Mis à jour le {activeDocument.lastUpdated}</p>
          </div>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {legalDocuments.map((document) => (
            <button
              key={document.id}
              onClick={() => setActiveDocumentId(document.id)}
              className={`px-3 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all ${
                activeDocumentId === document.id
                  ? 'bg-moni-accent text-moni-bg border-moni-accent'
                  : 'bg-moni-bg text-moni-gray border-white/10'
              }`}
              type="button"
            >
              {document.shortTitle}
            </button>
          ))}
        </div>

        <div className="bg-moni-bg rounded-2xl p-4 mb-5 border border-white/10">
          <p className="text-moni-white text-sm font-semibold mb-2">{activeDocument.summary}</p>
          <p className="text-moni-gray text-xs">
            Moni.io est un produit et une marque déposée de MboMa & Co. Site institutionnel: mboma.org.
            Ces textes doivent être validés par le conseil juridique de la société avant publication définitive.
          </p>
          <a
            href={activeDocument.publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-moni-accent text-xs font-semibold mt-3"
          >
            Ouvrir la page publique
            <i className="fas fa-arrow-up-right-from-square text-[10px]"></i>
          </a>
        </div>

        <div className="space-y-5 mb-6 text-moni-gray text-xs leading-relaxed">
          {activeDocument.sections.map((section, index) => (
            <section key={`${activeDocument.id}-${section.title}`} className="bg-moni-bg/70 rounded-2xl p-4 border border-white/10">
              <h3 className="text-moni-white font-semibold mb-3">
                {index + 1}. {section.title}
              </h3>
              <div className="space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.items && (
                <ul className="mt-3 space-y-2 list-disc list-inside text-moni-gray">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="bg-moni-accent/10 border border-moni-accent/30 rounded-2xl p-4">
            <p className="text-moni-accent font-semibold mb-2">Note importante</p>
            <p>
              Ce document constitue une base opérationnelle pour Moni.io. Il ne remplace pas une validation juridique locale,
              notamment pour les obligations liées aux services de paiement, à la protection des données, aux cookies,
              à la conformité financière et aux règles applicables dans chaque pays desservi.
            </p>
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
