import React, { useState } from 'react';
import { USSDCode } from '../types';

interface USSDModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type USSDStep = 'list' | 'confirm' | 'processing' | 'success';

const USSDModal: React.FC<USSDModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<USSDStep>('list');
  const [selectedUSSD, setSelectedUSSD] = useState<USSDCode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const ussdCodes: USSDCode[] = [
    {
      id: '1',
      name: 'Vérifier le solde',
      code: '*144#',
      description: 'Consultez votre solde Moni',
      icon: 'fas fa-wallet',
      color: '#00F5D4'
    },
    {
      id: '2',
      name: 'Envoyer de l\'argent',
      code: '*144*1*',
      description: 'Transférer de l\'argent par USSD',
      icon: 'fas fa-arrow-right',
      color: '#FFD166'
    },
    {
      id: '3',
      name: 'Retirer de l\'argent',
      code: '*144*2*',
      description: 'Retirer vers votre compte',
      icon: 'fas fa-arrow-left',
      color: '#EF476F'
    },
    {
      id: '4',
      name: 'Historique',
      code: '*144*3*',
      description: 'Voir vos dernières transactions',
      icon: 'fas fa-history',
      color: '#118AB2'
    },
    {
      id: '5',
      name: 'Changer le PIN',
      code: '*144*4*',
      description: 'Modifier votre code de sécurité',
      icon: 'fas fa-lock',
      color: '#9D4EDD'
    },
    {
      id: '6',
      name: 'Support client',
      code: '*144*5*',
      description: 'Contacter le service client',
      icon: 'fas fa-headset',
      color: '#3A86FF'
    }
  ];

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('list');
    setSelectedUSSD(null);
    setIsProcessing(false);
    onClose();
  };

  const handleExecuteUSSD = async () => {
    if (!selectedUSSD) return;

    setIsProcessing(true);
    setStep('processing');

    // Simulation de l'exécution USSD
    setTimeout(() => {
      setStep('success');
      setIsProcessing(false);
    }, 2000);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">USSD</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'list' && (
          <>
            <div className="bg-moni-bg rounded-2xl p-4 mb-6 border border-white/10">
              <p className="text-moni-gray text-xs">
                <i className="fas fa-info-circle mr-2"></i>
                Codes USSD pour accéder à Moni sans internet
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {ussdCodes.map((ussd) => (
                <button
                  key={ussd.id}
                  onClick={() => {
                    setSelectedUSSD(ussd);
                    setStep('confirm');
                  }}
                  className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-lg" style={{ color: ussd.color }}>
                      <i className={ussd.icon}></i>
                    </div>
                    <div className="text-left">
                      <h4 className="text-moni-white font-semibold text-sm">{ussd.name}</h4>
                      <p className="text-moni-gray text-xs">{ussd.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-moni-accent font-mono font-bold text-sm">{ussd.code}</p>
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

        {step === 'confirm' && selectedUSSD && (
          <>
            <div className="bg-moni-bg rounded-2xl p-6 mb-6 border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl" style={{ color: selectedUSSD.color }}>
                  <i className={selectedUSSD.icon}></i>
                </div>
                <div>
                  <h3 className="text-moni-white font-bold text-lg">{selectedUSSD.name}</h3>
                  <p className="text-moni-gray text-xs">{selectedUSSD.description}</p>
                </div>
              </div>

              <div className="bg-moni-accent/20 rounded-xl p-4 border border-moni-accent/50">
                <p className="text-moni-gray text-xs mb-2">Code USSD</p>
                <div className="flex items-center justify-between">
                  <p className="text-moni-white font-mono font-bold text-lg">{selectedUSSD.code}</p>
                  <button
                    onClick={() => copyToClipboard(selectedUSSD.code)}
                    className="p-2 bg-moni-accent/30 hover:bg-moni-accent/50 rounded-lg transition-all"
                  >
                    <i className="fas fa-copy text-moni-accent text-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-6">
              <p className="text-blue-200 text-xs">
                <i className="fas fa-lightbulb mr-2"></i>
                Composez le code USSD sur votre téléphone pour accéder à ce service
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('list')}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleExecuteUSSD}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Exécution...' : 'Exécuter'}
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Exécution en cours</h3>
            <p className="text-moni-gray text-xs text-center">Veuillez patienter...</p>
          </div>
        )}

        {step === 'success' && selectedUSSD && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Code copié</h3>
            <p className="text-moni-gray text-xs text-center mb-6">
              Composez {selectedUSSD.code} sur votre téléphone
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

export default USSDModal;
