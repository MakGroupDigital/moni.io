import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CURRENCY_SYMBOLS } from '../types';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { buildPaymentLinkForUser } from '../lib/paymentLinks';
import { renderBrandedQRCodeToCanvas, renderPaymentBadgeToCanvas } from '../lib/qrBranding';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenP2P?: () => void;
}

const receiveMethods = [
  {
    title: 'Lien court',
    description: 'Partager un lien personnalisé Moni avec ou sans montant.',
    icon: 'fas fa-link',
  },
  {
    title: 'QR dynamique',
    description: 'Afficher un QR code qui contient le lien de paiement.',
    icon: 'fas fa-qrcode',
  },
  {
    title: 'Code Moni',
    description: 'Donner le numéro Moni au payeur pour une saisie manuelle.',
    icon: 'fas fa-keyboard',
  },
  {
    title: 'Demande P2P',
    description: 'Créer une demande de paiement envoyée à un utilisateur Moni.',
    icon: 'fas fa-hand-holding-heart',
  },
  {
    title: 'Badge caisse',
    description: 'Télécharger une affiche Moni prête à poser à la caisse.',
    icon: 'fas fa-store',
  },
];

const ReceiveModal: React.FC<ReceiveModalProps> = ({ isOpen, onClose, onOpenP2P }) => {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [withAmount, setWithAmount] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');

  const amountValue = parseFloat(amount || '0');
  const canUseAmount = withAmount && amountValue > 0;
  const merchantName = user?.displayName || 'Marchand Moni';
  const amountLabel = canUseAmount ? `${CURRENCY_SYMBOLS[currency]}${amountValue.toFixed(2)}` : undefined;
  const paymentLink = useMemo(() => {
    if (!user) return '';
    return buildPaymentLinkForUser(user, canUseAmount ? amountValue : undefined, canUseAmount ? currency : undefined, note);
  }, [amountValue, canUseAmount, currency, note, user]);

  useEffect(() => {
    if (!isOpen || !paymentLink || !user) return;

    const renderCodes = async () => {
      try {
        if (canvasRef.current) {
          await renderBrandedQRCodeToCanvas(canvasRef.current, paymentLink, { width: 260 });
        }

        if (badgeCanvasRef.current) {
          await renderPaymentBadgeToCanvas({
            canvas: badgeCanvasRef.current,
            paymentLink,
            merchantName,
            moniNumber: user.moniNumber,
            amountLabel,
            note,
          });
        }
      } catch (error) {
        console.error('Payment QR generation error:', error);
      }
    };

    renderCodes();
  }, [amountLabel, isOpen, merchantName, note, paymentLink, user]);

  useEffect(() => {
    if (!isOpen) {
      setWithAmount(false);
      setAmount('');
      setNote('');
      setFeedback('');
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(message);
    } catch {
      setFeedback('Copie impossible sur ce navigateur.');
    }
    window.setTimeout(() => setFeedback(''), 2200);
  };

  const shareLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Me payer sur Moni.io',
          text: canUseAmount
            ? `Paiement Moni de ${CURRENCY_SYMBOLS[currency]}${amountValue.toFixed(2)}`
            : 'Utilisez ce lien pour me payer sur Moni.io',
          url: paymentLink,
        });
        return;
      }
    } catch {
      // Si le partage natif est annulé ou refusé, on retombe sur la copie.
    }

    await copyText(paymentLink, 'Lien copié');
  };

  const downloadQr = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `moni-paiement-${user.moniNumber}.png`;
    link.click();
  };

  const downloadBadge = () => {
    if (!badgeCanvasRef.current) return;

    const link = document.createElement('a');
    link.href = badgeCanvasRef.current.toDataURL('image/png');
    link.download = `moni-badge-caisse-${user.moniNumber}.png`;
    link.click();
  };

  const openP2P = () => {
    onClose();
    onOpenP2P?.();
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[92%] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-moni-accent text-[10px] font-bold uppercase tracking-widest mb-1">Recevoir</p>
            <h2 className="text-xl font-bold text-moni-white font-montserrat">Être payé</h2>
            <p className="text-moni-gray text-xs mt-1">Générez un lien ou un QR de paiement Moni.</p>
          </div>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white" type="button">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="bg-moni-bg rounded-2xl p-4 mb-4 border border-white/10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-moni-white text-sm font-semibold">Montant fixe</h3>
              <p className="text-moni-gray text-xs">Désactivez pour laisser le payeur saisir le montant.</p>
            </div>
            <button
              onClick={() => setWithAmount((value) => !value)}
              className={`w-12 h-7 rounded-full p-1 transition-all ${withAmount ? 'bg-moni-accent' : 'bg-white/10'}`}
              type="button"
              aria-label="Activer le montant fixe"
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${withAmount ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {withAmount && (
            <div className="relative mb-3">
              <span className="absolute left-4 top-3 text-moni-white text-lg">{CURRENCY_SYMBOLS[currency]}</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-moni-card border border-white/10 rounded-xl pl-10 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
              />
            </div>
          )}

          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={80}
            placeholder="Référence ou motif optionnel"
            className="w-full bg-moni-card border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-sm"
          />
        </div>

        <div className="bg-white rounded-2xl p-4 mb-4 flex justify-center">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>

        <div className="bg-moni-bg rounded-2xl p-4 mb-4 border border-white/10">
          <p className="text-moni-gray text-xs mb-2">Lien court de paiement</p>
          <div className="bg-moni-card rounded-xl p-3 border border-white/10">
            <p className="text-moni-white text-xs break-all font-mono">{paymentLink}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button onClick={() => copyText(paymentLink, 'Lien copié')} className="bg-moni-accent text-moni-bg py-3 rounded-xl text-xs font-bold" type="button">
              Copier
            </button>
            <button onClick={shareLink} className="bg-white/10 text-moni-white py-3 rounded-xl text-xs font-bold" type="button">
              Partager
            </button>
            <button onClick={downloadQr} className="bg-white/10 text-moni-white py-3 rounded-xl text-xs font-bold" type="button">
              QR
            </button>
          </div>
          {feedback && (
            <p className="text-moni-accent text-xs mt-3 font-semibold">{feedback}</p>
          )}
        </div>

        <div className="bg-moni-bg rounded-2xl p-4 mb-5 border border-white/10">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-moni-white text-sm font-semibold">Badge caisse</h3>
              <p className="text-moni-gray text-xs">Affiche avec logo, QR, nom marchand et numéro Moni.</p>
            </div>
            <button onClick={downloadBadge} className="bg-moni-accent text-moni-bg px-3 py-2 rounded-xl text-xs font-bold" type="button">
              Télécharger
            </button>
          </div>
          <div className="bg-moni-card rounded-2xl p-2 border border-white/10">
            <canvas ref={badgeCanvasRef} className="w-full h-auto rounded-xl block" />
          </div>
        </div>

        <div className="mb-5">
          <h3 className="text-moni-white font-semibold text-sm mb-3">Autres façons d’être payé</h3>
          <div className="space-y-2">
            {receiveMethods.map((method) => (
              <div key={method.title} className="flex items-start gap-3 bg-moni-bg rounded-2xl p-3 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-moni-accent/15 flex items-center justify-center text-moni-accent flex-shrink-0">
                  <i className={method.icon}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-moni-white text-xs font-semibold">{method.title}</h4>
                  <p className="text-moni-gray text-[10px] mt-1">{method.description}</p>
                </div>
                {method.title === 'Code Moni' && (
                  <button onClick={() => copyText(user.moniNumber, 'Code Moni copié')} className="text-moni-accent text-xs font-bold" type="button">
                    Copier
                  </button>
                )}
                {method.title === 'Demande P2P' && (
                  <button onClick={openP2P} className="text-moni-accent text-xs font-bold" type="button">
                    Ouvrir
                  </button>
                )}
                {method.title === 'Badge caisse' && (
                  <button onClick={downloadBadge} className="text-moni-accent text-xs font-bold" type="button">
                    Télécharger
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
          type="button"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default ReceiveModal;
