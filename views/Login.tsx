import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      if (!fbUser) {
        throw new Error('Connexion échouée');
      }

      // Le contexte d'authentification va créer le document utilisateur
      // On appelle juste onLoginSuccess pour fermer le Login
      onLoginSuccess();
    } catch (err) {
      console.error('Login error:', err);
      setError('Erreur lors de la connexion. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="w-[375px] h-[812px] bg-gradient-to-b from-moni-dark to-moni-bg rounded-[40px] shadow-2xl shadow-moni-accent/10 relative overflow-hidden flex flex-col border-[6px] border-[#162130]">
      {/* Top Bar Decoration */}
      <div className="absolute top-0 left-0 w-full h-8 flex justify-center items-end pointer-events-none z-50">
        <div className="w-1/3 h-6 bg-[#162130] rounded-b-2xl"></div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-40 h-40 bg-moni-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-5 w-32 h-32 bg-moni-accent/5 rounded-full blur-2xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-6 pt-20 pb-10">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img src="/onelogo.png" alt="Moni.io" className="h-24 w-auto" />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-moni-white font-montserrat font-bold text-3xl mb-3">Bienvenue</h1>
          <p className="text-moni-gray text-sm">Connectez-vous pour accéder à votre portefeuille</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-12 flex-1">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-moni-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
              <i className="fas fa-wallet text-moni-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-moni-white font-semibold text-sm">Portefeuille Sécurisé</h3>
              <p className="text-moni-gray text-xs">Gérez votre argent en toute sécurité</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-moni-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
              <i className="fas fa-paper-plane text-moni-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-moni-white font-semibold text-sm">Transferts Rapides</h3>
              <p className="text-moni-gray text-xs">Envoyez de l'argent instantanément</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-moni-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
              <i className="fas fa-mobile-alt text-moni-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-moni-white font-semibold text-sm">Mobile Money</h3>
              <p className="text-moni-gray text-xs">Intégration avec tous les opérateurs</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
            <p className="text-red-200 text-xs">{error}</p>
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-moni-accent text-moni-bg py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50 mb-4"
        >
          {loading ? (
            <>
              <i className="fas fa-spinner animate-spin"></i>
              Connexion en cours...
            </>
          ) : (
            <>
              <i className="fab fa-google"></i>
              Continuer avec Google
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-moni-gray text-xs text-center">
          En continuant, vous acceptez nos <span className="text-moni-accent cursor-pointer hover:underline">conditions d'utilisation</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
