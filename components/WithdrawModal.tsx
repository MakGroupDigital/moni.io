import React, { useEffect, useState } from 'react';
import { CURRENCY_SYMBOLS } from '../types';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { performTransfer } from '../lib/transactionUtils';
import PinConfirmModal from './PinConfirmModal';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawSuccess?: () => void;
}

type WithdrawMethod = 'moni-wallet' | 'paypal' | null;
type WithdrawStep = 'method' | 'form' | 'processing' | 'success';

const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onWithdrawSuccess }) => {
  const { user, firebaseUser } = useAuth();
  const { currency } = useCurrency();
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const paypalEmail = (user as any)?.paypalEmail || '';
  const [method, setMethod] = useState<WithdrawMethod>(null);
  const [amount, setAmount] = useState('');
  const [destinationEmail, setDestinationEmail] = useState(paypalEmail);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<WithdrawStep>('method');

  useEffect(() => {
    if (paypalEmail && !destinationEmail) {
      setDestinationEmail(paypalEmail);
    }
  }, [destinationEmail, paypalEmail]);

  const reset = () => {
    setMethod(null);
    setAmount('');
    setDestinationEmail(paypalEmail);
    setError('');
    setStep('method');
    setIsProcessing(false);
    setShowPinConfirm(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const selectedAmount = parseFloat(amount || '0');

  const validateWithdraw = () => {
    setError('');

    if (!method) {
      setError('Veuillez choisir une option de retrait.');
      return false;
    }

    if (!amount || selectedAmount <= 0) {
      setError('Montant invalide.');
      return false;
    }

    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return false;
    }

    if (selectedAmount > (user.balance || 0)) {
      setError('Solde insuffisant.');
      return false;
    }

    if (method === 'paypal' && !destinationEmail.trim()) {
      setError('Veuillez renseigner le compte PayPal.');
      return false;
    }

    return true;
  };

  const handleWithdraw = () => {
    if (validateWithdraw()) {
      setShowPinConfirm(true);
    }
  };

  const executeWithdraw = async () => {
    if (!user?.uid || !method) return;

    setShowPinConfirm(false);
    setIsProcessing(true);
    setStep('processing');

    try {
      if (method === 'paypal') {
        if (!firebaseUser) {
          throw new Error('Utilisateur non authentifié.');
        }

        const token = await firebaseUser.getIdToken();
        const response = await fetch('/api/paypal/payout/create', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            amount: selectedAmount,
            currency,
            receiverEmail: destinationEmail,
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          const debugId = payload?.debugId ? ` Debug ID PayPal: ${payload.debugId}.` : '';
          const paypalName = payload?.paypalErrorName ? ` (${payload.paypalErrorName})` : '';
          throw new Error(`${payload?.error || `Erreur PayPal ${response.status}`}${paypalName}.${debugId}`.trim());
        }
      } else {
        await performTransfer(
          user.uid,
          null,
          selectedAmount,
          'withdraw',
          {
            title: 'Retrait portefeuille',
            description: 'Depuis le portefeuille Moni',
            icon: 'fas fa-wallet',
            color: '#EF476F',
            reference: `WTH-${Date.now()}`,
            metadata: {
              method,
              currency
            }
          }
        );
      }

      setStep('success');
      setTimeout(() => {
        onWithdrawSuccess?.();
        handleClose();
      }, 1800);
    } catch (err: any) {
      console.error('Withdraw error:', err);
      setError(err?.message || 'Erreur lors du retrait. Veuillez réessayer.');
      setStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const methodCards = [
    {
      id: 'moni-wallet' as const,
      title: 'Mon portefeuille Moni',
      subtitle: 'Retirer depuis votre solde Moni',
      icon: 'fas fa-wallet',
      color: '#00F5D4'
    },
    {
      id: 'paypal' as const,
      title: 'PayPal',
      subtitle: paypalEmail ? paypalEmail : 'Retirer via un compte PayPal',
      icon: 'fab fa-paypal',
      color: '#0070BA'
    }
  ];

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Retrait</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white" type="button">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'method' && (
          <>
            <div className="space-y-3 mb-6">
              {methodCards.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setMethod(item.id);
                    setStep('form');
                    setError('');
                  }}
                  className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
                  type="button"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-lg" style={{ color: item.color }}>
                    <i className={item.icon}></i>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="text-moni-white font-semibold text-sm">{item.title}</h3>
                    <p className="text-moni-gray text-xs truncate">{item.subtitle}</p>
                  </div>
                  <i className="fas fa-chevron-right text-moni-gray"></i>
                </button>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
              type="button"
            >
              Annuler
            </button>
          </>
        )}

        {step === 'form' && method && (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-moni-white text-lg">{symbol}</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setError('');
                    }}
                    placeholder="0.00"
                    className="w-full bg-moni-bg border border-white/10 rounded-xl pl-10 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
                  />
                </div>
                <p className="text-moni-gray text-xs mt-2">
                  Solde disponible: {symbol}{(user?.balance || 0).toFixed(2)}
                </p>
              </div>

              {method === 'paypal' && (
                <div>
                  <label className="text-moni-gray text-xs font-semibold mb-2 block">Compte PayPal</label>
                  <input
                    type="email"
                    value={destinationEmail}
                    onChange={(event) => {
                      setDestinationEmail(event.target.value);
                      setError('');
                    }}
                    placeholder="email@paypal.com"
                    className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('method');
                  setMethod(null);
                  setError('');
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
                type="button"
              >
                Retour
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all disabled:opacity-50"
                type="button"
              >
                Continuer
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Retrait en cours</h3>
            <p className="text-moni-gray text-xs text-center">Veuillez patienter...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Retrait enregistré</h3>
            <p className="text-moni-gray text-xs text-center mb-4">
              {method === 'paypal'
                ? `${symbol}${selectedAmount.toFixed(2)} envoyés vers PayPal.`
                : `${symbol}${selectedAmount.toFixed(2)} débités de votre portefeuille.`}
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
              type="button"
            >
              Fermer
            </button>
          </div>
        )}
      </div>

      <PinConfirmModal
        isOpen={showPinConfirm}
        onClose={() => setShowPinConfirm(false)}
        onConfirmed={executeWithdraw}
        title="Confirmer le retrait"
        description={method === 'paypal' ? 'Cette opération enverra le retrait vers PayPal.' : 'Cette opération débitera votre portefeuille Moni.'}
        amountLabel={amount ? `${symbol}${selectedAmount.toFixed(2)}` : undefined}
        confirmLabel="Retirer"
      />
    </div>
  );
};

export default WithdrawModal;
