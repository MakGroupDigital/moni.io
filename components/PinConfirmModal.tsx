import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPinState, isValidPin, setTransactionPin, verifyTransactionPin } from '../lib/pinUtils';

interface PinConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => Promise<void> | void;
  title?: string;
  description?: string;
  amountLabel?: string;
  confirmLabel?: string;
}

type PinMode = 'loading' | 'create' | 'verify';

const PinConfirmModal: React.FC<PinConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmed,
  title = 'Confirmer avec votre PIN',
  description = 'Cette opération va débiter votre portefeuille Moni.',
  amountLabel,
  confirmLabel = 'Confirmer'
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<PinMode>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPinState = async () => {
      if (!isOpen) return;

      setMode('loading');
      setPin('');
      setConfirmPin('');
      setError('');

      if (!user?.uid) {
        setError('Utilisateur non authentifié.');
        setMode('verify');
        return;
      }

      try {
        const pinState = await getUserPinState(user.uid);
        if (active) {
          setMode(pinState.exists ? 'verify' : 'create');
        }
      } catch (err) {
        console.error('PIN state error:', err);
        if (active) {
          setError('Impossible de vérifier le PIN pour le moment.');
          setMode('verify');
        }
      }
    };

    loadPinState();

    return () => {
      active = false;
    };
  }, [isOpen, user?.uid]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError('');

    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return;
    }

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

      await onConfirmed();
      setPin('');
      setConfirmPin('');
    } catch (err: any) {
      console.error('PIN confirmation error:', err);
      setError(err?.message || 'Confirmation impossible. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-[80] rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[88%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-moni-white font-montserrat">
              {mode === 'create' ? 'Définir votre PIN Moni' : title}
            </h2>
            <p className="text-moni-gray text-xs mt-1">
              {mode === 'create' ? 'Ce PIN servira à valider vos paiements.' : description}
            </p>
          </div>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white" type="button">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {amountLabel && (
          <div className="bg-moni-bg rounded-2xl p-4 mb-5 border border-white/10">
            <p className="text-moni-gray text-xs mb-1">Montant</p>
            <p className="text-moni-accent text-2xl font-bold">{amountLabel}</p>
          </div>
        )}

        {mode === 'loading' ? (
          <div className="py-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-moni-accent/20 flex items-center justify-center mb-3">
              <i className="fas fa-spinner text-moni-accent animate-spin"></i>
            </div>
            <p className="text-moni-gray text-xs">Vérification...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-moni-gray text-xs font-semibold mb-2 block">
                {mode === 'create' ? 'Nouveau PIN' : 'PIN Moni'}
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
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
                type="button"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all disabled:opacity-50"
                type="button"
              >
                {isSubmitting ? 'Validation...' : mode === 'create' ? 'Définir' : confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinConfirmModal;
