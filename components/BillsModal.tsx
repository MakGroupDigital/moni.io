import React, { useState } from 'react';
import { Bill } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { performTransfer } from '../lib/transactionUtils';

interface BillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onBillPaySuccess?: () => void;
}

type BillsStep = 'list' | 'detail' | 'processing' | 'success';

const BillsModal: React.FC<BillsModalProps> = ({ isOpen, onClose, userBalance, onBillPaySuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<BillsStep>('list');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const bills: Bill[] = [
    {
      id: '1',
      provider: 'Canal+',
      amount: 15000,
      dueDate: '15 Fév 2026',
      status: 'pending',
      reference: 'CANAL-2026-001',
      icon: 'fas fa-tv',
      color: '#EF476F'
    },
    {
      id: '2',
      provider: 'Électricité',
      amount: 25000,
      dueDate: '20 Fév 2026',
      status: 'pending',
      reference: 'ELEC-2026-001',
      icon: 'fas fa-bolt',
      color: '#FFD166'
    },
    {
      id: '3',
      provider: 'Internet',
      amount: 8000,
      dueDate: '10 Fév 2026',
      status: 'overdue',
      reference: 'NET-2026-001',
      icon: 'fas fa-wifi',
      color: '#118AB2'
    },
    {
      id: '4',
      provider: 'Eau',
      amount: 5000,
      dueDate: '25 Jan 2026',
      status: 'paid',
      reference: 'WATER-2026-001',
      icon: 'fas fa-droplet',
      color: '#00F5D4'
    }
  ];

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('list');
    setSelectedBill(null);
    setError('');
    setIsProcessing(false);
    onClose();
  };

  const handlePayBill = async () => {
    if (!selectedBill) return;

    if (selectedBill.amount > userBalance) {
      setError('Solde insuffisant');
      return;
    }

    if (!user?.uid) {
      setError('Utilisateur non authentifié');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      await performTransfer(
        user.uid,
        null,
        selectedBill.amount,
        'bill',
        {
          title: `Facture ${selectedBill.provider}`,
          description: `Paiement de facture`,
          icon: selectedBill.icon,
          color: selectedBill.color,
          reference: selectedBill.reference,
          metadata: {
            provider: selectedBill.provider,
            dueDate: selectedBill.dueDate
          }
        }
      );

      setStep('success');
      setTimeout(() => {
        onBillPaySuccess?.();
        handleClose();
      }, 2000);
    } catch (err) {
      setError('Erreur lors du paiement. Veuillez réessayer.');
      setStep('detail');
      console.error('Bill payment error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-moni-success';
      case 'overdue':
        return 'text-red-400';
      default:
        return 'text-moni-gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'overdue':
        return 'En retard';
      default:
        return 'En attente';
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Factures</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'list' && (
          <>
            <div className="space-y-3 mb-6">
              {bills.map((bill) => (
                <button
                  key={bill.id}
                  onClick={() => {
                    setSelectedBill(bill);
                    setStep('detail');
                  }}
                  disabled={bill.status === 'paid'}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    bill.status === 'paid'
                      ? 'bg-moni-bg/50 border-white/5 opacity-60 cursor-not-allowed'
                      : 'bg-moni-bg border-white/10 hover:border-moni-accent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-lg" style={{ color: bill.color }}>
                      <i className={bill.icon}></i>
                    </div>
                    <div className="text-left">
                      <h4 className="text-moni-white font-semibold text-sm">{bill.provider}</h4>
                      <p className={`text-xs ${getStatusColor(bill.status)}`}>{getStatusLabel(bill.status)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-moni-white font-bold text-sm">${bill.amount.toLocaleString()}</p>
                    <p className="text-moni-gray text-xs">{bill.dueDate}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Fermer
            </button>
          </>
        )}

        {step === 'detail' && selectedBill && (
          <>
            <div className="bg-moni-bg rounded-2xl p-6 mb-6 border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl" style={{ color: selectedBill.color }}>
                  <i className={selectedBill.icon}></i>
                </div>
                <div>
                  <h3 className="text-moni-white font-bold text-lg">{selectedBill.provider}</h3>
                  <p className="text-moni-gray text-xs font-mono">{selectedBill.reference}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="flex justify-between">
                  <span className="text-moni-gray text-sm">Montant</span>
                  <span className="text-moni-white font-semibold">${selectedBill.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moni-gray text-sm">Date limite</span>
                  <span className="text-moni-white font-semibold">{selectedBill.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moni-gray text-sm">Statut</span>
                  <span className={`font-semibold ${getStatusColor(selectedBill.status)}`}>
                    {getStatusLabel(selectedBill.status)}
                  </span>
                </div>
              </div>
            </div>

            {selectedBill.status !== 'paid' && (
              <>
                <div className="bg-moni-bg rounded-2xl p-4 mb-6 border border-white/10">
                  <div className="flex justify-between mb-2">
                    <span className="text-moni-gray text-xs">Solde disponible</span>
                    <span className="text-moni-white font-semibold text-xs">${userBalance.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-moni-accent rounded-full h-2 transition-all"
                      style={{ width: `${Math.min((selectedBill.amount / userBalance) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                    <p className="text-red-200 text-xs">{error}</p>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('list')}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Retour
              </button>
              {selectedBill.status !== 'paid' && (
                <button
                  onClick={handlePayBill}
                  disabled={isProcessing}
                  className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Paiement...' : 'Payer'}
                </button>
              )}
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Paiement en cours</h3>
            <p className="text-moni-gray text-xs text-center">Veuillez patienter...</p>
          </div>
        )}

        {step === 'success' && selectedBill && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Paiement réussi</h3>
            <p className="text-moni-gray text-xs text-center mb-4">
              ${selectedBill.amount.toLocaleString()} payés à {selectedBill.provider}
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

export default BillsModal;
