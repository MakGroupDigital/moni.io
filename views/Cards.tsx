
import React from 'react';

const Cards: React.FC = () => {
  return (
    <div className="px-5">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-moni-white font-montserrat">Mes Cartes</h1>
          <p className="text-moni-gray text-xs">Gérez vos paiements virtuels</p>
        </div>
        <div className="flex items-center gap-3">
          <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
          <button className="w-10 h-10 bg-moni-accent rounded-full flex items-center justify-center text-moni-bg shadow-lg shadow-moni-accent/30">
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </header>

      {/* The Main Virtual Card */}
      <div className="relative h-52 w-full rounded-[25px] overflow-hidden p-6 text-white mb-8 shadow-2xl shadow-black/40 border border-white/10" style={{ background: 'linear-gradient(135deg, #2D3436 0%, #000000 100%)' }}>
        {/* Chips and Logo */}
        <div className="flex justify-between items-start mb-8">
          <div className="w-12 h-10 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-md shadow-inner flex flex-col justify-around p-1">
             <div className="h-0.5 w-full bg-black/20"></div>
             <div className="h-0.5 w-full bg-black/20"></div>
             <div className="h-0.5 w-full bg-black/20"></div>
          </div>
          <h2 className="font-montserrat italic font-bold text-lg opacity-80">MONI.VIP</h2>
        </div>

        {/* Card Number */}
        <div className="mb-6">
          <p className="text-xs text-moni-gray mb-1 tracking-widest uppercase">Numéro de carte</p>
          <h3 className="text-lg font-mono tracking-[0.2em]">4532 •••• •••• 1089</h3>
        </div>

        {/* Card Footer */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[8px] text-moni-gray uppercase mb-0.5">Titulaire</p>
            <p className="text-xs font-semibold uppercase">Moussa Diop</p>
          </div>
          <div>
            <p className="text-[8px] text-moni-gray uppercase mb-0.5">Exp.</p>
            <p className="text-xs font-semibold">08/26</p>
          </div>
          <div className="flex -space-x-3">
            <div className="w-8 h-8 rounded-full bg-red-500/80"></div>
            <div className="w-8 h-8 rounded-full bg-yellow-500/80"></div>
          </div>
        </div>
        
        {/* Glass Decoration Overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
      </div>

      {/* Card Controls */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button className="bg-moni-card border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 group hover:bg-white/5 transition-colors">
          <i className="fas fa-lock text-moni-accent text-lg"></i>
          <span className="text-xs text-moni-white font-medium">Verrouiller</span>
        </button>
        <button className="bg-moni-card border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 group hover:bg-white/5 transition-colors">
          <i className="fas fa-eye text-moni-gray text-lg"></i>
          <span className="text-xs text-moni-white font-medium">Voir détails</span>
        </button>
      </div>

      {/* Limit Management */}
      <div className="bg-moni-card rounded-3xl p-6 border border-white/5">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-moni-white text-sm font-semibold">Limite mensuelle</h4>
          <span className="text-moni-accent text-xs font-bold">500 000 F</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-moni-accent rounded-full" style={{ width: '35%' }}></div>
        </div>
        <p className="text-moni-gray text-[10px]">175 000 F utilisés ce mois-ci</p>
      </div>
    </div>
  );
};

export default Cards;
