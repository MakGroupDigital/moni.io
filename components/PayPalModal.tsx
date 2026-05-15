import React, { useEffect, useState } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';

interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  paypalBalance: number;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const PayPalModal: React.FC<PayPalModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [paypalEmail, setPaypalEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaypalEmail(user?.paypalEmail || '');
      setError('');
      setSuccess('');
      setIsProcessing(false);
    }
  }, [isOpen, user?.paypalEmail]);

  if (!isOpen) return null;

  const handleClose = () => {
    setError('');
    setSuccess('');
    setIsProcessing(false);
    onClose();
  };

  const handleLinkAccount = async () => {
    setError('');
    setSuccess('');

    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return;
    }

    if (!isValidEmail(paypalEmail)) {
      setError('Veuillez saisir un email PayPal valide.');
      return;
    }

    setIsProcessing(true);

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          paypalLinked: true,
          paypalEmail: paypalEmail.trim(),
          paypalLinkedAt: Timestamp.now(),
        },
        { merge: true }
      );
      setSuccess('Compte PayPal lié à Moni.');
    } catch (err: any) {
      console.error('PayPal link error:', err);
      setError(err?.message || 'Impossible de lier ce compte PayPal.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">PayPal</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white" type="button">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="bg-moni-bg rounded-2xl p-5 mb-6 border border-white/10">
          <div className="flex items-center justify-center gap-5 mb-5">
            <div className="w-20 h-20 rounded-2xl bg-moni-bg border border-moni-accent/30 flex items-center justify-center overflow-hidden shadow-lg shadow-moni-accent/10">
              <img src="/onelogo.png" alt="Moni.io" className="w-16 h-16 object-contain" />
            </div>
            <div className="w-10 h-10 rounded-full bg-moni-accent/20 flex items-center justify-center text-moni-accent">
              <i className="fas fa-link"></i>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-[#0070BA] flex items-center justify-center text-white text-3xl">
              <i className="fab fa-paypal"></i>
            </div>
          </div>

          <h3 className="text-moni-white text-lg font-bold text-center mb-2">
            Lier PayPal à Moni
          </h3>
          <p className="text-moni-gray text-xs text-center">
            Cet email sera utilisé pour envoyer vos retraits via PayPal Payouts.
          </p>
        </div>

        <div className="mb-5">
          <label className="text-moni-gray text-xs font-semibold mb-2 block">Email PayPal</label>
          <input
            type="email"
            value={paypalEmail}
            onChange={(event) => {
              setPaypalEmail(event.target.value);
              setError('');
              setSuccess('');
            }}
            placeholder="email@paypal.com"
            className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
          />
        </div>

        {user?.paypalLinked && (
          <div className="bg-moni-accent/10 border border-moni-accent/40 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3">
              <i className="fas fa-check-circle text-moni-accent"></i>
              <div className="min-w-0">
                <p className="text-moni-white text-sm font-semibold">Compte lié</p>
                <p className="text-moni-gray text-xs truncate">{user.paypalEmail || user.paypalPayerId}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-moni-accent/10 border border-moni-accent/40 rounded-xl p-3 mb-4">
            <p className="text-moni-accent text-xs">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
            <p className="text-red-200 text-xs">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
            type="button"
          >
            Fermer
          </button>
          <button
            onClick={handleLinkAccount}
            disabled={isProcessing}
            className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all disabled:opacity-50"
            type="button"
          >
            {isProcessing ? 'Liaison...' : user?.paypalLinked ? 'Mettre à jour' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayPalModal;
