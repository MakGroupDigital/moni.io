
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Lun', value: 4000 },
  { name: 'Mar', value: 3000 },
  { name: 'Mer', value: 5000 },
  { name: 'Jeu', value: 2780 },
  { name: 'Ven', value: 1890 },
  { name: 'Sam', value: 2390 },
  { name: 'Dim', value: 3490 },
];

const Stats: React.FC = () => {
  return (
    <div className="px-5">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-moni-white font-montserrat">Analyses</h1>
          <p className="text-moni-gray text-xs">Aperçu de vos dépenses</p>
        </div>
        <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
      </header>

      {/* Period Selector */}
      <div className="flex gap-3 mb-8">
        {['Semaine', 'Mois', 'Année'].map((p, i) => (
          <button key={i} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${i === 0 ? 'bg-moni-accent text-moni-bg' : 'bg-moni-card text-moni-gray'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-moni-card rounded-3xl p-5 mb-8 border border-white/5 h-64 shadow-xl">
        <h3 className="text-moni-white text-xs font-semibold mb-4 uppercase tracking-wider text-moni-gray">Flux de trésorerie</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F5D4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00F5D4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A0AAB5', fontSize: 10}} dy={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1B263B', border: 'none', borderRadius: '12px', color: '#FFF' }}
              itemStyle={{ color: '#00F5D4' }}
            />
            <Area type="monotone" dataKey="value" stroke="#00F5D4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Categories */}
      <h3 className="text-moni-white font-semibold text-sm mb-4">Par Catégories</h3>
      <div className="space-y-4">
        {[
          { label: 'Alimentation', percentage: 45, color: '#00F5D4', icon: 'fas fa-hamburger' },
          { label: 'Divertissement', percentage: 25, color: '#FFD166', icon: 'fas fa-gamepad' },
          { label: 'Abonnements', percentage: 30, color: '#EF476F', icon: 'fas fa-tv' }
        ].map((cat, i) => (
          <div key={i} className="bg-moni-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg" style={{ color: cat.color }}>
              <i className={cat.icon}></i>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-moni-white text-xs font-medium">{cat.label}</span>
                <span className="text-moni-gray text-[10px] font-bold">{cat.percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stats;
