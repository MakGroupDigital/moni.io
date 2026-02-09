
import React from 'react';
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
  p2pModal?: React.ReactNode;
  billsModal?: React.ReactNode;
  ussdModal?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, currentTab, onTabChange, depositModal, withdrawModal, paypalModal, sendModal, p2pModal, billsModal, ussdModal }) => {
  const { user } = useAuth();

  return (
    <>
      {/* Desktop Version - avec wrapper mobile */}
      <div className="hidden md:flex w-[375px] h-[812px] bg-moni-bg rounded-[40px] shadow-2xl shadow-moni-accent/10 relative overflow-hidden flex-col border-[6px] border-[#162130] mx-auto">
        {/* Top Bar Decoration */}
        <div className="absolute top-0 left-0 w-full h-8 flex justify-center items-end pointer-events-none z-50">
          <div className="w-1/3 h-6 bg-[#162130] rounded-b-2xl"></div>
        </div>

        {/* Logo in Header */}
        <div className="absolute top-12 left-5 z-40">
          <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pt-10 pb-24 relative">
          {children}
          {depositModal}
          {withdrawModal}
          {paypalModal}
          {sendModal}
          {p2pModal}
          {billsModal}
          {ussdModal}
          <PersistentNotifications userId={user?.uid} />
        </div>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full h-24 glass flex justify-around items-center px-4 pb-2 border-t border-white/5 z-40">
          <button 
            onClick={() => onTabChange(AppTab.HOME)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.HOME ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-home text-xl"></i>
            <span className="text-[10px]">Accueil</span>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.STATS)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.STATS ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-chart-pie text-xl"></i>
            <span className="text-[10px]">Stats</span>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.SCAN)}
            className="relative w-14 h-14 bg-moni-accent rounded-full flex items-center justify-center text-moni-bg text-2xl shadow-lg shadow-moni-accent/40 border-4 border-moni-bg transition-transform hover:scale-105 active:scale-95 -top-3"
          >
            <i className="fas fa-qrcode"></i>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.CARDS)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.CARDS ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-wallet text-xl"></i>
            <span className="text-[10px]">Cartes</span>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.SETTINGS)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.SETTINGS ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-cog text-xl"></i>
            <span className="text-[10px]">Param.</span>
          </button>
        </nav>
      </div>

      {/* Mobile Version - fullscreen */}
      <div className="md:hidden w-full h-screen bg-moni-bg relative overflow-hidden flex flex-col">
        {/* Logo in Header */}
        <div className="pt-4 px-5 z-40">
          <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pb-24 relative">
          {children}
          {depositModal}
          {withdrawModal}
          {paypalModal}
          {sendModal}
          {p2pModal}
          {billsModal}
          {ussdModal}
          <PersistentNotifications userId={user?.uid} />
        </div>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full h-24 glass flex justify-around items-center px-4 pb-2 border-t border-white/5 z-40">
          <button 
            onClick={() => onTabChange(AppTab.HOME)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.HOME ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-home text-xl"></i>
            <span className="text-[10px]">Accueil</span>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.STATS)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.STATS ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-chart-pie text-xl"></i>
            <span className="text-[10px]">Stats</span>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.SCAN)}
            className="relative w-14 h-14 bg-moni-accent rounded-full flex items-center justify-center text-moni-bg text-2xl shadow-lg shadow-moni-accent/40 border-4 border-moni-bg transition-transform hover:scale-105 active:scale-95 -top-3"
          >
            <i className="fas fa-qrcode"></i>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.CARDS)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.CARDS ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-wallet text-xl"></i>
            <span className="text-[10px]">Cartes</span>
          </button>

          <button 
            onClick={() => onTabChange(AppTab.SETTINGS)}
            className={`flex flex-col items-center gap-1 transition-all ${currentTab === AppTab.SETTINGS ? 'text-moni-accent scale-110' : 'text-moni-gray'}`}
          >
            <i className="fas fa-cog text-xl"></i>
            <span className="text-[10px]">Param.</span>
          </button>
        </nav>
      </div>
    </>
  );
};

export default Layout;
