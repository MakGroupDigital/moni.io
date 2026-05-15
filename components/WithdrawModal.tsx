import React, { useEffect, useState } from 'react';
import { CURRENCY_SYMBOLS, Currency } from '../types';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import PinConfirmModal from './PinConfirmModal';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawSuccess?: () => void;
}

type WithdrawMethod = 'moni-wallet' | 'paypal' | null;
type WithdrawStep = 'method' | 'form' | 'processing' | 'success';

const MOBILE_MONEY_OPERATORS = [
  { id: 'mpesa', name: 'M-Pesa', color: '#00AA00' },
  { id: 'airtel', name: 'Airtel Money', color: '#E60000' },
  { id: 'orange', name: 'Orange Money', color: '#FF6600' },
  { id: 'africell', name: 'Africell Money', color: '#0066CC' },
] as const;

type MobileMoneyOperatorId = typeof MOBILE_MONEY_OPERATORS[number]['id'];

const DRC_OPERATOR_PREFIXES: Record<MobileMoneyOperatorId, string[]> = {
  mpesa: ['81', '82', '83', '86'],
  airtel: ['97', '98', '99'],
  orange: ['80', '84', '85', '89'],
  africell: ['90', '91'],
};

const getCongoleseNationalDigits = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('243')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
};

const detectOperatorFromPhone = (value: string): MobileMoneyOperatorId | '' => {
  const nationalDigits = getCongoleseNationalDigits(value);
  if (nationalDigits.length < 2) return '';

  const prefix = nationalDigits.slice(0, 2);
  const match = MOBILE_MONEY_OPERATORS.find((operator) => DRC_OPERATOR_PREFIXES[operator.id].includes(prefix));
  return match?.id || '';
};

const roundForCurrency = (value: number, currency: Currency) => {
  if (currency === 'CDF' || currency === 'XOF' || currency === 'FCFA') return Math.round(value);
  return Math.round(value * 100) / 100;
};

const getWithdrawalFee = (value: number, currency: Currency) => {
  const minimum = currency === 'CDF' ? 1000 : 1;
  const onePercentLimit = currency === 'CDF' ? 100000 : 100;
  const feeRate = value >= minimum && value <= onePercentLimit ? 0.01 : 0.02;
  const feeAmount = value > 0 ? roundForCurrency(value * feeRate, currency) : 0;
  const totalDebit = value > 0 ? roundForCurrency(value + feeAmount, currency) : 0;

  return { minimum, onePercentLimit, feeRate, feeAmount, totalDebit };
};

const formatMoney = (value: number, currency: Currency, symbol: string) => {
  const decimals = currency === 'CDF' || currency === 'XOF' || currency === 'FCFA' ? 0 : 2;
  return `${symbol}${Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onWithdrawSuccess }) => {
  const { user, firebaseUser } = useAuth();
  const { currency } = useCurrency();
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const paypalEmail = (user as any)?.paypalEmail || '';
  const [method, setMethod] = useState<WithdrawMethod>(null);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<MobileMoneyOperatorId | ''>('');
  const [destinationEmail, setDestinationEmail] = useState(paypalEmail);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<WithdrawStep>('method');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (paypalEmail && !destinationEmail) {
      setDestinationEmail(paypalEmail);
    }
  }, [destinationEmail, paypalEmail]);

  const reset = () => {
    setMethod(null);
    setAmount('');
    setPhoneNumber('');
    setSelectedOperator('');
    setDestinationEmail(paypalEmail);
    setError('');
    setStep('method');
    setIsProcessing(false);
    setShowPinConfirm(false);
    setSuccessMessage('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const selectedAmount = parseFloat(amount || '0');
  const withdrawalFee = getWithdrawalFee(selectedAmount, currency);
  const detectedOperator = detectOperatorFromPhone(phoneNumber);
  const selectedOperatorDetails = MOBILE_MONEY_OPERATORS.find((operator) => operator.id === selectedOperator);
  const formattedAmount = formatMoney(selectedAmount, currency, symbol);
  const formattedFee = formatMoney(withdrawalFee.feeAmount, currency, symbol);
  const formattedTotalDebit = formatMoney(withdrawalFee.totalDebit, currency, symbol);

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    setError('');

    const operator = detectOperatorFromPhone(value);
    const nationalDigits = getCongoleseNationalDigits(value);

    if (operator) {
      setSelectedOperator(operator);
    } else if (nationalDigits.length >= 2) {
      setSelectedOperator('');
    }
  };

  const postJson = async (url: string, token: string, payload: Record<string, any>) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text().catch(() => '');
    const normalizedText = rawText.replace(/\s+/g, ' ').trim();
    let data: any = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!response.ok || data?.success === false) {
      throw new Error(data?.error || data?.message || normalizedText || `Erreur serveur retrait (${response.status}).`);
    }

    if (!data) {
      throw new Error('Réponse retrait invalide.');
    }

    return data;
  };

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

    if (method === 'paypal' && !destinationEmail.trim()) {
      setError('Veuillez renseigner le compte PayPal.');
      return false;
    }

    if (method === 'moni-wallet') {
      if (!['USD', 'EUR', 'CDF'].includes(currency)) {
        setError('Cette devise n’est pas prise en charge pour le retrait Mobile Money.');
        return false;
      }

      if (selectedAmount < withdrawalFee.minimum) {
        setError(`Montant minimum: ${withdrawalFee.minimum} ${currency}.`);
        return false;
      }

      if (!phoneNumber.trim() || getCongoleseNationalDigits(phoneNumber).length < 9) {
        setError('Veuillez renseigner le numéro Mobile Money.');
        return false;
      }

      if (!selectedOperator) {
        setError('Veuillez choisir l’opérateur Mobile Money.');
        return false;
      }

      if (withdrawalFee.totalDebit > (user.balance || 0)) {
        setError('Solde insuffisant frais inclus.');
        return false;
      }
    }

    if (method === 'paypal' && selectedAmount > (user.balance || 0)) {
      setError('Solde insuffisant.');
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
      if (!firebaseUser) {
        throw new Error('Utilisateur non authentifié.');
      }

      const token = await firebaseUser.getIdToken();

      if (method === 'paypal') {
        const payload = await postJson('/api/paypal/payout/create', token, {
          amount: selectedAmount,
          currency,
          receiverEmail: destinationEmail,
        });

        setSuccessMessage(payload?.message || `Demande PayPal enregistrée pour ${formattedAmount}.`);
      } else {
        const payload = await postJson('/api/maxicash/withdraw/mobile-money', token, {
          amount: selectedAmount,
          currency,
          phoneNumber,
          operator: selectedOperator,
        });

        setSuccessMessage(
          `${formatMoney(payload.withdrawnAmount || selectedAmount, currency, symbol)} envoyés vers ${payload.operatorLabel || selectedOperatorDetails?.name || 'Mobile Money'}. Frais: ${formatMoney(payload.feeAmount || withdrawalFee.feeAmount, currency, symbol)}.`
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
      subtitle: 'Vers Mobile Money instantanément',
      icon: 'fas fa-mobile-alt',
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

              {method === 'moni-wallet' && (
                <>
                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro Mobile Money</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) => handlePhoneNumberChange(event.target.value)}
                      placeholder="+243 8X XXX XXXX"
                      className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                    />
                    {detectedOperator && (
                      <p className="text-moni-accent text-xs mt-2">
                        {MOBILE_MONEY_OPERATORS.find((operator) => operator.id === detectedOperator)?.name} détecté
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Opérateur</label>
                    <select
                      value={selectedOperator}
                      onChange={(event) => {
                        setSelectedOperator(event.target.value as MobileMoneyOperatorId);
                        setError('');
                      }}
                      className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white focus:outline-none focus:border-moni-accent"
                    >
                      <option value="">Choisir l’opérateur</option>
                      {MOBILE_MONEY_OPERATORS.map((operator) => (
                        <option key={operator.id} value={operator.id}>
                          {operator.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedAmount > 0 && (
                    <div className="bg-moni-bg border border-white/10 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-moni-gray">Montant reçu</span>
                        <span className="text-moni-white font-semibold">{formattedAmount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-moni-gray">Frais Moni ({Math.round(withdrawalFee.feeRate * 100)}%)</span>
                        <span className="text-moni-white font-semibold">{formattedFee}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                        <span className="text-moni-white font-semibold">Débit total</span>
                        <span className="text-moni-accent font-bold">{formattedTotalDebit}</span>
                      </div>
                    </div>
                  )}
                </>
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
              {successMessage ||
                (method === 'paypal'
                  ? `${formattedAmount} enregistrés vers PayPal.`
                  : `${formattedAmount} envoyés vers Mobile Money.`)}
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
        description={
          method === 'paypal'
            ? 'Cette demande PayPal sera traitée manuellement.'
            : `Envoi vers ${selectedOperatorDetails?.name || 'Mobile Money'} avec frais Moni inclus.`
        }
        amountLabel={amount ? (method === 'moni-wallet' ? formattedTotalDebit : formattedAmount) : undefined}
        confirmLabel="Retirer"
      />
    </div>
  );
};

export default WithdrawModal;
