import { convertAmount, SupportedCurrency } from '../../_lib/rates';
import {
  commitWrites,
  createFirestoreId,
  getDocument,
  getFirebaseAuthContext,
  incrementWrite,
  updateWrite,
} from '../../_lib/firestore';
import {
  assertPayPalConfig,
  createPayPalPayout,
  getPayPalAccessToken,
  getPayPalConfig,
  PayPalApiError,
} from '../../_lib/paypal';

type ApiRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => { json: (body: any) => void; end: () => void };
};

const WALLET_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'CDF', 'XOF', 'FCFA'];
const PAYPAL_PAYOUT_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR'];

async function readJsonBody(req: ApiRequest) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function sendMethodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', ['POST', 'OPTIONS']);
  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}

function normalizeWalletCurrency(value: unknown): SupportedCurrency {
  const currency = String(value || '').trim().toUpperCase();
  return WALLET_CURRENCIES.includes(currency as SupportedCurrency) ? (currency as SupportedCurrency) : 'USD';
}

function normalizePayoutCurrency(value: unknown, fallback: SupportedCurrency): SupportedCurrency {
  const currency = String(value || '').trim().toUpperCase();
  if (PAYPAL_PAYOUT_CURRENCIES.includes(currency as SupportedCurrency)) return currency as SupportedCurrency;
  if (PAYPAL_PAYOUT_CURRENCIES.includes(fallback)) return fallback;
  return 'USD';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const amount = Number(body.amount || 0);
    const receiverEmail = String(body.receiverEmail || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Montant invalide.' });
    }

    if (!receiverEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) {
      return res.status(400).json({ success: false, error: 'Compte PayPal invalide.' });
    }

    const userPath = `users/${auth.uid}`;
    const userSnap = await getDocument(userPath, auth.token);
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    const userData = userSnap.data;
    const balance = Number(userData.balance || 0);
    if (balance < amount) {
      return res.status(400).json({ success: false, error: 'Solde insuffisant.' });
    }

    const walletCurrency = normalizeWalletCurrency(body.currency || userData.preferredCurrency || userData.currency);
    const payoutCurrency = normalizePayoutCurrency(process.env.PAYPAL_PAYOUT_CURRENCY || body.payoutCurrency, walletCurrency);
    const conversion = await convertAmount(amount, walletCurrency, payoutCurrency);
    const payoutAmount = conversion.amount;
    const config = getPayPalConfig(req);
    assertPayPalConfig(config);
    const paypalToken = await getPayPalAccessToken(config);
    const paypalScopes = String((paypalToken as any).scope || '').split(' ').filter(Boolean);
    const hasPayoutScope = paypalScopes.some((scope) => scope.includes('/payments/payouts'));

    if (!hasPayoutScope) {
      return res.status(403).json({
        success: false,
        provider: 'paypal',
        error: 'PayPal refuse ce retrait: le token OAuth de cette application ne contient pas le scope Payouts.',
        paypalAppId: (paypalToken as any).app_id || null,
        paypalScopes,
      });
    }

    const senderBatchId = `MONI-${Date.now()}-${auth.uid.slice(0, 8)}`;

    const payout = await createPayPalPayout({
      config,
      accessToken: paypalToken.access_token,
      senderBatchId,
      receiver: receiverEmail,
      amount: payoutAmount,
      currency: payoutCurrency,
      note: `Retrait Moni ${amount.toFixed(2)} ${walletCurrency}`,
    });
    const batchHeader = payout.batch_header || {};
    const batchStatus = String(batchHeader.batch_status || 'PENDING');
    const payoutBatchId = String(batchHeader.payout_batch_id || '');
    const transactionId = createFirestoreId('paypal-wth-');
    const notificationId = createFirestoreId('notif-');
    const now = new Date();

    await commitWrites(
      [
        incrementWrite(userPath, 'balance', -amount, {
          lastTransactionTime: now,
        }),
        updateWrite(
          `transactions/${transactionId}`,
          {
            userId: auth.uid,
            type: 'withdraw',
            amount,
            status: batchStatus === 'SUCCESS' ? 'completed' : 'pending',
            timestamp: now,
            title: 'Retrait PayPal',
            description: batchStatus === 'SUCCESS' ? `Envoyé à ${receiverEmail}` : `En cours vers ${receiverEmail}`,
            icon: 'fab fa-paypal',
            color: '#0070BA',
            reference: senderBatchId,
            metadata: {
              provider: 'paypal',
              integration: 'Payouts',
              receiverEmail,
              walletAmount: amount,
              walletCurrency,
              payoutAmount,
              payoutCurrency,
              conversionRate: conversion.rate,
              rateProvider: conversion.provider,
              rateProviderUrl: conversion.providerUrl,
              payoutBatchId,
              payoutBatchStatus: batchStatus,
              providerPayload: payout,
            },
          },
          { exists: false }
        ),
        updateWrite(
          `notifications/${notificationId}`,
          {
            userId: auth.uid,
            type: 'withdraw-completed',
            title: 'Retrait PayPal lancé',
            message: `${payoutAmount.toFixed(2)} ${payoutCurrency} envoyés vers ${receiverEmail}.`,
            amount,
            timestamp: now,
            read: false,
            actionRequired: false,
            transactionId,
          },
          { exists: false }
        ),
      ],
      auth.token
    );

    return res.status(200).json({
      success: true,
      transactionId,
      transactionStatus: batchStatus === 'SUCCESS' ? 'completed' : 'pending',
      payoutBatchId,
      payoutBatchStatus: batchStatus,
      walletAmount: amount,
      walletCurrency,
      payoutAmount,
      payoutCurrency,
      receiverEmail,
      providerResponse: payout,
    });
  } catch (error: any) {
    console.error('PayPal payout error:', error);
    const message = error?.message || 'Impossible de lancer le retrait PayPal.';
    const paypalError = error instanceof PayPalApiError ? error : null;
    const status = message.includes('Non authentifié')
      ? 401
      : message.includes('Payouts')
        ? 403
        : 500;
    return res.status(status).json({
      success: false,
      error: message,
      provider: 'paypal',
      debugId: paypalError?.debugId,
      paypalErrorName: paypalError?.errorName,
      paypalErrorDetails: paypalError?.details,
    });
  }
}
