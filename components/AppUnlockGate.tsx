import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPinState, isValidPin, setTransactionPin, verifyTransactionPin } from '../lib/pinUtils';
import { authenticateWithBiometric, getBiometricAuthState } from '../lib/biometricAuth';

interface AppUnlockGateProps {
  children: React.ReactNode;
}

type UnlockMode = 'loading' | 'create' | 'verify';

const LOCK_AFTER_BACKGROUND_MS = 0;

const AppUnlockGate: React.FC<AppUnlockGateProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState<UnlockMode>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const hiddenAtRef = useRef<number | null>(null);
  const biometricPromptActiveRef = useRef(false);

  const loadSecurityState = useCallback(async () => {
    if (!user?.uid) return;

    setUnlocked(false);
    setMode('loading');
    setPin('');
    setConfirmPin('');
    setError('');

    try {
      const [pinState, biometricState] = await Promise.all([
        getUserPinState(user.uid),
        getBiometricAuthState(user.uid),
      ]);

      setMode(pinState.exists ? 'verify' : 'create');
      setBiometricAvailable(biometricState.available);
      setBiometricEnabled(Boolean(biometricState.available && biometricState.enabled));
    } catch (err) {
      console.error('App lock state error:', err);
      setMode('verify');
      setBiometricAvailable(false);
      setBiometricEnabled(false);
      setError('Impossible de charger la sécurité du compte.');
    }
  }, [user?.uid]);

  useEffect(() => {
    loadSecurityState();
  }, [loadSecurityState]);

  useEffect(() => {
    if (!user?.uid) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (
        unlocked &&
        hiddenAtRef.current &&
        Date.now() - hiddenAtRef.current >= LOCK_AFTER_BACKGROUND_MS &&
        !biometricPromptActiveRef.current
      ) {
        loadSecurityState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadSecurityState, unlocked, user?.uid]);

  if (!user) return <>{children}</>;
  if (unlocked) return <>{children}</>;

  const handlePinSubmit = async () => {
    if (!user?.uid) return;

    setError('');

    if (!isValidPin(pin)) {
      setError('Le PIN doit contenir 4 à 6 chiffres.');
      return;
    }

    if (mode === 'create' && pin !== confirmPin) {
      setError('Les PINs ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await setTransactionPin(user.uid, pin);
      } else {
        const verified = await verifyTransactionPin(user.uid, pin);
        if (!verified) {
          setError('PIN incorrect.');
          setIsSubmitting(false);
          return;
        }
      }

      setPin('');
      setConfirmPin('');
      setUnlocked(true);
    } catch (err: any) {
      console.error('App unlock PIN error:', err);
      setError(err?.message || 'Déverrouillage impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!user?.uid) return;

    setError('');
    setIsBiometricLoading(true);
    biometricPromptActiveRef.current = true;

    try {
      await authenticateWithBiometric(user.uid);
      setUnlocked(true);
    } catch (err: any) {
      console.error('App biometric unlock error:', err);
      setError(err?.message || 'Authentification biométrique impossible.');
    } finally {
      biometricPromptActiveRef.current = false;
      setIsBiometricLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('App lock logout error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-moni-bg flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-20 flex items-center justify-center mb-4">
            <img src="/moni-logo-transparent.png" alt="Moni.io" className="h-16 w-auto object-contain" />
          </div>
          <p className="text-moni-accent text-[10px] font-bold uppercase tracking-widest mb-2">Accès sécurisé</p>
          <h1 className="text-moni-white text-2xl font-bold font-montserrat">
            {mode === 'create' ? 'Définir votre PIN' : 'Déverrouiller Moni'}
          </h1>
          <p className="text-moni-gray text-xs mt-2">
            {mode === 'create'
              ? 'Créez un PIN obligatoire pour protéger chaque ouverture de l’app.'
              : 'Confirmez votre identité pour accéder au portefeuille.'}
          </p>
        </div>

        <div className="bg-moni-card rounded-3xl p-5 border border-white/10 shadow-2xl">
          {mode === 'loading' ? (
            <div className="py-12 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-moni-accent/20 flex items-center justify-center mb-3">
                <i className="fas fa-spinner text-moni-accent animate-spin"></i>
              </div>
              <p className="text-moni-gray text-xs">Vérification de la sécurité...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mode === 'verify' && biometricEnabled && (
                <button
                  onClick={handleBiometricUnlock}
                  disabled={isBiometricLoading}
                  className="w-full bg-moni-accent text-moni-bg rounded-2xl py-4 font-bold flex items-center justify-center gap-3 disabled:opacity-60"
                  type="button"
                >
                  <i className={`fas ${isBiometricLoading ? 'fa-spinner animate-spin' : 'fa-fingerprint'} text-lg`}></i>
                  {isBiometricLoading ? 'Authentification...' : 'Utiliser la biométrie'}
                </button>
              )}

              {mode === 'verify' && biometricAvailable && !biometricEnabled && (
                <div className="bg-moni-bg rounded-2xl p-3 border border-white/10">
                  <p className="text-moni-gray text-xs">
                    La biométrie est disponible. Activez-la dans Paramètres après déverrouillage.
                  </p>
                </div>
              )}

              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">
                  {mode === 'create' ? 'Nouveau PIN Moni' : 'PIN Moni'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(event) => {
                      setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    placeholder="••••"
                    inputMode="numeric"
                    className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-center text-2xl tracking-widest"
                    autoFocus
                  />
                  <button
                    onClick={() => setShowPin((value) => !value)}
                    className="absolute right-4 top-3 text-moni-gray hover:text-moni-white"
                    type="button"
                  >
                    <i className={`fas fa-eye${showPin ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>

              {mode === 'create' && (
                <div>
                  <label className="text-moni-gray text-xs font-semibold mb-2 block">Confirmer le PIN</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(event) => {
                      setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    placeholder="••••"
                    inputMode="numeric"
                    className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-center text-2xl tracking-widest"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/60 rounded-xl p-3">
                  <p className="text-red-100 text-xs">{error}</p>
                </div>
              )}

              <button
                onClick={handlePinSubmit}
                disabled={isSubmitting}
                className="w-full bg-white/10 text-moni-white rounded-2xl py-4 font-bold hover:bg-white/15 disabled:opacity-60"
                type="button"
              >
                {isSubmitting ? 'Validation...' : mode === 'create' ? 'Créer et entrer' : 'Entrer avec le PIN'}
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-moni-gray text-xs py-2 hover:text-moni-white"
                type="button"
              >
                Se connecter avec un autre compte
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppUnlockGate;
