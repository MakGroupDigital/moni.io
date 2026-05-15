export type MaxiCashEnvironment = 'sandbox' | 'live';
export type MaxiCashPaymentCurrency = 'USD' | 'CDF';
export type MaxiCashOperator = 'airtel' | 'mpesa' | 'orange' | 'africell';

export interface MaxiCashConfig {
  environment: MaxiCashEnvironment;
  merchantId: string;
  merchantPassword: string;
  payNowSyncUrl: string;
  checkPaymentStatusByReferenceUrl: string;
  africellPayType: number;
}

export interface MaxiCashCallResult {
  ok: boolean;
  payload: Record<string, any> | null;
  status: string;
  errorMessage: string;
}

const DEFAULT_LIVE_WEBAPI = 'https://webapi.maxicashapp.com';
const DEFAULT_SANDBOX_WEBAPI = 'https://webapi-test.maxicashapp.com';

export const MAXICASH_OPERATORS: Record<MaxiCashOperator, { label: string; payType: number }> = {
  airtel: { label: 'Airtel Money', payType: 1 },
  mpesa: { label: 'M-Pesa', payType: 2 },
  orange: { label: 'Orange Money', payType: 3 },
  africell: { label: 'Africell Money', payType: 52 },
};

export function getMaxiCashConfig(): MaxiCashConfig {
  const environment = (process.env.MAXICASH_ENV === 'live' ? 'live' : 'sandbox') as MaxiCashEnvironment;
  const webapiBaseUrl = environment === 'live' ? DEFAULT_LIVE_WEBAPI : DEFAULT_SANDBOX_WEBAPI;

  return {
    environment,
    merchantId: process.env.MAXICASH_MERCHANT_ID || '',
    merchantPassword: process.env.MAXICASH_MERCHANT_PASSWORD || '',
    payNowSyncUrl: process.env.MAXICASH_PAY_NOW_SYNC_URL || `${webapiBaseUrl}/Integration/PayNowSync`,
    checkPaymentStatusByReferenceUrl:
      process.env.MAXICASH_CHECK_PAYMENT_STATUS_BY_REFERENCE_URL ||
      `${webapiBaseUrl}/Integration/CheckPaymentStatusByReference`,
    africellPayType: Number(process.env.MAXICASH_AFRICELL_PAY_TYPE || 52),
  };
}

export function assertMaxiCashConfig(config = getMaxiCashConfig()) {
  if (!config.merchantId || !config.merchantPassword) {
    throw new Error('Configuration MaxiCash manquante.');
  }
}

export function getMaxiCashOperatorConfig(operator: MaxiCashOperator, config = getMaxiCashConfig()) {
  const base = MAXICASH_OPERATORS[operator];
  if (!base) throw new Error('Opérateur non pris en charge.');

  return {
    ...base,
    payType: operator === 'africell' ? config.africellPayType : base.payType,
  };
}

export function normalizeCongolesePhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('243')) return digits;
  if (digits.startsWith('0')) return `243${digits.slice(1)}`;
  return digits;
}

export function toMaxiCashCents(amount: number) {
  return String(Math.round(amount * 100));
}

export function generateMaxiCashReference(userId: string) {
  const cleanUser = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'USER';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MONI-MXC-${cleanUser}-${Date.now()}-${random}`;
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function statusCandidates(payload: Record<string, any> | null | undefined, fallback?: string) {
  if (!payload) return [fallback].filter(Boolean);

  return [
    payload.ResponseData,
    payload.responseData,
    payload.TransactionStatus,
    payload.transactionStatus,
    payload.PaymentStatus,
    payload.paymentStatus,
    payload.Status,
    payload.status,
    payload.Result,
    payload.result,
    payload.ResponseStatus,
    payload.responseStatus,
    fallback,
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function paymentStatusCandidates(payload: Record<string, any> | null | undefined) {
  if (!payload) return [];

  return [
    payload.ResponseData,
    payload.responseData,
    payload.TransactionStatus,
    payload.transactionStatus,
    payload.PaymentStatus,
    payload.paymentStatus,
    payload.Status,
    payload.status,
    payload.Result,
    payload.result,
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

export function isSuccessfulMaxiCashStatus(value: unknown) {
  return ['success', 'successful', 'completed', 'complete', 'paid', 'approved', 'ok', 'succeeded', 'succes'].includes(
    normalizeStatus(value)
  );
}

export function isFailedMaxiCashStatus(value: unknown) {
  return [
    'failed',
    'failure',
    'declined',
    'decline',
    'cancelled',
    'canceled',
    'error',
    'expired',
    'timeout',
    'rejected',
  ].includes(normalizeStatus(value));
}

export function isPendingMaxiCashStatus(value: unknown) {
  return ['pending', 'processing', 'inprogress', 'in progress', 'waiting', 'initiated'].includes(normalizeStatus(value));
}

export function extractMaxiCashStatus(payload: Record<string, any> | null | undefined, fallback?: string) {
  return String(
    payload?.Status ||
      payload?.status ||
      payload?.ResponseStatus ||
      payload?.responseStatus ||
      payload?.TransactionStatus ||
      payload?.transactionStatus ||
      payload?.PaymentStatus ||
      payload?.paymentStatus ||
      payload?.Result ||
      payload?.result ||
      fallback ||
      ''
  );
}

export function getMaxiCashErrorMessage(payload: Record<string, any> | null | undefined, fallback = '') {
  return String(
    payload?.ResponseError ||
      payload?.responseError ||
      payload?.Error ||
      payload?.error ||
      payload?.Message ||
      payload?.message ||
      payload?.ResponseDesc ||
      payload?.responseDesc ||
      payload?.ResponseData ||
      payload?.responseData ||
      fallback ||
      ''
  );
}

export function hasCompletedMaxiCashPayment(payload: Record<string, any> | null | undefined) {
  return paymentStatusCandidates(payload).some(isSuccessfulMaxiCashStatus);
}

export function hasFailedMaxiCashPayment(payload: Record<string, any> | null | undefined, fallback?: string) {
  return statusCandidates(payload, fallback).some(isFailedMaxiCashStatus);
}

export function isImmediateMaxiCashFailure(payload: Record<string, any> | null | undefined, fallback?: string) {
  const message = `${getMaxiCashErrorMessage(payload, fallback)} ${extractMaxiCashStatus(payload, fallback)}`.toLowerCase();
  return [
    'merchant not active',
    'invalid credential',
    'invalid credentials',
    'invalid merchant',
    'merchant account not found',
    'not found',
    'unauthorized',
    'forbidden',
  ].some((pattern) => message.includes(pattern));
}

export function isMaxiCashRequestAccepted(payload: Record<string, any> | null | undefined) {
  const responseStatus = normalizeStatus(payload?.ResponseStatus || payload?.responseStatus);
  return responseStatus === 'success' || responseStatus === 'succes' || responseStatus === 'ok';
}

async function parseMaxiCashResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { ResponseStatus: response.ok ? 'Success' : 'Failed', ResponseError: text };
  }
}

export async function initiateMaxiCashPayment(params: {
  amount: number;
  currency: MaxiCashPaymentCurrency;
  operator: MaxiCashOperator;
  phoneNumber: string;
  reference: string;
}): Promise<MaxiCashCallResult> {
  const config = getMaxiCashConfig();
  assertMaxiCashConfig(config);

  const operator = getMaxiCashOperatorConfig(params.operator, config);

  const payload = {
    RequestData: {
      Amount: toMaxiCashCents(params.amount),
      Reference: params.reference,
      Telephone: normalizeCongolesePhone(params.phoneNumber),
    },
    MerchantID: config.merchantId,
    MerchantPassword: config.merchantPassword,
    PayType: operator.payType,
    CurrencyCode: params.currency,
  };

  const response = await fetch(config.payNowSyncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseMaxiCashResponse(response);
  const status = extractMaxiCashStatus(data, response.statusText);

  return {
    ok: response.ok,
    payload: data,
    status,
    errorMessage: getMaxiCashErrorMessage(data, response.ok ? '' : `Erreur MaxiCash ${response.status}`),
  };
}

export async function checkMaxiCashPaymentStatusByReference(reference: string, transactionId?: string | null) {
  const config = getMaxiCashConfig();
  assertMaxiCashConfig(config);

  const payload = {
    MerchantID: config.merchantId,
    MerchantPassword: config.merchantPassword,
    Reference: reference,
    TransactionID: transactionId || '',
  };

  const postResponse = await fetch(config.checkPaymentStatusByReferenceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const postPayload = await parseMaxiCashResponse(postResponse);
  if (postResponse.ok && postPayload) return postPayload;

  const url = new URL(config.checkPaymentStatusByReferenceUrl);
  url.searchParams.set('MerchantID', config.merchantId);
  url.searchParams.set('MerchantPassword', config.merchantPassword);
  url.searchParams.set('Reference', reference);
  if (transactionId) url.searchParams.set('TransactionID', transactionId);

  const getResponse = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const getPayload = await parseMaxiCashResponse(getResponse);

  if (!getResponse.ok) {
    return postPayload || getPayload || { ResponseStatus: 'Failed', ResponseError: `Status check failed (${getResponse.status})` };
  }

  return getPayload;
}
