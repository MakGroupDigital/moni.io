import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { CURRENCY_SYMBOLS, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { parsePaymentLink } from '../lib/paymentLinks';
import { performTransfer } from '../lib/transactionUtils';
import Login from './Login';
import PinConfirmModal from '../components/PinConfirmModal';

interface PaymentLinkProps {
  onComplete: () => void;
}

interface RecipientInfo {
  uid?: string;
  displayName: string;
  moniNumber: string;
  photoURL?: string;
}

const normalizeCurrency = (value?: string): Currency => {
  return ['USD', 'EUR', 'CDF', 'XOF', 'FCFA'].includes(String(value)) ? (String(value) as Currency) : 'USD';
};

const PaymentLink: React.FC<PaymentLinkProps> = ({ onComplete }) => {
  const { user, loading } = useAuth();
  const payload = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return parsePaymentLink(window.location.pathname, window.location.search);
  }, []);
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);
  const [amount, setAmount] = useState(payload?.amount ? String(payload.amount) : '');
  const [error, setError] = useState('');
  const [isFetchingRecipient, setIsFetchingRecipient] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const currency = normalizeCurrency(payload?.currency || user?.preferredCurrency || user?.currency);
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const amountValue = parseFloat(amount || '0');
  const fixedAmount = Boolean(payload?.amount);

  useEffect(() => {
    let active = true;

    const loadRecipient = async () => {
      if (!payload?.recipientMoniNumber) {
        setError('Lien de paiement invalide.');
        setIsFetchingRecipient(false);
        return;
      }

      setIsFetchingRecipient(true);

      try {
        const recipientQuery = query(
          collection(db, 'users'),
          where('moniNumber', '==', payload.recipientMoniNumber)
        );
        const snapshot = await getDocs(recipientQuery);

        if (!active) return;

        if (snapshot.empty) {
          setRecipient({
            displayName: 'Bénéficiaire Moni',
            moniNumber: payload.recipientMoniNumber,
          });
          setError('');
          return;
        }

        const recipientDoc = snapshot.docs[0];
        const data = recipientDoc.data();
        setRecipient({
          uid: recipientDoc.id,
          displayName: data.displayName || 'Bénéficiaire Moni',
          moniNumber: data.moniNumber || payload.recipientMoniNumber,
          photoURL: data.photoURL || undefined,
        });
        setError('');
      } catch (err) {
        console.warn('Payment link recipient lookup failed:', err);
        if (active) {
          setRecipient({
            displayName: 'Bénéficiaire Moni',
            moniNumber: payload.recipientMoniNumber,
          });
        }
      } finally {
        if (active) {
          setIsFetchingRecipient(false);
        }
      }
    };

    loadRecipient();

    return () => {
      active = false;
    };
  }, [payload?.recipientMoniNumber]);

  const startPayment = () => {
    setError('');

    if (!payload?.recipientMoniNumber || !recipient) {
      setError('Lien de paiement invalide.');
      return;
    }

    if (!user?.uid) {
      setError('Connectez-vous pour payer ce lien Moni.');
      return;
    }

    if (user.moniNumber === payload.recipientMoniNumber) {
      setError('Vous ne pouvez pas payer votre propre lien.');
      return;
    }

    if (!amountValue || amountValue <= 0) {
      setError('Veuillez saisir un montant valide.');
      return;
    }

    if (amountValue > (user.balance || 0)) {
      setError('Solde insuffisant.');
      return;
    }

    setShowPinConfirm(true);
  };

  const executePayment = async () => {
    if (!user?.uid || !payload?.recipientMoniNumber || !recipient) return;

    setShowPinConfirm(false);
    setIsProcessing(true);
    setError('');

    try {
      await performTransfer(
        user.uid,
        payload.recipientMoniNumber,
        amountValue,
        'send',
        {
          title: 'Paiement lien',
          description: `À ${recipient.displayName}`,
          icon: 'fas fa-link',
          color: '#00F5D4',
          recipientName: recipient.displayName,
          recipientMoniNumber: payload.recipientMoniNumber,
          senderName: user.displayName || 'Utilisateur',
          senderMoniNumber: user.moniNumber,
          message: payload.note || undefined,
          reference: `PAYLINK-${Date.now()}`,
          metadata: {
            paymentChannel: 'payment-link',
            fixedAmount,
            paymentCurrency: currency,
            paymentPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
          },
        }
      );

      setPaymentDone(true);
    } catch (err: any) {
      console.error('Payment link error:', err);
      setError(err?.message || 'Paiement impossible. Veuillez réessayer.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!payload?.recipientMoniNumber) {
    return (
      <div className="min-h-screen bg-moni-dark flex items-center justify-center p-5">
        <div className="bg-moni-card rounded-3xl p-6 max-w-sm w-full border border-white/10 text-center">
          <h1 className="text-moni-white text-xl font-bold mb-2">Lien invalide</h1>
          <p className="text-moni-gray text-xs mb-5">Ce lien de paiement Moni ne contient pas de bénéficiaire valide.</p>
          <button onClick={onComplete} className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-bold" type="button">
            Retour à Moni
          </button>
        </div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-moni-dark flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-full max-w-sm bg-moni-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center gap-3">
            <img src="/onelogo.png" alt="Moni.io" className="w-12 h-12 object-contain" />
            <div>
              <p className="text-moni-accent text-[10px] font-bold uppercase tracking-widest">Paiement Moni</p>
              <h1 className="text-moni-white text-lg font-bold">{recipient?.displayName || 'Bénéficiaire Moni'}</h1>
            </div>
          </div>
          <p className="text-moni-gray text-xs mt-4">
            Connectez-vous à votre portefeuille Moni pour payer ce lien.
          </p>
        </div>
        <Login onLoginSuccess={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-moni-dark to-moni-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-moni-card rounded-[32px] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/onelogo.png" alt="Moni.io" className="w-11 h-11 object-contain" />
            <div className="min-w-0">
              <p className="text-moni-accent text-[10px] font-bold uppercase tracking-widest">Paiement sécurisé</p>
              <h1 className="text-moni-white font-bold text-lg truncate">Payer avec Moni</h1>
            </div>
          </div>
          <button onClick={onComplete} className="w-9 h-9 rounded-full bg-white/10 text-moni-white" type="button" aria-label="Fermer">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6">
          {isFetchingRecipient ? (
            <div className="py-16 text-center">
              <i className="fas fa-spinner text-moni-accent text-3xl animate-spin mb-4"></i>
              <p className="text-moni-gray text-xs">Chargement du bénéficiaire...</p>
            </div>
          ) : paymentDone ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center text-moni-accent mx-auto mb-4">
                <i className="fas fa-check text-2xl"></i>
              </div>
              <h2 className="text-moni-white text-xl font-bold mb-2">Paiement envoyé</h2>
              <p className="text-moni-gray text-xs mb-5">{symbol}{amountValue.toFixed(2)} payés à {recipient?.displayName}.</p>
              <button onClick={onComplete} className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-bold" type="button">
                Retour au portefeuille
              </button>
            </div>
          ) : (
            <>
              <div className="bg-moni-bg rounded-2xl p-4 border border-white/10 mb-5">
                <p className="text-moni-gray text-xs mb-3">Bénéficiaire</p>
                <div className="flex items-center gap-3">
                  <img
                    src={recipient?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(recipient?.displayName || 'Moni')}&background=00F5D4&color=050A10&bold=true`}
                    alt={recipient?.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <h2 className="text-moni-white font-semibold text-sm truncate">{recipient?.displayName}</h2>
                    <p className="text-moni-gray text-xs font-mono">{payload.recipientMoniNumber}</p>
                  </div>
                </div>
                {payload.note && (
                  <p className="text-moni-accent text-xs mt-3">Référence: {payload.note}</p>
                )}
              </div>

              <div className="mb-5">
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-moni-white text-lg">{symbol}</span>
                  <input
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setError('');
                    }}
                    disabled={fixedAmount}
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full bg-moni-bg border border-white/10 rounded-xl pl-10 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg disabled:opacity-80"
                  />
                </div>
                {fixedAmount ? (
                  <p className="text-moni-gray text-xs mt-2">Montant défini par le bénéficiaire.</p>
                ) : (
                  <p className="text-moni-gray text-xs mt-2">Saisissez le montant à payer.</p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                  <p className="text-red-200 text-xs">{error}</p>
                </div>
              )}

              <button
                onClick={startPayment}
                disabled={isProcessing || loading}
                className="w-full bg-moni-accent text-moni-bg py-4 rounded-2xl font-bold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
                type="button"
              >
                {isProcessing ? 'Paiement...' : 'Payer maintenant'}
              </button>

              <p className="text-moni-gray text-[10px] text-center mt-4">
                Le payeur est débité et le bénéficiaire est crédité après confirmation PIN.
              </p>
            </>
          )}
        </div>
      </div>

      <PinConfirmModal
        isOpen={showPinConfirm}
        onClose={() => setShowPinConfirm(false)}
        onConfirmed={executePayment}
        title="Confirmer le paiement"
        description={recipient ? `Paiement à ${recipient.displayName}` : 'Paiement lien Moni'}
        amountLabel={amountValue ? `${symbol}${amountValue.toFixed(2)}` : undefined}
        confirmLabel="Payer"
      />
    </div>
  );
};

export default PaymentLink;
