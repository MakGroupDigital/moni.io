import { AuthUser, Currency } from '../types';

export interface PaymentLinkPayload {
  recipientMoniNumber: string;
  amount?: number;
  currency?: Currency;
  note?: string;
}

const MONI_NUMBER_REGEX = /MN1000\d+/i;

const cleanAmount = (amount?: number) => {
  if (!amount || !Number.isFinite(amount) || amount <= 0) return undefined;
  return Number(amount.toFixed(2));
};

export const extractMoniNumber = (value: string) => {
  return value.match(MONI_NUMBER_REGEX)?.[0]?.toUpperCase() || '';
};

export const getPaymentLinkOrigin = () => {
  if (typeof window === 'undefined') return 'https://moni.io';
  return window.location.origin;
};

export const buildPaymentLink = ({
  origin = getPaymentLinkOrigin(),
  recipientMoniNumber,
  amount,
  currency,
  note,
}: PaymentLinkPayload & { origin?: string }) => {
  const moniNumber = extractMoniNumber(recipientMoniNumber);
  const url = new URL(`/p/${moniNumber}`, origin);
  const fixedAmount = cleanAmount(amount);

  if (fixedAmount) {
    url.searchParams.set('a', String(fixedAmount));
  }

  if (currency) {
    url.searchParams.set('c', currency);
  }

  if (note?.trim()) {
    url.searchParams.set('r', note.trim().slice(0, 80));
  }

  return url.toString();
};

export const buildPaymentLinkForUser = (user: AuthUser, amount?: number, currency?: Currency, note?: string) => {
  return buildPaymentLink({
    recipientMoniNumber: user.moniNumber,
    amount,
    currency,
    note,
  });
};

export const parsePaymentLink = (pathname: string, search = ''): PaymentLinkPayload | null => {
  const recipientMoniNumber = extractMoniNumber(decodeURIComponent(pathname));

  if (!recipientMoniNumber) {
    return null;
  }

  const params = new URLSearchParams(search);
  const amount = cleanAmount(Number(params.get('a') || params.get('amount') || 0));
  const currencyParam = String(params.get('c') || params.get('currency') || '').toUpperCase();
  const currency = ['USD', 'EUR', 'CDF', 'XOF', 'FCFA'].includes(currencyParam)
    ? (currencyParam as Currency)
    : undefined;

  return {
    recipientMoniNumber,
    amount,
    currency,
    note: params.get('r') || params.get('note') || undefined,
  };
};
