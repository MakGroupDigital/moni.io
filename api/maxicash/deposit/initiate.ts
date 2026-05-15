import { convertAmount, SupportedCurrency } from '../../_lib/rates';
import type { ApiRequest, ApiResponse } from '../../_lib/http';
import { sendJson, sendNoContent } from '../../_lib/http';
import {
  commitWrites,
  createFirestoreId,
  getDocument,
  getFirebaseAuthContext,
  incrementWrite,
  saveDocument,
  updateWrite,
} from '../../_lib/firestore';
import {
  assertMaxiCashConfig,
  extractMaxiCashStatus,
  generateMaxiCashReference,
  getMaxiCashConfig,
  getMaxiCashErrorMessage,
  getMaxiCashOperatorConfig,
  hasCompletedMaxiCashPayment,
  hasFailedMaxiCashPayment,
  initiateMaxiCashPayment,
  isImmediateMaxiCashFailure,
  isMaxiCashRequestAccepted,
  MAXICASH_OPERATORS,
  MaxiCashOperator,
  MaxiCashPaymentCurrency,
  normalizeCongolesePhone,
} from '../../_lib/maxicash';

const SUPPORTED_WALLET_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'CDF', 'XOF', 'FCFA'];
const SUPPORTED_PAYMENT_CURRENCIES: MaxiCashPaymentCurrency[] = ['USD', 'CDF'];

function normalizeWalletCurrency(value: unknown): SupportedCurrency {
  const currency = String(value || '').trim().toUpperCase();
  return SUPPORTED_WALLET_CURRENCIES.includes(currency as SupportedCurrency) ? (currency as SupportedCurrency) : 'USD';
}

function normalizePaymentCurrency(value: unknown): MaxiCashPaymentCurrency {
  const currency = String(value || '').trim().toUpperCase();
  return SUPPORTED_PAYMENT_CURRENCIES.includes(currency as MaxiCashPaymentCurrency) ? (currency as MaxiCashPaymentCurrency) : 'USD';
}

function normalizeOperator(value: unknown): MaxiCashOperator | null {
  const operator = String(value || '').trim().toLowerCase();
  if (operator === 'airtel-money') return 'airtel';
  if (operator === 'orange-money') return 'orange';
  if (operator === 'afrimoney') return 'africell';
  if (operator in MAXICASH_OPERATORS) return operator as MaxiCashOperator;
  return null;
}

async function readJsonBody(req: ApiRequest) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function sendMethodNotAllowed(res: ApiResponse) {
  res.setHeader?.('Allow', ['POST', 'OPTIONS']);
  return sendJson(res, 405, { success: false, error: 'Méthode non autorisée.' });
}

function getProviderTransactionId(payload: Record<string, any> | null | undefined) {
  return String(payload?.TransactionID || payload?.transactionID || payload?.TransactionId || payload?.transactionId || '') || null;
}

async function completeDeposit(params: {
  token: string;
  uid: string;
  userPath: string;
  transactionPath: string;
  transactionUpdateTime?: string;
  transactionData: Record<string, any>;
  creditedAmount: number;
  walletCurrency: SupportedCurrency;
  operatorLabel: string;
  providerPayload: Record<string, any> | null;
  responseStatus: string;
  providerTransactionId: string | null;
}) {
  const now = new Date();
  const metadata = {
    ...(params.transactionData.metadata || {}),
    providerPayload: params.providerPayload || null,
    providerStatus: params.responseStatus || null,
    providerTransactionId: params.providerTransactionId,
    lastCheckedAt: now,
    completionVerified: true,
  };
  const notificationId = createFirestoreId('notif-');

  await commitWrites(
    [
      incrementWrite(params.userPath, 'balance', params.creditedAmount, {
        currency: params.walletCurrency,
        preferredCurrency: params.walletCurrency,
        lastTransactionTime: now,
      }),
      updateWrite(
        params.transactionPath,
        {
          status: 'completed',
          description: `Confirmé via ${params.operatorLabel}`,
          updatedAt: now,
          completedAt: now,
          creditedAt: now,
          metadata,
        },
        params.transactionUpdateTime ? { updateTime: params.transactionUpdateTime } : undefined
      ),
      updateWrite(
        `notifications/${notificationId}`,
        {
          userId: params.uid,
          type: 'deposit-completed',
          title: 'Dépôt confirmé',
          message: `${params.creditedAmount.toLocaleString()} ${params.walletCurrency} ajoutés à votre portefeuille.`,
          amount: params.creditedAmount,
          timestamp: now,
          read: false,
          actionRequired: false,
          transactionId: params.transactionPath.split('/').pop(),
        },
        { exists: false }
      ),
    ],
    params.token
  );
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const amount = Number(body.amount || 0);
    const paymentCurrency = normalizePaymentCurrency(body.paymentCurrency || body.currency);
    const operator = normalizeOperator(body.operator);
    const phoneNumber = normalizeCongolesePhone(String(body.phoneNumber || body.telephone || ''));

    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { success: false, error: 'Montant invalide.' });
    }

    if (!operator) {
      return sendJson(res, 400, { success: false, error: 'Opérateur non pris en charge.' });
    }

    if (!phoneNumber || phoneNumber.length < 11) {
      return sendJson(res, 400, { success: false, error: 'Numéro de téléphone invalide.' });
    }

    const userPath = `users/${auth.uid}`;
    const userSnap = await getDocument(userPath, auth.token);
    const userData = userSnap.exists ? userSnap.data : {};
    const walletCurrency = normalizeWalletCurrency(body.walletCurrency || userData.preferredCurrency || userData.currency);
    const conversion = await convertAmount(amount, paymentCurrency, walletCurrency);
    const creditedAmount = conversion.amount;
    const reference = generateMaxiCashReference(auth.uid);
    const transactionId = createFirestoreId('mxc-');
    const transactionPath = `transactions/${transactionId}`;
    const maxicashConfig = getMaxiCashConfig();
    assertMaxiCashConfig(maxicashConfig);
    const operatorConfig = getMaxiCashOperatorConfig(operator, maxicashConfig);
    const operatorLabel = operatorConfig.label;
    const now = new Date();

    if (!userSnap.exists) {
      await saveDocument(
        userPath,
        {
          uid: auth.uid,
          email: auth.email || '',
          displayName: auth.name || 'Utilisateur',
          balance: 0,
          paypalBalance: 0,
          currency: walletCurrency,
          preferredCurrency: walletCurrency,
          createdAt: now,
        },
        auth.token
      );
    }

    const pendingTransaction = {
      userId: auth.uid,
      type: 'deposit',
      amount: creditedAmount,
      status: 'pending',
      timestamp: now,
      title: 'Dépôt Mobile Money',
      description: `En attente via ${operatorLabel}`,
      icon: 'fas fa-arrow-down',
      color: '#00F5D4',
      reference,
      metadata: {
        provider: 'maxicash',
        integration: 'PayNowSync',
        operator,
        operatorLabel,
        payType: operatorConfig.payType,
        phoneNumber,
        paymentAmount: amount,
        paymentCurrency,
        walletCurrency,
        creditedAmount,
        conversionRate: conversion.rate,
        rateProvider: conversion.provider,
        rateProviderUrl: conversion.providerUrl,
        rateUpdatedAt: conversion.updatedAt,
        providerStatus: 'pending',
      },
    };
    const transactionUpdateTime = await saveDocument(transactionPath, pendingTransaction, auth.token, { exists: false });

    const providerResult = await initiateMaxiCashPayment({
      amount,
      currency: paymentCurrency,
      operator,
      phoneNumber,
      reference,
    });
    const providerPayload = providerResult.payload;
    const providerTransactionId = getProviderTransactionId(providerPayload);
    const responseStatus = extractMaxiCashStatus(providerPayload, providerResult.status);
    const providerError = providerResult.errorMessage || getMaxiCashErrorMessage(providerPayload, '');

    if (hasCompletedMaxiCashPayment(providerPayload)) {
      try {
        await completeDeposit({
          token: auth.token,
          uid: auth.uid,
          userPath,
          transactionPath,
          transactionUpdateTime,
          transactionData: pendingTransaction,
          creditedAmount,
          walletCurrency,
          operatorLabel,
          providerPayload,
          responseStatus,
          providerTransactionId,
        });
      } catch (error: any) {
        const latest = await getDocument(transactionPath, auth.token);
        if (latest.data.status !== 'completed') throw error;
      }

      return sendJson(res, 200, {
        success: true,
        transactionStatus: 'completed',
        transactionId,
        reference,
        providerTransactionId,
        responseStatus,
        error: '',
        message: 'Dépôt confirmé.',
        creditedAmount,
        walletCurrency,
        paymentAmount: amount,
        paymentCurrency,
        operatorLabel,
        providerResponse: providerPayload,
      });
    }

    const providerMetadata = {
      ...pendingTransaction.metadata,
      providerPayload: providerPayload || null,
      providerStatus: responseStatus || null,
      providerTransactionId,
      providerError: providerError || null,
      lastCheckedAt: new Date(),
    };

    if (!providerResult.ok || hasFailedMaxiCashPayment(providerPayload, responseStatus)) {
      if (isImmediateMaxiCashFailure(providerPayload, responseStatus) || !isMaxiCashRequestAccepted(providerPayload)) {
        await saveDocument(
          transactionPath,
          {
            status: 'failed',
            description: `Échec: ${providerError || 'paiement refusé'}`,
            failedAt: new Date(),
            updatedAt: new Date(),
            metadata: providerMetadata,
          },
          auth.token,
          transactionUpdateTime ? { updateTime: transactionUpdateTime } : undefined
        );

        return sendJson(res, 502, {
          success: false,
          transactionStatus: 'failed',
          transactionId,
          reference,
          providerTransactionId,
          responseStatus,
          error: providerError || 'Paiement refusé.',
          creditedAmount,
          walletCurrency,
          paymentAmount: amount,
          paymentCurrency,
          operatorLabel,
          providerResponse: providerPayload,
        });
      }
    }

    await saveDocument(
      transactionPath,
      {
        status: 'pending',
        description: 'Confirmez le paiement sur votre téléphone',
        updatedAt: new Date(),
        metadata: providerMetadata,
      },
      auth.token,
      transactionUpdateTime ? { updateTime: transactionUpdateTime } : undefined
    );

    return sendJson(res, 200, {
      success: true,
      transactionStatus: 'pending',
      transactionId,
      reference,
      providerTransactionId,
      responseStatus,
      error: '',
      message: 'Demande envoyée. Confirmez le paiement sur votre téléphone.',
      creditedAmount,
      walletCurrency,
      paymentAmount: amount,
      paymentCurrency,
      operatorLabel,
      providerResponse: providerPayload,
    });
  } catch (error: any) {
    console.error('MaxiCash deposit initiation error:', error);
    const message = error?.message || 'Impossible d’initier le dépôt.';
    const status = message.includes('Non authentifié') ? 401 : 500;
    return sendJson(res, status, {
      success: false,
      error: message,
    });
  }
}
