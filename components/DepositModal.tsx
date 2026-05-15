import React, { useState } from 'react';
import AgentQRScanner from './AgentQRScanner';
import { useAuth } from '../contexts/AuthContext';
import { performTransfer } from '../lib/transactionUtils';
import { useCurrency } from '../App';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositSuccess?: () => void;
}

type DepositMethod = 'mobile-money' | 'moni-agent' | null;
type DepositStep = 'method' | 'form' | 'processing' | 'success' | 'pending';
type PaymentCurrency = 'USD' | 'CDF';

const MAXICASH_OPERATORS = [
  { id: 'mpesa', name: 'M-Pesa', color: '#00AA00' },
  { id: 'airtel', name: 'Airtel Money', color: '#E60000' },
  { id: 'orange', name: 'Orange Money', color: '#FF6600' },
  { id: 'africell', name: 'Africell Money', color: '#0066CC' },
] as const;

type MaxiCashOperatorId = typeof MAXICASH_OPERATORS[number]['id'];

const DRC_OPERATOR_PREFIXES: Record<MaxiCashOperatorId, string[]> = {
  mpesa: ['81', '82', '83', '86'],
  airtel: ['97', '98', '99'],
  orange: ['80', '84', '85', '89'],
  africell: ['90', '91'],
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getCongoleseNationalDigits = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('243')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
};

const detectOperatorFromPhone = (value: string): MaxiCashOperatorId | '' => {
  const nationalDigits = getCongoleseNationalDigits(value);
  if (nationalDigits.length < 2) return '';

  const prefix = nationalDigits.slice(0, 2);
  const match = MAXICASH_OPERATORS.find((operator) => DRC_OPERATOR_PREFIXES[operator.id].includes(prefix));
  return match?.id || '';
};

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onDepositSuccess }) => {
  const { user, firebaseUser } = useAuth();
  const { currency } = useCurrency();
  const [method, setMethod] = useState<DepositMethod>(null);
  const [amount, setAmount] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>('USD');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [processingMessage, setProcessingMessage] = useState('Veuillez patienter...');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState<DepositStep>('method');

  const handleClose = () => {
    setMethod(null);
    setAmount('');
    setSelectedOperator('');
    setPaymentCurrency('USD');
    setPhoneNumber('');
    setAgentPhone('');
    setShowQRScanner(false);
    setError('');
    setProcessingMessage('Veuillez patienter...');
    setSuccessMessage('');
    setStep('method');
    setIsProcessing(false);
    onClose();
  };

  const handleQRScan = (result: string) => {
    setAgentPhone(result);
    setShowQRScanner(false);
  };

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    setError('');

    const detectedOperator = detectOperatorFromPhone(value);
    const nationalDigits = getCongoleseNationalDigits(value);

    if (detectedOperator) {
      setSelectedOperator(detectedOperator);
    } else if (nationalDigits.length >= 2) {
      setSelectedOperator('');
    }
  };

  if (!isOpen) return null;

  if (showQRScanner) {
    return <AgentQRScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />;
  }

  const postJson = async (url: string, token: string, payload: Record<string, any>) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text().catch(() => '');
    const normalizedText = rawText.replace(/\s+/g, ' ').trim();
    let data: any = null;

    if (contentType.includes('application/json') || normalizedText.startsWith('{') || normalizedText.startsWith('[')) {
      try {
        data = JSON.parse(rawText || 'null');
      } catch {
        data = null;
      }
    }

    if (!response.ok || data?.success === false) {
      throw new Error(
        data?.error ||
        data?.message ||
        (normalizedText
          ? `Erreur serveur dépôt (${response.status}): ${normalizedText}`
          : `Erreur serveur dépôt (${response.status}).`)
      );
    }

    if (!data) {
      throw new Error('Réponse dépôt invalide: le serveur n’a pas renvoyé de JSON.');
    }

    return data;
  };

  const pollDepositStatus = async (transactionId: string, token: string) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await sleep(7000);
      const status = await postJson('/api/maxicash/deposit/status', token, { transactionId });

      if (status.transactionStatus === 'completed') {
        return status;
      }

      if (status.transactionStatus === 'failed') {
        throw new Error(status.error || status.message || 'Paiement refusé.');
      }
    }

    return null;
  };

  const detectedOperator = detectOperatorFromPhone(phoneNumber);
  const detectedOperatorDetails = MAXICASH_OPERATORS.find((provider) => provider.id === detectedOperator);
  const phoneDigits = getCongoleseNationalDigits(phoneNumber);

  const handleDeposit = async () => {
    if (!amount || (method === 'mobile-money' && (!selectedOperator || !phoneNumber)) || (method === 'moni-agent' && !agentPhone)) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (!user?.uid) {
      setError('Utilisateur non authentifié');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Montant invalide');
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setError('');
    setProcessingMessage(method === 'mobile-money' ? 'Envoi de la demande de confirmation...' : 'Veuillez patienter...');

    try {
      if (method === 'mobile-money') {
        if (!firebaseUser) {
          throw new Error('Session expirée. Reconnectez-vous et réessayez.');
        }

        const token = await firebaseUser.getIdToken();
        const initiation = await postJson('/api/maxicash/deposit/initiate', token, {
          amount: depositAmount,
          paymentCurrency,
          walletCurrency: currency,
          operator: selectedOperator,
          phoneNumber,
        });

        if (initiation.transactionStatus === 'completed') {
          setSuccessMessage(`${initiation.creditedAmount?.toLocaleString?.() || initiation.creditedAmount} ${initiation.walletCurrency || currency} ajoutés à votre portefeuille.`);
          setStep('success');
          setTimeout(() => {
            onDepositSuccess?.();
            handleClose();
          }, 1800);
          return;
        }

        setProcessingMessage('Confirmez le paiement sur votre téléphone.');
        const completedStatus = await pollDepositStatus(initiation.transactionId, token);

        if (completedStatus?.transactionStatus === 'completed') {
          setSuccessMessage(`${completedStatus.creditedAmount?.toLocaleString?.() || completedStatus.creditedAmount} ${completedStatus.walletCurrency || currency} ajoutés à votre portefeuille.`);
          setStep('success');
          setTimeout(() => {
            onDepositSuccess?.();
            handleClose();
          }, 1800);
          return;
        }

        setStep('pending');
        setProcessingMessage('Le paiement reste en attente. Votre solde sera crédité dès confirmation.');
        return;
      }

      await performTransfer(
        user.uid,
        null,
        depositAmount,
        'deposit',
        {
          title: 'Dépôt',
          description: 'Via agent Moni',
          icon: 'fas fa-arrow-down',
          color: '#00F5D4',
          reference: `DEP-${Date.now()}`,
          metadata: {
            method,
            phoneNumber: agentPhone
          }
        }
      );

      setSuccessMessage(`${depositAmount.toLocaleString()} ${currency} ajoutés à votre compte`);
      setStep('success');
      setTimeout(() => {
        onDepositSuccess?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Deposit error:', err);
      const errorMessage = err?.message || 'Erreur lors du dépôt. Veuillez réessayer.';
      setError(errorMessage);
      setStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Effectuer un dépôt</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'method' && !method ? (
          <>
            {/* Method Selection */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => {
                  setMethod('mobile-money');
                  setError('');
                  setStep('form');
                }}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-mobile-alt text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Mobile Money</h3>
                  <p className="text-moni-gray text-xs">M-Pesa, Airtel, Orange, Africell</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>

              <button
                onClick={() => {
                  setMethod('moni-agent');
                  setError('');
                  setStep('form');
                }}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-user-tie text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Agent Moni</h3>
                  <p className="text-moni-gray text-xs">Retrouver un agent près de vous</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>
            </div>
          </>
        ) : step === 'form' && method === 'mobile-money' ? (
          <>
            {/* Mobile Money Deposit */}
            <div className="space-y-4">
              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="Entrez le montant"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
                <p className="text-moni-gray text-[10px] mt-2">
                  Crédité dans votre portefeuille en {currency}.
                </p>
              </div>

              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Devise</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['USD', 'CDF'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => {
                        setPaymentCurrency(curr);
                        setError('');
                      }}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                        paymentCurrency === curr
                          ? 'bg-moni-accent/20 border-moni-accent text-moni-accent'
                          : 'bg-moni-bg border-white/10 text-moni-white hover:border-moni-accent/50'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  placeholder="+243 8X XXX XX XX"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
                {detectedOperatorDetails ? (
                  <p className="text-moni-accent text-[10px] mt-2 flex items-center gap-1">
                    <i className="fas fa-check-circle"></i>
                    Réseau détecté : {detectedOperatorDetails.name}
                  </p>
                ) : phoneDigits.length >= 2 && !selectedOperator ? (
                  <p className="text-yellow-300 text-[10px] mt-2">
                    Réseau non détecté. Choisissez l'opérateur.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Opérateur Mobile Money</label>
                <div className="grid grid-cols-2 gap-3">
                  {MAXICASH_OPERATORS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedOperator(provider.id);
                        setError('');
                      }}
                      className={`p-3 rounded-xl border transition-all ${
                        selectedOperator === provider.id
                          ? 'bg-moni-accent/20 border-moni-accent'
                          : 'bg-moni-bg border-white/10 hover:border-moni-accent/50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1" style={{ color: provider.color }}>
                          <i className="fas fa-mobile-alt"></i>
                        </div>
                        <p className="text-moni-white text-xs font-semibold">{provider.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-3">
                  <p className="text-red-200 text-xs">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMethod(null);
                    setError('');
                    setStep('method');
                  }}
                  className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
                >
                  Retour
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={isProcessing}
                  className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Traitement...' : 'Continuer'}
                </button>
              </div>
            </div>
          </>
        ) : step === 'form' && method === 'moni-agent' ? (
          <>
            {/* Moni Agent Deposit */}
            <div className="space-y-4">
              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="Entrez le montant"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
              </div>

              <div className="bg-moni-bg rounded-2xl p-4 border border-white/10">
                <h3 className="text-moni-white font-semibold text-sm mb-3">Retrouver un agent</h3>
                <div className="space-y-2">
                  <button className="w-full p-3 bg-white/5 rounded-xl text-moni-white hover:bg-white/10 transition-all flex items-center gap-3">
                    <i className="fas fa-phone text-moni-accent"></i>
                    <span className="text-sm">Entrer le numéro de l'agent</span>
                  </button>
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="w-full p-3 bg-white/5 rounded-xl text-moni-white hover:bg-white/10 transition-all flex items-center gap-3"
                  >
                    <i className="fas fa-qrcode text-moni-accent"></i>
                    <span className="text-sm">Scanner le QR code de l'agent</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro de l'agent</label>
                <input
                  type="tel"
                  value={agentPhone}
                  onChange={(e) => {
                    setAgentPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="+221 77 123 45 67"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-3">
                  <p className="text-red-200 text-xs">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMethod(null);
                    setError('');
                    setStep('method');
                  }}
                  className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
                >
                  Retour
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={isProcessing}
                  className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Traitement...' : 'Continuer'}
                </button>
              </div>
            </div>
          </>
        ) : step === 'processing' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Dépôt en cours</h3>
            <p className="text-moni-gray text-xs text-center">{processingMessage}</p>
          </div>
        ) : step === 'success' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Dépôt réussi</h3>
            <p className="text-moni-gray text-xs text-center mb-4">
              {successMessage || `${amount} ${currency} ajoutés à votre compte`}
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        ) : step === 'pending' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-clock text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Paiement en attente</h3>
            <p className="text-moni-gray text-xs text-center mb-4">{processingMessage}</p>
            <button
              onClick={handleClose}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DepositModal;
