import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { AuthUser } from '../types';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, user }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && user && canvasRef.current) {
      // Créer les données du QR code avec les infos utilisateur
      const qrData = JSON.stringify({
        moniNumber: user.moniNumber,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      });

      // Générer le QR code
      QRCode.toCanvas(canvasRef.current, qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.href = canvasRef.current.toDataURL('image/png');
      link.download = `moni-qrcode-${user.moniNumber}.png`;
      link.click();
    }
  };

  const handleShare = async () => {
    if (canvasRef.current) {
      try {
        const blob = await new Promise<Blob>((resolve) => {
          canvasRef.current!.toBlob((blob) => {
            resolve(blob!);
          });
        });

        if (navigator.share) {
          await navigator.share({
            title: 'Mon QR Code Moni.io',
            text: `Scannez mon QR code pour m'envoyer de l'argent: ${user.moniNumber}`,
            files: [new File([blob], 'moni-qrcode.png', { type: 'image/png' })]
          });
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-moni-card rounded-3xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Mon QR Code</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="bg-moni-bg rounded-2xl p-6 mb-6 flex justify-center">
          <canvas ref={canvasRef} className="rounded-lg" />
        </div>

        <div className="bg-moni-bg rounded-2xl p-4 mb-6">
          <p className="text-moni-gray text-xs mb-2">Numéro Moni</p>
          <p className="text-moni-white font-mono font-bold text-sm">{user.moniNumber}</p>
          <p className="text-moni-gray text-xs mt-3 mb-2">Nom</p>
          <p className="text-moni-white font-semibold text-sm">{user.displayName}</p>
          <p className="text-moni-gray text-xs mt-3 mb-2">Email</p>
          <p className="text-moni-white text-sm break-all">{user.email}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fas fa-download"></i>
            Télécharger
          </button>
          {navigator.share && (
            <button
              onClick={handleShare}
              className="flex-1 p-3 bg-white/10 text-moni-white rounded-xl font-semibold hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-share-alt"></i>
              Partager
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 p-3 bg-white/5 text-moni-white rounded-xl font-semibold hover:bg-white/10 transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default QRCodeModal;
