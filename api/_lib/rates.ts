export type SupportedCurrency = 'USD' | 'EUR' | 'CDF' | 'XOF' | 'FCFA';

export interface ConversionResult {
  amount: number;
  rate: number;
  provider: string;
  providerUrl: string;
  updatedAt: string;
  sourceCurrency: SupportedCurrency;
  targetCurrency: SupportedCurrency;
}

const RATE_PROVIDER = 'ExchangeRate-API';
const DEFAULT_RATE_API_URL = 'https://open.er-api.com/v6/latest';

function apiCurrency(currency: SupportedCurrency) {
  return currency === 'FCFA' ? 'XOF' : currency;
}

function roundForCurrency(amount: number, currency: SupportedCurrency) {
  if (['CDF', 'XOF', 'FCFA'].includes(currency)) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

async function fetchRates(baseCurrency: string) {
  const baseUrl = process.env.EXCHANGE_RATE_API_URL || DEFAULT_RATE_API_URL;
  const providerUrl = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(baseCurrency)}`;
  const response = await fetch(providerUrl, {
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.rates) {
    throw new Error('Impossible de récupérer le taux de change du jour.');
  }

  return { payload, providerUrl };
}

export async function convertAmount(
  amount: number,
  sourceCurrency: SupportedCurrency,
  targetCurrency: SupportedCurrency
): Promise<ConversionResult> {
  if (sourceCurrency === targetCurrency) {
    return {
      amount: roundForCurrency(amount, targetCurrency),
      rate: 1,
      provider: RATE_PROVIDER,
      providerUrl: process.env.EXCHANGE_RATE_API_URL || DEFAULT_RATE_API_URL,
      updatedAt: new Date().toISOString(),
      sourceCurrency,
      targetCurrency,
    };
  }

  const source = apiCurrency(sourceCurrency);
  const target = apiCurrency(targetCurrency);

  const direct = await fetchRates(source);
  const directRate = Number(direct.payload.rates?.[target]);

  if (Number.isFinite(directRate) && directRate > 0) {
    return {
      amount: roundForCurrency(amount * directRate, targetCurrency),
      rate: directRate,
      provider: RATE_PROVIDER,
      providerUrl: direct.providerUrl,
      updatedAt: String(direct.payload.time_last_update_utc || direct.payload.time_last_update_unix || ''),
      sourceCurrency,
      targetCurrency,
    };
  }

  const usd = await fetchRates('USD');
  const sourcePerUsd = source === 'USD' ? 1 : Number(usd.payload.rates?.[source]);
  const targetPerUsd = target === 'USD' ? 1 : Number(usd.payload.rates?.[target]);

  if (!Number.isFinite(sourcePerUsd) || !Number.isFinite(targetPerUsd) || sourcePerUsd <= 0 || targetPerUsd <= 0) {
    throw new Error('Taux de change indisponible pour cette devise.');
  }

  const rate = targetPerUsd / sourcePerUsd;
  return {
    amount: roundForCurrency(amount * rate, targetCurrency),
    rate,
    provider: RATE_PROVIDER,
    providerUrl: usd.providerUrl,
    updatedAt: String(usd.payload.time_last_update_utc || usd.payload.time_last_update_unix || ''),
    sourceCurrency,
    targetCurrency,
  };
}
