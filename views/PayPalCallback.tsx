import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PayPalCallbackProps {
  onComplete: () => void;
}

const PayPalCallback: React.FC<PayPalCallbackProps> = ({ onComplete }) => {
  const { firebaseUser, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finalisation de la liaison PayPal...');

  useEffect(() => {
    const completeLink = async () => {
      if (loading) return;

      if (!firebaseUser) {
        setStatus('error');
        setMessage('Session Moni expirée. Connectez-vous puis relancez la liaison PayPal.');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code') || '';
      const state = params.get('state') || '';
      const paypalError = params.get('error_description') || params.get('error');

      if (paypalError) {
        setStatus('error');
        setMessage(paypalError);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Réponse PayPal incomplète.');
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch('/api/paypal/link/complete', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || `Erreur ${response.status}`);
        }

        setStatus('success');
        setMessage(payload?.paypalEmail ? `Compte ${payload.paypalEmail} lié à Moni.` : 'Compte PayPal lié à Moni.');
      } catch (err: any) {
        console.error('PayPal callback error:', err);
        setStatus('error');
        setMessage(err?.message || 'Impossible de finaliser la liaison PayPal.');
      }
    };

    completeLink();
  }, [firebaseUser, loading]);

  return (
    <div className="min-h-screen bg-moni-dark flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-moni-card rounded-3xl p-6 border border-white/10">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-moni-bg border border-moni-accent/30 flex items-center justify-center shadow-lg shadow-moni-accent/10">
            <img src="/onelogo.png" alt="Moni.io" className="w-12 h-12 object-contain" />
          </div>
          <i className="fas fa-link text-moni-accent"></i>
          <div className="w-16 h-16 rounded-2xl bg-[#0070BA] flex items-center justify-center text-white text-2xl">
            <i className="fab fa-paypal"></i>
          </div>
        </div>

        <div className="text-center">
          <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
            status === 'success' ? 'bg-moni-accent/20 text-moni-accent' : status === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-moni-accent/20 text-moni-accent'
          }`}>
            <i className={`fas ${status === 'success' ? 'fa-check' : status === 'error' ? 'fa-times' : 'fa-spinner animate-spin'} text-xl`}></i>
          </div>
          <h1 className="text-moni-white text-xl font-bold font-montserrat mb-2">
            {status === 'success' ? 'PayPal lié' : status === 'error' ? 'Liaison impossible' : 'PayPal'}
          </h1>
          <p className="text-moni-gray text-sm mb-6">{message}</p>
          <button
            onClick={onComplete}
            className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
            type="button"
          >
            Retour à Moni
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayPalCallback;
