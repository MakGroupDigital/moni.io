
export interface Transaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: string;
  icon: string;
  color: string;
  type: 'positive' | 'negative';
}

export interface FirestoreTransaction {
  id?: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'send' | 'receive' | 'p2p-send' | 'p2p-receive' | 'bill' | 'ussd';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  title: string;
  description: string;
  icon: string;
  color: string;
  recipientId?: string;
  recipientName?: string;
  recipientMoniNumber?: string;
  senderId?: string;
  senderName?: string;
  senderMoniNumber?: string;
  message?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id?: string;
  userId: string;
  type: 'transfer-received' | 'p2p-received' | 'p2p-request' | 'deposit-completed' | 'withdraw-completed' | 'bill-paid';
  title: string;
  message: string;
  amount?: number;
  senderName?: string;
  senderMoniNumber?: string;
  senderId?: string;
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  transactionId?: string;
}

export enum AppTab {
  HOME = 'home',
  STATS = 'stats',
  SCAN = 'scan',
  CARDS = 'cards',
  SETTINGS = 'settings'
}

export type Currency = 'USD' | 'EUR' | 'CDF' | 'XOF' | 'FCFA';

export interface UserProfile {
  name: string;
  balance: number;
  paypalBalance: number;
  currency: Currency;
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  CDF: 'FC',
  XOF: 'F',
  FCFA: 'F'
};

export interface PayPalAccount {
  email: string;
  balance: number;
  currency: string;
  isLinked: boolean;
}

export interface PayPalTransaction {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  type: 'withdrawal' | 'deposit';
}

export interface MoniUser {
  moniNumber: string;
  name: string;
  avatar?: string;
}

export interface TransferTransaction {
  id: string;
  recipientMoniNumber: string;
  recipientName: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  message?: string;
}

export interface BluetoothMoniUser {
  moniNumber: string;
  name: string;
  avatar?: string;
  distance?: string;
}

export interface P2PRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderMoniNumber?: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
  message?: string;
}

export interface Bill {
  id: string;
  provider: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  reference: string;
  icon: string;
  color: string;
}

export interface USSDCode {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  moniNumber: string;
  qrCode?: string;
  createdAt: Date;
  balance: number;
  paypalBalance: number;
}

export interface MonthlyStats {
  month: string;
  income: number;
  expense: number;
}

export type MobileMoneyOperator = 
  | 'orange-money' 
  | 'mtn-momo' 
  | 'airtel-money' 
  | 'vodafone-cash' 
  | 'mpesa' 
  | 'afrimoney' 
  | 'moov-money' 
  | 'wave' 
  | 'flutterwave' 
  | 'paytech';

export interface MobileMoneyProvider {
  id: MobileMoneyOperator;
  name: string;
  icon: string;
  color: string;
  countries: string[];
}

export const MOBILE_MONEY_PROVIDERS: Record<MobileMoneyOperator, MobileMoneyProvider> = {
  'orange-money': {
    id: 'orange-money',
    name: 'Orange Money',
    icon: 'fas fa-mobile-alt',
    color: '#FF6600',
    countries: ['Senegal', 'Mali', 'Ivory Coast', 'Cameroon', 'Guinea']
  },
  'mtn-momo': {
    id: 'mtn-momo',
    name: 'MTN Mobile Money',
    icon: 'fas fa-mobile-alt',
    color: '#FFCC00',
    countries: ['Ghana', 'Cameroon', 'Uganda', 'Rwanda', 'Zambia']
  },
  'airtel-money': {
    id: 'airtel-money',
    name: 'Airtel Money',
    icon: 'fas fa-mobile-alt',
    color: '#E60000',
    countries: ['Tanzania', 'Kenya', 'Uganda', 'Zambia', 'Malawi']
  },
  'vodafone-cash': {
    id: 'vodafone-cash',
    name: 'Vodafone Cash',
    icon: 'fas fa-mobile-alt',
    color: '#E60000',
    countries: ['Ghana', 'Egypt']
  },
  'mpesa': {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: 'fas fa-mobile-alt',
    color: '#00AA00',
    countries: ['Kenya', 'Tanzania', 'Uganda', 'Rwanda']
  },
  'afrimoney': {
    id: 'afrimoney',
    name: 'AfriMoney',
    icon: 'fas fa-mobile-alt',
    color: '#0066CC',
    countries: ['Benin', 'Togo', 'Burkina Faso']
  },
  'moov-money': {
    id: 'moov-money',
    name: 'Moov Money',
    icon: 'fas fa-mobile-alt',
    color: '#FF00FF',
    countries: ['Togo', 'Benin', 'Ivory Coast']
  },
  'wave': {
    id: 'wave',
    name: 'Wave',
    icon: 'fas fa-wave-square',
    color: '#0066FF',
    countries: ['Senegal', 'Mali', 'Ivory Coast', 'Burkina Faso']
  },
  'flutterwave': {
    id: 'flutterwave',
    name: 'Flutterwave',
    icon: 'fas fa-mobile-alt',
    color: '#7B61FF',
    countries: ['Nigeria', 'Ghana', 'Kenya', 'South Africa']
  },
  'paytech': {
    id: 'paytech',
    name: 'PayTech',
    icon: 'fas fa-mobile-alt',
    color: '#00AA00',
    countries: ['Senegal']
  }
};
