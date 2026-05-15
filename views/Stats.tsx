import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { CURRENCY_SYMBOLS, FirestoreTransaction } from '../types';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';

type Period = 'week' | 'month' | 'year';

interface ChartPoint {
  name: string;
  value: number;
  income: number;
  expense: number;
}

interface CategoryPoint {
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

const positiveTypes = ['deposit', 'receive', 'p2p-receive'];
const expenseTypes = ['withdraw', 'send', 'p2p-send', 'bill'];

const periodLabels: Record<Period, string> = {
  week: 'Semaine',
  month: 'Mois',
  year: 'Année'
};

const categoryMeta: Record<string, { label: string; color: string; icon: string }> = {
  bill: { label: 'Factures', color: '#EF476F', icon: 'fas fa-file-invoice-dollar' },
  withdraw: { label: 'Retraits', color: '#118AB2', icon: 'fas fa-wallet' },
  send: { label: 'Transferts', color: '#00F5D4', icon: 'fas fa-paper-plane' },
  'p2p-send': { label: 'P2P', color: '#FFD166', icon: 'fas fa-users' },
  other: { label: 'Autres', color: '#A0AAB5', icon: 'fas fa-circle' }
};

const toDate = (value: any): Date => {
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getPeriodStart = (period: Period) => {
  const now = new Date();
  if (period === 'week') {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(now.getFullYear(), 0, 1);
};

const buildChartPoints = (transactions: FirestoreTransaction[], period: Period): ChartPoint[] => {
  const now = new Date();
  const buckets = new Map<string, ChartPoint>();

  if (period === 'week') {
    for (let index = 6; index >= 0; index -= 1) {
      const date = startOfDay(now);
      date.setDate(date.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, {
        name: date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
        value: 0,
        income: 0,
        expense: 0
      });
    }
  }

  if (period === 'month') {
    const daysInMonth = now.getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, {
        name: String(day).padStart(2, '0'),
        value: 0,
        income: 0,
        expense: 0
      });
    }
  }

  if (period === 'year') {
    for (let month = 0; month <= now.getMonth(); month += 1) {
      const date = new Date(now.getFullYear(), month, 1);
      const key = `${date.getFullYear()}-${String(month + 1).padStart(2, '0')}`;
      buckets.set(key, {
        name: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
        value: 0,
        income: 0,
        expense: 0
      });
    }
  }

  transactions.forEach((transaction) => {
    const date = toDate(transaction.timestamp);
    const key = period === 'year'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : startOfDay(date).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return;

    if (positiveTypes.includes(transaction.type)) {
      bucket.income += Number(transaction.amount || 0);
    } else if (expenseTypes.includes(transaction.type)) {
      bucket.expense += Number(transaction.amount || 0);
    }
    bucket.value = bucket.income - bucket.expense;
  });

  return Array.from(buckets.values());
};

const buildCategories = (transactions: FirestoreTransaction[]): CategoryPoint[] => {
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (!expenseTypes.includes(transaction.type)) return;
    const key = transaction.type in categoryMeta ? transaction.type : 'other';
    totals.set(key, (totals.get(key) || 0) + Number(transaction.amount || 0));
  });

  const totalExpense = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  if (totalExpense <= 0) return [];

  return Array.from(totals.entries())
    .map(([key, amount]) => {
      const meta = categoryMeta[key] || categoryMeta.other;
      return {
        ...meta,
        amount,
        percentage: Math.round((amount / totalExpense) * 100)
      };
    })
    .sort((a, b) => b.amount - a.amount);
};

const Stats: React.FC = () => {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const [period, setPeriod] = useState<Period>('week');
  const [transactions, setTransactions] = useState<FirestoreTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data()
        })) as FirestoreTransaction[];
        setTransactions(items.filter((transaction) => transaction.status === 'completed'));
        setError('');
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Stats transactions error:', snapshotError);
        setError('Impossible de charger les statistiques.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const filteredTransactions = useMemo(() => {
    const start = getPeriodStart(period);
    return transactions.filter((transaction) => toDate(transaction.timestamp) >= start);
  }, [period, transactions]);

  const chartData = useMemo(() => buildChartPoints(filteredTransactions, period), [filteredTransactions, period]);
  const categories = useMemo(() => buildCategories(filteredTransactions), [filteredTransactions]);
  const incomeTotal = filteredTransactions
    .filter((transaction) => positiveTypes.includes(transaction.type))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const expenseTotal = filteredTransactions
    .filter((transaction) => expenseTypes.includes(transaction.type))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const netTotal = incomeTotal - expenseTotal;

  return (
    <div className="px-5">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-moni-white font-montserrat">Analyses</h1>
          <p className="text-moni-gray text-xs">Données réelles du portefeuille</p>
        </div>
        <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
      </header>

      <div className="flex gap-3 mb-6">
        {(Object.keys(periodLabels) as Period[]).map((item) => (
          <button
            key={item}
            onClick={() => setPeriod(item)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              period === item ? 'bg-moni-accent text-moni-bg' : 'bg-moni-card text-moni-gray'
            }`}
            type="button"
          >
            {periodLabels[item]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-moni-card rounded-2xl p-3 border border-white/5">
          <p className="text-moni-gray text-[10px] mb-1">Entrées</p>
          <p className="text-moni-success text-sm font-bold">{symbol}{incomeTotal.toLocaleString()}</p>
        </div>
        <div className="bg-moni-card rounded-2xl p-3 border border-white/5">
          <p className="text-moni-gray text-[10px] mb-1">Sorties</p>
          <p className="text-red-300 text-sm font-bold">{symbol}{expenseTotal.toLocaleString()}</p>
        </div>
        <div className="bg-moni-card rounded-2xl p-3 border border-white/5">
          <p className="text-moni-gray text-[10px] mb-1">Net</p>
          <p className={`text-sm font-bold ${netTotal >= 0 ? 'text-moni-accent' : 'text-red-300'}`}>
            {symbol}{netTotal.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-moni-card rounded-3xl p-5 mb-8 border border-white/5 h-64 shadow-xl">
        <h3 className="text-moni-gray text-xs font-semibold mb-4 uppercase tracking-wider">Flux de trésorerie</h3>
        {loading ? (
          <div className="h-44 flex items-center justify-center text-moni-gray text-xs">Chargement...</div>
        ) : error ? (
          <div className="h-44 flex items-center justify-center text-red-200 text-xs">{error}</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-moni-gray text-xs text-center">
            Aucune transaction finalisée sur cette période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F5D4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00F5D4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A0AAB5', fontSize: 10}} dy={10} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#1B263B', border: 'none', borderRadius: '12px', color: '#FFF' }}
                itemStyle={{ color: '#00F5D4' }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { value: 'Net', income: 'Entrées', expense: 'Sorties' };
                  return [`${symbol}${Number(value).toLocaleString()}`, labels[name] || name];
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#00F5D4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <h3 className="text-moni-white font-semibold text-sm mb-4">Par catégories</h3>
      <div className="space-y-4">
        {loading ? (
          <div className="bg-moni-card rounded-2xl p-4 text-moni-gray text-xs text-center">Chargement...</div>
        ) : categories.length === 0 ? (
          <div className="bg-moni-card rounded-2xl p-4 text-moni-gray text-xs text-center">
            Aucune sortie finalisée sur cette période
          </div>
        ) : categories.map((category) => (
          <div key={category.label} className="bg-moni-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg" style={{ color: category.color }}>
              <i className={category.icon}></i>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-moni-white text-xs font-medium">{category.label}</span>
                <span className="text-moni-gray text-[10px] font-bold">
                  {category.percentage}% · {symbol}{category.amount.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${category.percentage}%`, backgroundColor: category.color }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stats;
