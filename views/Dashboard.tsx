import React, { useState, useEffect } from 'react';
import { Transaction, CURRENCY_SYMBOLS, MonthlyStats } from '../types';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Dashboard: React.FC<{ onShowDeposit: () => void; onShowWithdraw: () => void; onShowPayPal: () => void; onShowSend: () => void; onShowP2P: () => void; onShowBills: () => void; onShowUSSD: () => void }> = ({ onShowDeposit, onShowWithdraw, onShowPayPal, onShowSend, onShowP2P, onShowBills, onShowUSSD }) => {
  const [showBalance, setShowBalance] = React.useState(true);
  const { currency } = useCurrency();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupérer les transactions de l'utilisateur
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const txs: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const txType = data.type;
        
        // Déterminer si c'est une transaction positive ou négative
        const isPositive = ['deposit', 'receive', 'p2p-receive'].includes(txType);
        
        // Convertir le timestamp Firestore en Date
        let dateObj: Date;
        if (data.timestamp?.toDate) {
          // C'est un Firestore Timestamp
          dateObj = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
          dateObj = data.timestamp;
        } else {
          dateObj = new Date(data.timestamp);
        }

        txs.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          amount: data.amount,
          date: dateObj.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          }),
          icon: data.icon,
          color: data.color,
          type: isPositive ? 'positive' : 'negative'
        });
      });

      setTransactions(txs);
    }, (error) => {
      console.error('Error listening to transactions:', error);
    });

    return unsubscribe;
  }, [user?.uid]);

  // Récupérer les statistiques mensuelles
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const statsMap = new Map<string, { income: number; expense: number }>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Convertir le timestamp Firestore en Date
        let dateObj: Date;
        if (data.timestamp?.toDate) {
          dateObj = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
          dateObj = data.timestamp;
        } else {
          dateObj = new Date(data.timestamp);
        }

        const monthKey = dateObj.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

        if (!statsMap.has(monthKey)) {
          statsMap.set(monthKey, { income: 0, expense: 0 });
        }

        const stats = statsMap.get(monthKey)!;
        const txType = data.type;
        const isPositive = ['deposit', 'receive', 'p2p-receive'].includes(txType);
        
        if (isPositive) {
          stats.income += data.amount;
        } else {
          stats.expense += data.amount;
        }
      });

      const stats: MonthlyStats[] = Array.from(statsMap.entries())
        .map(([month, { income, expense }]) => ({
          month,
          income,
          expense
        }))
        .slice(-6); // Derniers 6 mois

      setMonthlyStats(stats);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to monthly stats:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  const userBalance = user?.balance || 0;
  const paypalBalance = user?.paypalBalance || 0;

  return (
    <>
      <div className="px-5">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-moni-card border-2 border-moni-accent/20 flex items-center justify-center text-moni-accent overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-white font-bold"
                  style={{
                    backgroundImage: `url('https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=00F5D4&color=050A10&bold=true')`
                  }}
                />
              )}
            </div>
            <div>
              <h3 className="text-moni-gray text-xs">Bonjour,</h3>
              <span className="text-moni-white font-semibold text-sm">{user?.displayName || 'Utilisateur'}</span>
            </div>
          </div>
          <button className="relative text-moni-white text-xl">
            <i className="far fa-bell"></i>
            <div className="absolute top-0 right-0 w-2 h-2 bg-moni-accent rounded-full border border-moni-bg"></div>
          </button>
        </header>

        {/* Balance Card - Moni.io Premium Card */}
        <div className="relative mb-6 h-48 group">
          {/* Card Background - Premium Design */}
          <div className="absolute inset-0 bg-gradient-to-br from-moni-accent via-moni-accent/80 to-moni-dark rounded-3xl shadow-2xl shadow-moni-accent/30 overflow-hidden">
            {/* Subtle animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -ml-12 -mb-12"></div>

            {/* Card Content */}
            <div className="relative h-full flex flex-col justify-between p-6 text-white">
              {/* Top - Logo and Balance */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/70 text-[10px] uppercase tracking-widest font-semibold">Solde disponible</p>
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      <i className={`fas fa-${showBalance ? 'eye' : 'eye-slash'}`}></i>
                    </button>
                  </div>
                  <h2 className="font-montserrat text-lg font-bold tracking-tight">
                    {showBalance ? userBalance.toLocaleString() : '••••••'}
                  </h2>
                  <p className="text-white/60 text-xs mt-1">{currency}</p>
                </div>
                <img src="/onelogo.png" alt="Moni.io" className="h-28 w-auto" />
              </div>

              {/* Bottom - Minimal Info */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/60 text-xs">{user?.displayName || 'Utilisateur'}</p>
                </div>
                <div className="text-right">
                  <p className="font-montserrat font-bold text-sm text-white/80">{user?.moniNumber}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PayPal Integration */}
        {paypalBalance > 0 && (
          <div className="paypal-gradient rounded-2xl p-5 flex justify-between items-center mb-6 shadow-lg shadow-blue-500/20">
            <div>
              <h4 className="font-montserrat font-bold text-white text-sm mb-1">PayPal Disponible</h4>
              <p className="text-white/80 text-[10px]">Solde détecté : <strong className="text-white">${paypalBalance.toFixed(2)}</strong></p>
            </div>
            <button 
              onClick={onShowPayPal}
              className="bg-white text-[#0070BA] px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform hover:bg-white/90"
            >
              Récupérer
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-6">
          <button 
            onClick={onShowDeposit}
            className="flex items-center gap-2 bg-moni-accent/10 text-moni-accent px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-moni-accent hover:text-moni-bg transition-all active:scale-95 border border-moni-accent/30"
          >
            <i className="fas fa-plus"></i> Dépôt
          </button>
          <button 
            onClick={onShowWithdraw}
            className="flex items-center gap-2 bg-white/5 text-moni-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-white/10 transition-all active:scale-95 border border-white/10"
          >
            <i className="fas fa-arrow-right"></i> Retrait
          </button>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: 'fas fa-paper-plane', label: 'Envoyer', color: '#00F5D4', action: onShowSend },
            { icon: 'fas fa-users', label: 'P2P', color: '#FFD166', action: onShowP2P },
            { icon: 'fas fa-file-invoice-dollar', label: 'Factures', color: '#EF476F', action: onShowBills },
            { icon: 'fas fa-mobile-alt', label: 'USSD', color: '#118AB2', action: onShowUSSD }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={item.action}>
              <div className="w-[55px] h-[55px] bg-moni-card rounded-2xl flex items-center justify-center text-xl transition-all group-hover:-translate-y-1 group-hover:bg-moni-accent group-hover:text-moni-bg shadow-lg shadow-black/20" style={{ color: item.color }}>
                <i className={item.icon}></i>
              </div>
              <span className="text-moni-gray text-[10px]">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Monthly Stats */}
        {monthlyStats.length > 0 && (
          <div className="mb-8">
            <h3 className="text-moni-white font-semibold text-sm mb-4">Statistiques</h3>
            <div className="bg-moni-card rounded-2xl p-4 border border-white/10">
              <div className="space-y-3">
                {monthlyStats.map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-moni-gray text-xs">{stat.month}</span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-moni-success text-xs font-semibold">+{stat.income.toLocaleString()}</p>
                        <p className="text-red-400 text-xs">-{stat.expense.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-moni-white font-semibold text-sm">Activités récentes</h3>
          <button className="text-moni-accent text-[11px] font-medium">Tout voir</button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-moni-gray text-xs">Chargement des transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-moni-gray text-xs">Aucune transaction pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center pb-4 border-b border-white/5 last:border-none">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-lg" style={{ color: tx.color }}>
                    <i className={tx.icon}></i>
                  </div>
                  <div>
                    <h4 className="text-moni-white text-sm font-medium">{tx.title}</h4>
                    <p className="text-moni-gray text-[10px]">{tx.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className={`text-sm font-bold ${tx.type === 'positive' ? 'text-moni-success' : 'text-moni-white'}`}>
                    {tx.type === 'positive' ? '+' : '-'} {tx.amount.toLocaleString()} {CURRENCY_SYMBOLS[currency]}
                  </h4>
                  <p className="text-moni-gray text-[10px]">{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
