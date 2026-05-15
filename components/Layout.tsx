
import React from 'react';
import { Home, PieChart, QrCode, Settings2, WalletCards, type LucideIcon } from 'lucide-react';
import { AppTab } from '../types';
import PersistentNotifications from './PersistentNotifications';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  depositModal?: React.ReactNode;
  withdrawModal?: React.ReactNode;
  paypalModal?: React.ReactNode;
  sendModal?: React.ReactNode;
  receiveModal?: React.ReactNode;
  p2pModal?: React.ReactNode;
  billsModal?: React.ReactNode;
  ussdModal?: React.ReactNode;
}

const NavGlyph: React.FC<{ icon: LucideIcon; active: boolean }> = ({ icon: Icon, active }) => (
  <span
    className={`relative flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
      active ? 'bg-moni-accent/15 shadow-[0_0_18px_rgba(0,245,212,0.20)]' : 'bg-transparent'
    }`}
  >
    {active && (
      <>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-moni-accent shadow-[0_0_10px_rgba(0,245,212,0.9)]" />
        <span className="absolute -bottom-0.5 h-0.5 w-3 rounded-full bg-moni-accent/80" />
      </>
    )}
    <Icon size={20} strokeWidth={active ? 2.7 : 2.3} className="transition-colors" />
  </span>
);

const Layout: React.FC<LayoutProps> = ({ children, currentTab, onTabChange, depositModal, withdrawModal, paypalModal, sendModal, receiveModal, p2pModal, billsModal, ussdModal }) => {
  const { user } = useAuth();
  const navItemClass = (tab: AppTab) => {
    const isActive = currentTab === tab;
    return `group h-12 min-w-12 px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
      isActive ? 'text-moni-accent bg-moni-accent/10' : 'text-moni-gray hover:text-moni-white'
    }`;
  };

  return (
    <div className="w-full h-screen bg-moni-bg relative overflow-hidden flex flex-col">
      {/* Logo Header with Gradient Background */}
      <header className="px-4 pt-3 pb-2">
        <div className="flex h-14 items-center justify-between rounded-[24px] border border-white/10 bg-moni-card/70 px-4 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moni-bg/70 border border-moni-accent/20 overflow-hidden">
              <img src="/onelogo.png" alt="Moni.io" className="h-9 w-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.22em] text-moni-accent font-semibold leading-none">Moni.io</p>
              <p className="text-moni-white text-xs font-semibold truncate mt-1">Votre argent, partout en Afrique</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex h-8 items-center gap-2 rounded-full bg-moni-bg/60 border border-white/5 px-3">
              <span className="h-2 w-2 rounded-full bg-moni-accent shadow-[0_0_10px_rgba(0,245,212,0.85)]" />
              <span className="text-[10px] font-semibold text-moni-gray">Connecté</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-moni-bg/70 border border-white/5 text-moni-accent">
              <i className="fas fa-shield-halved text-xs"></i>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-28 relative">
        {children}
        {depositModal}
        {withdrawModal}
        {paypalModal}
        {sendModal}
        {receiveModal}
        {p2pModal}
        {billsModal}
        {ussdModal}
        <PersistentNotifications userId={user?.uid} />
      </div>

      {/* Bottom Navigation */}
      <nav
        className="absolute left-4 right-4 z-40 flex h-[68px] items-center justify-between rounded-[28px] border border-white/10 bg-moni-card/85 px-3 shadow-2xl shadow-black/40 backdrop-blur-xl"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => onTabChange(AppTab.HOME)}
          className={navItemClass(AppTab.HOME)}
          type="button"
        >
          <NavGlyph icon={Home} active={currentTab === AppTab.HOME} />
          <span className="text-[9px] leading-none">Accueil</span>
        </button>

        <button
          onClick={() => onTabChange(AppTab.STATS)}
          className={navItemClass(AppTab.STATS)}
          type="button"
        >
          <NavGlyph icon={PieChart} active={currentTab === AppTab.STATS} />
          <span className="text-[9px] leading-none">Stats</span>
        </button>

        <button
          onClick={() => onTabChange(AppTab.SCAN)}
          className={`relative -top-5 flex h-[66px] w-[66px] items-center justify-center rounded-full border-[5px] border-moni-bg text-2xl text-moni-bg shadow-2xl shadow-moni-accent/45 transition-transform hover:scale-105 active:scale-95 ${
            currentTab === AppTab.SCAN ? 'bg-moni-accent ring-4 ring-moni-accent/20' : 'bg-moni-accent'
          }`}
          type="button"
          aria-label="Scanner"
        >
          <span className="relative flex h-11 w-11 items-center justify-center">
            <span className="absolute inset-0 rounded-[18px] bg-moni-bg/10" />
            <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-tl-md border-l-[2.5px] border-t-[2.5px] border-moni-bg" />
            <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-tr-md border-r-[2.5px] border-t-[2.5px] border-moni-bg" />
            <span className="absolute bottom-0 left-0 h-3.5 w-3.5 rounded-bl-md border-b-[2.5px] border-l-[2.5px] border-moni-bg" />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-br-md border-b-[2.5px] border-r-[2.5px] border-moni-bg" />
            <QrCode size={29} strokeWidth={2.8} className="relative z-10" />
          </span>
        </button>

        <button
          onClick={() => onTabChange(AppTab.CARDS)}
          className={navItemClass(AppTab.CARDS)}
          type="button"
        >
          <NavGlyph icon={WalletCards} active={currentTab === AppTab.CARDS} />
          <span className="text-[9px] leading-none">Cartes</span>
        </button>

        <button
          onClick={() => onTabChange(AppTab.SETTINGS)}
          className={navItemClass(AppTab.SETTINGS)}
          type="button"
        >
          <NavGlyph icon={Settings2} active={currentTab === AppTab.SETTINGS} />
          <span className="text-[9px] leading-none">Param.</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
