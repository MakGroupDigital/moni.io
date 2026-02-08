import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: 'fas fa-qrcode',
      title: 'Votre Numéro Moni',
      description: 'Chaque utilisateur reçoit un numéro unique pour recevoir de l\'argent',
      content: (
        <div className="bg-moni-card rounded-2xl p-6 border border-white/10">
          <p className="text-moni-gray text-xs mb-3">Votre numéro Moni</p>
          <p className="text-moni-white font-mono font-bold text-2xl text-center mb-6">{user?.moniNumber}</p>
          <p className="text-moni-gray text-xs text-center">Partagez ce numéro pour recevoir des transferts</p>
        </div>
      )
    },
    {
      icon: 'fas fa-qrcode',
      title: 'Votre Code QR',
      description: 'Partagez votre code QR pour que d\'autres vous trouvent facilement',
      content: (
        <div className="bg-moni-card rounded-2xl p-6 border border-white/10 flex flex-col items-center">
          {user?.qrCode && (
            <img src={user.qrCode} alt="QR Code" className="w-48 h-48 rounded-xl mb-4" />
          )}
          <p className="text-moni-gray text-xs text-center">Contient votre numéro Moni, email et nom</p>
        </div>
      )
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Sécurité',
      description: 'Vos données sont protégées par le chiffrement de bout en bout',
      content: (
        <div className="space-y-3">
          <div className="bg-moni-card rounded-2xl p-4 border border-white/10 flex items-start gap-3">
            <i className="fas fa-lock text-moni-accent text-lg mt-1"></i>
            <div>
              <h4 className="text-moni-white font-semibold text-sm">Authentification Sécurisée</h4>
              <p className="text-moni-gray text-xs">Connexion via Google avec 2FA</p>
            </div>
          </div>
          <div className="bg-moni-card rounded-2xl p-4 border border-white/10 flex items-start gap-3">
            <i className="fas fa-database text-moni-accent text-lg mt-1"></i>
            <div>
              <h4 className="text-moni-white font-semibold text-sm">Données Chiffrées</h4>
              <p className="text-moni-gray text-xs">Vos informations sont toujours protégées</p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: 'fas fa-rocket',
      title: 'Prêt à Commencer',
      description: 'Vous êtes maintenant prêt à utiliser Moni.io',
      content: (
        <div className="bg-gradient-to-br from-moni-accent/20 to-moni-accent/5 rounded-2xl p-8 border border-moni-accent/50 text-center">
          <i className="fas fa-check-circle text-moni-accent text-5xl mb-4"></i>
          <h3 className="text-moni-white font-bold text-lg mb-2">Bienvenue sur Moni.io!</h3>
          <p className="text-moni-gray text-sm">Commencez à gérer votre portefeuille dès maintenant</p>
        </div>
      )
    }
  ];

  const step = steps[currentStep];

  return (
    <div className="w-[375px] h-[812px] bg-moni-bg rounded-[40px] shadow-2xl shadow-moni-accent/10 relative overflow-hidden flex flex-col border-[6px] border-[#162130]">
      {/* Top Bar Decoration */}
      <div className="absolute top-0 left-0 w-full h-8 flex justify-center items-end pointer-events-none z-50">
        <div className="w-1/3 h-6 bg-[#162130] rounded-b-2xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-6 pt-16 pb-10">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-all ${
                idx <= currentStep ? 'bg-moni-accent' : 'bg-white/10'
              }`}
            ></div>
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-moni-accent/20 flex items-center justify-center text-moni-accent text-3xl">
            <i className={step.icon}></i>
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center mb-8">
          <h2 className="text-moni-white font-montserrat font-bold text-2xl mb-2">{step.title}</h2>
          <p className="text-moni-gray text-sm">{step.description}</p>
        </div>

        {/* Content */}
        <div className="flex-1 mb-8">
          {step.content}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Précédent
            </button>
          )}
          <button
            onClick={() => {
              if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1);
              } else {
                onComplete();
              }
            }}
            className="flex-1 bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95"
          >
            {currentStep === steps.length - 1 ? 'Commencer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
