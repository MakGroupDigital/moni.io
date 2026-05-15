import React, { useEffect, useMemo, useState } from 'react';

type InstallOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
  prompt: () => Promise<void>;
}

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
};

const isIosDevice = () => {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
};

const PWAInstallModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const dismissedThisSession = sessionStorage.getItem('moni_pwa_install_dismissed') === '1';
    const showTimer = window.setTimeout(() => {
      if (!dismissedThisSession && !isStandaloneMode()) {
        setVisible(true);
        setManualMode(!deferredPrompt);
      }
    }, 1200);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setManualMode(false);

      if (!dismissedThisSession && !isStandaloneMode()) {
        setVisible(true);
      }
    };

    const handleAppInstalled = () => {
      localStorage.setItem('moni_pwa_installed', '1');
      setIsInstalled(true);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const close = () => {
    sessionStorage.setItem('moni_pwa_install_dismissed', '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) {
      setManualMode(true);
      return;
    }

    setIsPrompting(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);

      if (choice.outcome === 'accepted') {
        localStorage.setItem('moni_pwa_installed', '1');
        setVisible(false);
      } else {
        setManualMode(true);
      }
    } finally {
      setIsPrompting(false);
    }
  };

  if (!visible || isInstalled) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <div className="relative w-full max-w-sm bg-moni-card border border-moni-accent/20 rounded-3xl p-5 shadow-2xl shadow-black/40">
        <button
          onClick={close}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 text-moni-white hover:bg-white/20 transition-colors"
          type="button"
          aria-label="Fermer"
        >
          <i className="fas fa-times text-sm"></i>
        </button>

        <div className="flex items-center gap-3 pr-10">
          <div className="w-14 h-14 rounded-2xl bg-moni-bg border border-moni-accent/30 flex items-center justify-center overflow-hidden">
            <img src="/onelogo.png" alt="Moni.io" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <p className="text-moni-accent text-[10px] font-bold uppercase tracking-widest">Installation</p>
            <h2 id="pwa-install-title" className="text-moni-white font-montserrat font-bold text-lg">Installer Moni.io</h2>
          </div>
        </div>

        <p id="pwa-install-description" className="text-moni-gray text-xs mt-4 leading-relaxed">
          Accédez à Moni.io depuis l’écran d’accueil avec une expérience plus rapide et plus stable.
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { icon: 'fas fa-bolt', label: 'Rapide' },
            { icon: 'fas fa-lock', label: 'Sécurisé' },
            { icon: 'fas fa-mobile-screen', label: 'Mobile' },
          ].map((item) => (
            <div key={item.label} className="bg-moni-bg rounded-2xl p-3 text-center border border-white/5">
              <i className={`${item.icon} text-moni-accent text-base`}></i>
              <p className="text-moni-gray text-[10px] mt-2">{item.label}</p>
            </div>
          ))}
        </div>

        {(manualMode || isIos) && (
          <div className="mt-4 bg-moni-bg border border-white/10 rounded-2xl p-4">
            <p className="text-moni-white text-xs font-semibold mb-3">
              {isIos ? 'Installation sur iPhone/iPad' : 'Installation manuelle'}
            </p>
            <ol className="space-y-2 text-moni-gray text-xs">
              {isIos ? (
                <>
                  <li>1. Appuyez sur le bouton Partager de Safari.</li>
                  <li>2. Choisissez “Sur l’écran d’accueil”.</li>
                  <li>3. Validez avec “Ajouter”.</li>
                </>
              ) : (
                <>
                  <li>1. Ouvrez le menu du navigateur.</li>
                  <li>2. Choisissez “Installer l’application” ou “Ajouter à l’écran d’accueil”.</li>
                  <li>3. Confirmez l’installation.</li>
                </>
              )}
            </ol>
          </div>
        )}

        <button
          onClick={install}
          disabled={isPrompting}
          className="w-full mt-5 bg-moni-accent text-moni-bg py-3 rounded-2xl font-bold text-sm hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-60"
          type="button"
        >
          {deferredPrompt && !isIos ? (isPrompting ? 'Ouverture...' : 'Installer maintenant') : 'Voir comment installer'}
        </button>
      </div>
    </div>
  );
};

export default PWAInstallModal;
