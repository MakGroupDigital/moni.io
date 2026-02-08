import React, { useState } from 'react';
import { PayPalAccount } from '../types';

interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  paypalBalance: number;
}

type PayPalStep = 'overview' | 'withdraw' | 'link' | 'processing' | 'success';

const PayPalModal: React.FC<PayPalModalProps> = ({ isOpen, onClose, paypalBalance }) => {
  const [step, setStep] = useState<PayPalStep>('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('overview');
    setWithdrawAmount('');
    setEmail('');
    setPassword('');
    setError('');
    setIsProcessing(false);
    onClose();
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    if (parseFloat(withdrawAmount) > paypalBalance) {
      setError('Solde insuffisant');
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setError('');

    // Simulation du retrait
    setTimeout(() => {
      setStep('success');
      setIsProcessing(false);
    }, 2000);
  };

  const handleLinkAccount = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsProcessing(true);
    setError('');

    // Simulation de la liaison du compte
    setTimeout(() => {
      setStep('overview');
      setEmail('');
      setPassword('');
      setIsProcessing(false);
    }, 1500);
  };

  const calculateFees = (amount: number) => {
    return amount * 0.029 + 0.3; // 2.9% + $0.30
  };

  const netAmount = withdrawAmount ? parseFloat(withdrawAmount) - calculateFees(parseFloat(withdrawAmount)) : 0;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">PayPal</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'overview' && (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#0070BA] to-[#003087] rounded-2xl p-6 mb-6 text-white">
              <p className="text-white/70 text-xs font-semibold mb-2">Solde PayPal</p>
              <h3 className="text-3xl font-bold mb-4">${paypalBalance.toFixed(2)}</h3>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/70">Compte lié</span>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full">Actif</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setStep('withdraw')}
                className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95"
              >
                <i className="fas fa-arrow-down mr-2"></i> Retirer vers Moni
              </button>
              <button
                onClick={() => setStep('link')}
                className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
              >
                <i className="fas fa-link mr-2"></i> Lier un autre compte
              </button>
            </div>

            {/* Info */}
            <div className="bg-moni-bg rounded-2xl p-4 border border-white/10">
              <h4 className="text-moni-white font-semibold text-sm mb-3">Informations</h4>
              <div className="space-y-2 text-xs text-moni-gray">
                <div className="flex justify-between">
                  <span>Frais de retrait</span>
                  <span>2.9% + $0.30</span>
                </div>
                <div className="flex justify-between">
                  <span>Temps de traitement</span>
                  <span>1-3 jours ouvrables</span>
                </div>
                <div className="flex justify-between">
                  <span>Montant minimum</span>
                  <span>$1.00</span>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'withdraw' && (
          <>
            <div className="mb-6">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant à retirer</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-moni-white text-lg">$</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="0.00"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl pl-8 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
                />
              </div>
              <p className="text-moni-gray text-xs mt-2">Solde disponible: ${paypalBalance.toFixed(2)}</p>
            </div>

            {withdrawAmount && (
              <div className="bg-moni-bg rounded-2xl p-4 mb-6 border border-white/10">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-moni-gray">
                    <span>Montant</span>
                    <span>${parseFloat(withdrawAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-moni-gray">
                    <span>Frais</span>
                    <span>-${calculateFees(parseFloat(withdrawAmount)).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-moni-white font-semibold">
                    <span>Vous recevrez</span>
                    <span>${netAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('overview');
                  setWithdrawAmount('');
                  setError('');
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </>
        )}

        {step === 'link' && (
          <>
            <div className="mb-4">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Email PayPal</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="votre@email.com"
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
              />
            </div>

            <div className="mb-6">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
              />
            </div>

            <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-3 mb-6">
              <p className="text-blue-200 text-xs">
                <i className="fas fa-info-circle mr-2"></i>
                Vos identifiants sont sécurisés et ne seront jamais stockés.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('overview');
                  setEmail('');
                  setPassword('');
                  setError('');
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleLinkAccount}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Liaison...' : 'Lier le compte'}
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Traitement en cours</h3>
            <p className="text-moni-gray text-xs text-center">Veuillez patienter pendant que nous traitons votre retrait...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Retrait confirmé</h3>
            <p className="text-moni-gray text-xs text-center mb-6">
              ${netAmount.toFixed(2)} seront transférés vers votre portefeuille Moni dans 1-3 jours ouvrables.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayPalModal;
