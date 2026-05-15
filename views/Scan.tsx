import React, { useState } from 'react';
import PaymentQRScanner from '../components/PaymentQRScanner';
import ManualCodeInput from '../components/ManualCodeInput';
import PinConfirmModal from '../components/PinConfirmModal';
import { CURRENCY_SYMBOLS } from '../types';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { performTransfer } from '../lib/transactionUtils';
import { useNotificationContext } from '../contexts/NotificationContext';

interface ParsedPaymentCode {
  moniNumber: string;
  name: string;
  amount?: number;
  reference?: string;
  raw: string;
}

const parsePaymentCode = (rawCode: string): ParsedPaymentCode | null => {
  const raw = rawCode.trim();
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    const moniNumber = String(payload.moniNumber || payload.recipientMoniNumber || payload.merchantMoniNumber || payload.to || '');
    if (/^MN1000\d+$/.test(moniNumber)) {
      return {
        moniNumber,
        name: String(payload.name || payload.merchantName || 'Marchand Moni'),
        amount: payload.amount ? Number(payload.amount) : undefined,
        reference: payload.reference ? String(payload.reference) : undefined,
        raw,
      };
    }
  } catch {
    // Le QR peut être une URL ou un numéro Moni brut.
  }

  try {
    const url = new URL(raw);
    const pathMoniNumber = url.pathname.match(/MN1000\d+/i)?.[0]?.toUpperCase() || '';
    const moniNumber = String(
      url.searchParams.get('to') ||
      url.searchParams.get('moniNumber') ||
      url.searchParams.get('recipient') ||
      pathMoniNumber ||
      ''
    );
    if (/^MN1000\d+$/.test(moniNumber)) {
      return {
        moniNumber,
        name: url.searchParams.get('name') || 'Marchand Moni',
        amount: url.searchParams.get('a') || url.searchParams.get('amount') ? Number(url.searchParams.get('a') || url.searchParams.get('amount')) : undefined,
        reference: url.searchParams.get('r') || url.searchParams.get('reference') || undefined,
        raw,
      };
    }
  } catch {
    // Ignore.
  }

  if (/^MN1000\d+$/.test(raw.toUpperCase())) {
    return {
      moniNumber: raw.toUpperCase(),
      name: 'Marchand Moni',
      raw,
    };
  }

  return null;
};

const Scan: React.FC = () => {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { success, error: toastError } = useNotificationContext();
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const [showCamera, setShowCamera] = useState(true);
  const [showManualCode, setShowManualCode] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [paymentCode, setPaymentCode] = useState<ParsedPaymentCode | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const handleCode = (code: string) => {
    const parsed = parsePaymentCode(code);
    setScannedCode(code);
    setPaymentCode(parsed);
    setAmount(parsed?.amount ? String(parsed.amount) : '');
    setPaymentDone(false);
    setError(parsed ? '' : 'Code marchand non pris en charge.');
    return parsed;
  };

  const handleQRScan = (result: string) => {
    handleCode(result);
    setShowCamera(false);
  };

  const handleManualCode = (code: string) => {
    const parsed = handleCode(code);
    setShowManualCode(false);
    setShowCamera(!parsed);
  };

  const closeManualCode = () => {
    setShowManualCode(false);
    setShowCamera(true);
  };

  const selectedAmount = parseFloat(amount || '0');

  const handleConfirmPayment = () => {
    setError('');

    if (!paymentCode) {
      setError('Code marchand non pris en charge.');
      return;
    }

    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return;
    }

    if (!selectedAmount || selectedAmount <= 0) {
      setError('Veuillez saisir un montant valide.');
      return;
    }

    if (selectedAmount > (user.balance || 0)) {
      setError('Solde insuffisant.');
      return;
    }

    setShowPinConfirm(true);
  };

  const executePayment = async () => {
    if (!user?.uid || !paymentCode) return;

    setShowPinConfirm(false);
    setIsProcessing(true);
    setError('');

    try {
      await performTransfer(
        user.uid,
        paymentCode.moniNumber,
        selectedAmount,
        'send',
        {
          title: 'Paiement scanner',
          description: `À ${paymentCode.name}`,
          icon: 'fas fa-qrcode',
          color: '#00F5D4',
          recipientName: paymentCode.name,
          recipientMoniNumber: paymentCode.moniNumber,
          senderName: user.displayName || 'Utilisateur',
          senderMoniNumber: user.moniNumber,
          reference: paymentCode.reference || `SCAN-${Date.now()}`,
          metadata: {
            paymentChannel: 'qr-scan',
            rawCode: paymentCode.raw,
            currency,
          }
        }
      );

      setPaymentDone(true);
      success('Paiement effectué', `${symbol}${selectedAmount.toFixed(2)} payés à ${paymentCode.name}`);
    } catch (err: any) {
      console.error('Scanner payment error:', err);
      const message = err?.message || 'Paiement impossible. Veuillez réessayer.';
      setError(message);
      toastError('Erreur', message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showCamera) {
    return (
      <PaymentQRScanner
        onScan={handleQRScan}
        onClose={() => setShowCamera(false)}
        onManualEntry={() => {
          setShowCamera(false);
          setShowManualCode(true);
        }}
      />
    );
  }

  if (showManualCode) {
    return <ManualCodeInput onSubmit={handleManualCode} onClose={closeManualCode} title="Entrer le code du marchand" placeholder="MN1000... ou code QR" />;
  }

  return (
    <div className="h-full flex flex-col bg-black/40">
      <header className="p-5 flex justify-between items-center bg-moni-bg">
         <h1 className="text-xl font-bold text-moni-white font-montserrat">Scanner</h1>
         <div className="flex items-center gap-3">
           <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
           <i className="fas fa-bolt text-moni-gray"></i>
         </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 flex flex-col items-center justify-center p-10">
          <div className="w-full aspect-square border-2 border-moni-accent/30 rounded-3xl relative">
             <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-moni-accent rounded-tl-xl"></div>
             <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-moni-accent rounded-tr-xl"></div>
             <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-moni-accent rounded-bl-xl"></div>
             <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-moni-accent rounded-br-xl"></div>
             <div className="absolute top-0 left-0 w-full h-0.5 bg-moni-accent/60 shadow-[0_0_15px_#00F5D4] animate-[scan_3s_ease-in-out_infinite]"></div>
          </div>

          {!paymentCode && (
            <p className="mt-8 text-white text-center text-xs font-medium bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm">
              {scannedCode ? 'Code reçu' : 'Caméra fermée'}
            </p>
          )}
        </div>

        {(paymentCode || error || paymentDone) && (
          <div className="absolute left-5 right-5 bottom-5 bg-moni-card rounded-2xl p-4 border border-white/10">
            {paymentCode && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-moni-accent/20 flex items-center justify-center text-moni-accent">
                    <i className="fas fa-store"></i>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-moni-white font-semibold text-sm">{paymentCode.name}</h3>
                    <p className="text-moni-gray text-xs font-mono truncate">{paymentCode.moniNumber}</p>
                  </div>
                </div>

                <div className="relative mb-3">
                  <span className="absolute left-4 top-3 text-moni-white text-lg">{symbol}</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setError('');
                    }}
                    disabled={Boolean(paymentCode.amount) || paymentDone}
                    placeholder="0.00"
                    className="w-full bg-moni-bg border border-white/10 rounded-xl pl-10 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg disabled:opacity-80"
                  />
                </div>

                {paymentDone ? (
                  <div className="bg-moni-accent/10 border border-moni-accent/40 rounded-xl p-3">
                    <p className="text-moni-accent text-xs font-semibold">Paiement confirmé</p>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmPayment}
                    disabled={isProcessing}
                    className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all disabled:opacity-50"
                    type="button"
                  >
                    {isProcessing ? 'Paiement...' : 'Payer'}
                  </button>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mt-3">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-10 bg-moni-bg flex justify-center items-center">
         <div className="flex gap-10">
           <div
             onClick={() => setShowCamera(true)}
             className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
           >
              <div className="w-14 h-14 rounded-full bg-moni-card flex items-center justify-center text-xl text-moni-white">
                 <i className="fas fa-camera"></i>
              </div>
              <span className="text-[10px] text-moni-gray">Caméra</span>
           </div>
           <div
             onClick={() => setShowManualCode(true)}
             className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
           >
              <div className="w-14 h-14 rounded-full bg-moni-accent flex items-center justify-center text-xl text-moni-bg shadow-lg shadow-moni-accent/20">
                 <i className="fas fa-keyboard"></i>
              </div>
              <span className="text-[10px] text-moni-accent font-bold">Code</span>
           </div>
         </div>
      </div>

      <PinConfirmModal
        isOpen={showPinConfirm}
        onClose={() => setShowPinConfirm(false)}
        onConfirmed={executePayment}
        title="Confirmer le paiement"
        description={paymentCode ? `Paiement à ${paymentCode.name}` : 'Paiement scanner'}
        amountLabel={amount ? `${symbol}${selectedAmount.toFixed(2)}` : undefined}
        confirmLabel="Payer"
      />

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Scan;
