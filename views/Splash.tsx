import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SplashProps {
  onComplete: (isAuthenticated: boolean, onboardingCompleted: boolean) => void;
}

const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [canRedirect, setCanRedirect] = useState(false);

  // Attendre 5 secondes avant de permettre la redirection
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanRedirect(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Rediriger une fois que 5 secondes sont écoulées ET que l'authentification est vérifiée
  useEffect(() => {
    if (canRedirect && !loading) {
      const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
      onComplete(!!user, onboardingCompleted);
    }
  }, [canRedirect, loading, user, onComplete]);

  // Afficher les étapes de fonctionnalités pendant le chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < 3) {
        setStep(step + 1);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [step]);

  const features = [
    {
      icon: 'fas fa-wallet',
      title: 'Portefeuille Sécurisé',
      description: 'Gérez votre argent en toute sécurité'
    },
    {
      icon: 'fas fa-paper-plane',
      title: 'Transferts Rapides',
      description: 'Envoyez de l\'argent instantanément'
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'Mobile Money',
      description: 'Intégration avec tous les opérateurs'
    },
    {
      icon: 'fas fa-arrow-down',
      title: 'Retrait PayPal',
      description: 'Retirez directement vers PayPal'
    }
  ];

  const currentFeature = features[step];

  return (
    <div className="w-[375px] h-[812px] bg-gradient-to-b from-moni-dark to-moni-bg rounded-[40px] shadow-2xl shadow-moni-accent/10 relative overflow-hidden flex flex-col items-center justify-center border-[6px] border-[#162130]">
      {/* Top Bar Decoration */}
      <div className="absolute top-0 left-0 w-full h-8 flex justify-center items-end pointer-events-none z-50">
        <div className="w-1/3 h-6 bg-[#162130] rounded-b-2xl"></div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-40 h-40 bg-moni-accent/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-5 w-32 h-32 bg-moni-accent/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {step === 0 ? (
          <>
            {/* Logo */}
            <div className="animate-bounce">
              <img src="/onelogo.png" alt="Moni.io" className="h-32 w-auto drop-shadow-lg" />
            </div>

            {/* Loading Indicator */}
            <div className="flex gap-2 mt-8">
              <div className="w-2 h-2 bg-moni-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-moni-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-moni-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </>
        ) : (
          <>
            {/* Feature Icon */}
            <div className="w-20 h-20 rounded-3xl bg-moni-accent/20 flex items-center justify-center text-moni-accent text-4xl animate-bounce">
              <i className={currentFeature.icon}></i>
            </div>

            {/* Feature Title */}
            <div className="text-center">
              <h2 className="text-moni-white font-montserrat font-bold text-2xl mb-2">{currentFeature.title}</h2>
              <p className="text-moni-gray text-sm">{currentFeature.description}</p>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-2 mt-8">
              {features.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === step ? 'w-8 bg-moni-accent' : 'w-2 bg-white/20'
                  }`}
                ></div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Splash;
