import React, { useState } from 'react';
import { MOBILE_MONEY_PROVIDERS } from '../types';
import AgentQRScanner from './AgentQRScanner';
import { useAuth } from '../contexts/AuthContext';
import { performTransfer } from '../lib/transactionUtils';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositSuccess?: () => void;
}

type DepositMethod = 'mobile-money' | 'moni-agent' | null;

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onDepositSuccess }) => {
  const { user } = useAuth();
  const [method, setMethod] = useState<DepositMethod>(null);
  const [amount, setAmount] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'method' | 'form' | 'processing' | 'success'>('method');

  const handleClose = () => {
    setMethod(null);
    setAmount('');
    setSelectedOperator('');
    setPhoneNumber('');
    setAgentPhone('');
    setShowQRScanner(false);
    setError('');
    setStep('method');
    setIsProcessing(false);
    onClose();
  };

  const handleQRScan = (result: string) => {
    setAgentPhone(result);
    setShowQRScanner(false);
  };

  if (!isOpen) return null;

  if (showQRScanner) {
    return <AgentQRScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />;
  }

  const handleDeposit = async () => {
    if (!amount || (method === 'mobile-money' && !selectedOperator) || (method === 'moni-agent' && !agentPhone)) {
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

    try {
      await performTransfer(
        user.uid,
        null,
        depositAmount,
        'deposit',
        {
          title: 'Dépôt',
          description: method === 'mobile-money' ? `Via ${selectedOperator}` : 'Via agent Moni',
          icon: 'fas fa-arrow-down',
          color: '#00F5D4',
          reference: `DEP-${Date.now()}`,
          metadata: {
            method,
            operator: selectedOperator,
            phoneNumber: method === 'mobile-money' ? phoneNumber : agentPhone
          }
        }
      );

      setStep('success');
      setTimeout(() => {
        onDepositSuccess?.();
        handleClose();
      }, 2000);
    } catch (err) {
      setError('Erreur lors du dépôt. Veuillez réessayer.');
      setStep('form');
      console.error('Deposit error:', err);
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
                  setStep('form');
                }}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-mobile-alt text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Mobile Money</h3>
                  <p className="text-moni-gray text-xs">Orange Money, MTN, Airtel, etc.</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>

              <button
                onClick={() => {
                  setMethod('moni-agent');
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
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Entrez le montant"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
              </div>

              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Opérateur Mobile Money</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(MOBILE_MONEY_PROVIDERS).map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedOperator(provider.name)}
                      className={`p-3 rounded-xl border transition-all ${
                        selectedOperator === provider.name
                          ? 'bg-moni-accent/20 border-moni-accent'
                          : 'bg-moni-bg border-white/10 hover:border-moni-accent/50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1" style={{ color: provider.color }}>
                          <i className={provider.icon}></i>
                        </div>
                        <p className="text-moni-white text-xs font-semibold">{provider.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
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
                  onChange={(e) => setAmount(e.target.value)}
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
                  onChange={(e) => setAgentPhone(e.target.value)}
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
            <p className="text-moni-gray text-xs text-center">Veuillez patienter...</p>
          </div>
        ) : step === 'success' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Dépôt réussi</h3>
            <p className="text-moni-gray text-xs text-center mb-4">
              ${amount} ajoutés à votre compte
            </p>
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
