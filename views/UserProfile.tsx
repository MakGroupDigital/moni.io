import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileProps {
  onComplete: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyMoniNumber = () => {
    if (user?.moniNumber) {
      navigator.clipboard.writeText(user.moniNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddContact = () => {
    if (!user) return;

    // Créer un contact vCard
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${user.displayName}
TEL:${user.moniNumber}
EMAIL:${user.email}
END:VCARD`;

    // Créer un blob et télécharger
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${user.displayName}-moni.vcf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadQR = () => {
    if (!user?.qrCode) return;

    const link = document.createElement('a');
    link.href = user.qrCode;
    link.download = `${user.displayName}-qrcode.png`;
    link.click();
  };

  return (
    <div className="w-full h-screen bg-moni-bg relative overflow-hidden flex flex-col">
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-6 pt-16 pb-10 overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-moni-white font-montserrat font-bold text-2xl mb-2">Votre Profil</h1>
          <p className="text-moni-gray text-sm">Bienvenue sur Moni.io!</p>
        </div>

        {/* Profile Card */}
        <div className="bg-moni-card rounded-3xl p-6 border border-white/10 mb-6">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-moni-accent/20 overflow-hidden border-4 border-moni-accent/50">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-moni-accent text-3xl">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <h2 className="text-moni-white font-bold text-lg text-center mb-1">{user?.displayName}</h2>
          <p className="text-moni-gray text-xs text-center mb-6">{user?.email}</p>

          {/* Divider */}
          <div className="h-px bg-white/10 mb-6"></div>

          {/* Moni Number */}
          <div className="mb-6">
            <p className="text-moni-gray text-xs font-semibold mb-2">Numéro Moni</p>
            <div className="bg-moni-bg rounded-xl p-4 flex items-center justify-between border border-moni-accent/30">
              <p className="text-moni-white font-mono font-bold text-lg">{user?.moniNumber}</p>
              <button
                onClick={handleCopyMoniNumber}
                className="p-2 hover:bg-moni-accent/20 rounded-lg transition-all"
              >
                <i className={`fas fa-${copied ? 'check' : 'copy'} text-moni-accent`}></i>
              </button>
            </div>
            <button
              onClick={handleAddContact}
              className="w-full mt-3 bg-moni-accent/10 text-moni-accent px-4 py-2 rounded-xl text-xs font-semibold hover:bg-moni-accent/20 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-user-plus"></i>
              Ajouter aux contacts
            </button>
          </div>

          {/* QR Code */}
          <div className="mb-6">
            <p className="text-moni-gray text-xs font-semibold mb-2">Votre Code QR</p>
            {user?.qrCode ? (
              <div className="bg-moni-bg rounded-xl p-4 flex flex-col items-center border border-moni-accent/30">
                <img src={user.qrCode} alt="QR Code" className="w-40 h-40 rounded-lg mb-3" />
                <button
                  onClick={handleDownloadQR}
                  className="w-full bg-moni-accent text-moni-bg px-4 py-2 rounded-xl text-xs font-semibold hover:bg-moni-accent/90 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Télécharger
                </button>
              </div>
            ) : (
              <div className="bg-moni-bg rounded-xl p-4 text-center text-moni-gray text-xs">
                Génération du QR code...
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-moni-accent/10 rounded-xl p-3 border border-moni-accent/30">
            <p className="text-moni-gray text-xs">
              <i className="fas fa-info-circle text-moni-accent mr-2"></i>
              Partagez votre numéro Moni ou votre QR code pour recevoir des transferts
            </p>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onComplete}
          className="w-full bg-moni-accent text-moni-bg py-4 rounded-2xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 mt-auto"
        >
          Continuer vers le Dashboard
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
