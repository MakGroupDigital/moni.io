import React, { useState } from 'react';
import { MoniUser, BluetoothMoniUser } from '../types';
import BluetoothUserSelector from './BluetoothUserSelector';
import { useAuth } from '../contexts/AuthContext';
import { performTransfer } from '../lib/transactionUtils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNotificationContext } from '../contexts/NotificationContext';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onSendSuccess?: () => void;
}

type SendStep = 'method' | 'search' | 'confirm' | 'processing' | 'success' | 'error';

const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose, userBalance, onSendSuccess }) => {
  const { user } = useAuth();
  const { success, error } = useNotificationContext();
  const [step, setStep] = useState<SendStep>('method');
  const [moniNumber, setMoniNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recipient, setRecipient] = useState<MoniUser | BluetoothMoniUser | null>(null);
  const [showBluetoothSelector, setShowBluetoothSelector] = useState(false);

  if (!isOpen) return null;

  if (showBluetoothSelector) {
    return (
      <BluetoothUserSelector
        onUserSelected={(user) => {
          setRecipient(user);
          setShowBluetoothSelector(false);
          setStep('confirm');
        }}
        onClose={() => setShowBluetoothSelector(false)}
      />
    );
  }

  const handleClose = () => {
    setStep('method');
    setMoniNumber('');
    setAmount('');
    setMessage('');
    setErrorMsg('');
    setRecipient(null);
    setIsProcessing(false);
    setShowBluetoothSelector(false);
    onClose();
  };

  const validateMoniNumber = (number: string): boolean => {
    const moniRegex = /^MN1000\d+$/;
    return moniRegex.test(number);
  };

  const handleSearchRecipient = async () => {
    setErrorMsg('');

    if (!moniNumber.trim()) {
      setErrorMsg('Veuillez entrer un numéro Moni');
      return;
    }

    if (!validateMoniNumber(moniNumber)) {
      setErrorMsg('Format invalide. Le numéro doit commencer par MN1000');
      return;
    }

    setIsProcessing(true);

    try {
      // Chercher l'utilisateur dans Firestore par moniNumber
      const q = query(
        collection(db, 'users'),
        where('moniNumber', '==', moniNumber)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        // Générer une image par défaut basée sur le nom ou le moniNumber
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'User')}&background=00F5D4&color=050A10&bold=true`;
        
        setRecipient({
          moniNumber: userData.moniNumber,
          name: userData.displayName || 'Utilisateur',
          avatar: userData.photoURL || defaultAvatar
        });
        setStep('confirm');
      } else {
        setErrorMsg('Utilisateur non trouvé');
      }
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Error searching recipient:', err);
      setErrorMsg(err?.message || 'Erreur lors de la recherche. Veuillez réessayer.');
      setIsProcessing(false);
    }
  };

  const handleSendMoney = async () => {
    setErrorMsg('');

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg('Veuillez entrer un montant valide');
      return;
    }

    if (parseFloat(amount) > userBalance) {
      setErrorMsg('Solde insuffisant');
      return;
    }

    if (!user?.uid || !recipient) {
      setErrorMsg('Erreur: utilisateur ou destinataire non trouvé');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      // Effectuer le transfert avec notification
      await performTransfer(
        user.uid,
        recipient.moniNumber, // Passer le moniNumber du destinataire
        parseFloat(amount),
        'send',
        {
          title: 'Transfert envoyé',
          description: `À ${recipient.name}`,
          icon: 'fas fa-arrow-right',
          color: '#00F5D4',
          recipientName: recipient.name,
          recipientMoniNumber: recipient.moniNumber,
          senderName: user.displayName || 'Utilisateur',
          senderMoniNumber: user.moniNumber,
          message: message || undefined,
          reference: `TRF-${Date.now()}`
        }
      );

      // Afficher une notification de succès
      success('Transfert réussi', `${amount}$ envoyés à ${recipient.name}`);

      setStep('success');
      setTimeout(() => {
        onSendSuccess?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      error('Erreur', 'Erreur lors du transfert. Veuillez réessayer.');
      setStep('confirm');
      console.error('Send error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Envoyer de l'argent</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'method' && (
          <>
            <div className="space-y-3 mb-6">
              {/* Manual Entry */}
              <button
                onClick={() => setStep('search')}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-keyboard text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Entrer le numéro</h3>
                  <p className="text-moni-gray text-xs">Saisir le numéro Moni du destinataire</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>

              {/* Bluetooth */}
              <button
                onClick={() => setShowBluetoothSelector(true)}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-bluetooth text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Utilisateur à proximité</h3>
                  <p className="text-moni-gray text-xs">Envoyer avec Bluetooth</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Annuler
            </button>
          </>
        )}

        {step === 'search' && (
          <>
            <div className="mb-6">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro Moni du destinataire</label>
              <input
                type="text"
                value={moniNumber}
                onChange={(e) => {
                  setMoniNumber(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                placeholder="MN1000..."
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent font-mono"
              />
              <p className="text-moni-gray text-xs mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                Format: MN1000 suivi du numéro d'ordre
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleSearchRecipient}
              disabled={isProcessing}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? 'Recherche...' : 'Continuer'}
            </button>
          </>
        )}

        {step === 'confirm' && recipient && (
          <>
            {/* Recipient Card */}
            <div className="bg-moni-bg rounded-2xl p-4 mb-6 border border-white/10">
              <p className="text-moni-gray text-xs font-semibold mb-3">Destinataire</p>
              <div className="flex items-center gap-3">
                <img
                  src={recipient.avatar}
                  alt={recipient.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-moni-white font-semibold text-sm">{recipient.name}</h4>
                  <p className="text-moni-gray text-xs font-mono">{recipient.moniNumber}</p>
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-moni-white text-lg">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="0.00"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl pl-8 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
                />
              </div>
              <p className="text-moni-gray text-xs mt-2">Solde disponible: ${userBalance.toFixed(2)}</p>
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Message (optionnel)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ajouter un message..."
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
              />
            </div>

            {/* Summary */}
            {amount && (
              <div className="bg-moni-bg rounded-2xl p-4 mb-6 border border-white/10">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-moni-gray">
                    <span>Montant</span>
                    <span>${parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-moni-gray">
                    <span>Frais</span>
                    <span>Gratuit</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-moni-white font-semibold">
                    <span>Total</span>
                    <span>${parseFloat(amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{errorMsg}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('method');
                  setAmount('');
                  setMessage('');
                  setRecipient(null);
                  setErrorMsg('');
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleSendMoney}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Envoi en cours</h3>
            <p className="text-moni-gray text-xs text-center">Veuillez patienter pendant que nous traitons votre transfert...</p>
          </div>
        )}

        {step === 'success' && recipient && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Transfert réussi</h3>
            <p className="text-moni-gray text-xs text-center mb-4">
              ${amount} envoyés à {recipient.name}
            </p>
            <div className="bg-moni-bg rounded-2xl p-4 w-full mb-6 border border-white/10">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-moni-gray">
                  <span>Destinataire</span>
                  <span className="text-moni-white font-semibold">{recipient.name}</span>
                </div>
                <div className="flex justify-between text-moni-gray">
                  <span>Montant</span>
                  <span className="text-moni-white font-semibold">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-moni-gray">
                  <span>Statut</span>
                  <span className="text-moni-success font-semibold">Complété</span>
                </div>
              </div>
            </div>
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

export default SendModal;
