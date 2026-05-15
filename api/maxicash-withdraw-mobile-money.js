const {
  DRC_MOBILE_MONEY_OPERATORS,
  sendJson,
  sendNoContent,
  readJsonBody,
  getFirebaseAuthContext,
  getDocument,
  commitWrites,
  updateWrite,
  incrementWrite,
  createFirestoreId,
  normalizeWalletCurrency,
  calculateWithdrawalFee,
  normalizeCongolesePhone,
  getCongoleseNationalDigits,
  detectDrcMobileMoneyOperator,
} = require('./_lib/server.cjs');

const SUPPORTED_WITHDRAW_CURRENCIES = ['USD', 'EUR', 'CDF'];

class MaxiCashWithdrawError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'MaxiCashWithdrawError';
    this.status = options.status || 502;
    this.payload = options.payload || null;
    this.step = options.step || 'provider';
  }
}

function sendMethodNotAllowed(res) {
  res.setHeader?.('Allow', ['POST', 'OPTIONS']);
  return sendJson(res, 405, { success: false, error: 'Méthode non autorisée.' });
}

function getMaxiCashWithdrawConfig() {
  const environment = String(process.env.MAXICASH_ENV || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';

  return {
    environment,
    integratorUsername: process.env.MAXICASH_INTEGRATOR_USERNAME || process.env.MAXICASH_MERCHANT_ID || '',
    integratorPassword: process.env.MAXICASH_INTEGRATOR_PASSWORD || process.env.MAXICASH_MERCHANT_PASSWORD || '',
    loginUrl:
      process.env.MAXICASH_LOGIN_URL ||
      (environment === 'live'
        ? 'https://webapi.maxicashme.com/Integration/Login'
        : 'https://webapitest.maxicashme.com/Integration/Login'),
    topUpMobileMoneyUrl:
      process.env.MAXICASH_TOP_UP_MOBILE_MONEY_URL ||
      (environment === 'live'
        ? 'https://webapi.maxicashapp.com/Integration/TopUpMobileMoney'
        : 'https://webapi-test.maxicashapp.com/Integration/TopUpMobileMoney'),
  };
}

function assertConfig(config) {
  if (!config.integratorUsername || !config.integratorPassword) {
    throw new Error('Configuration MaxiCash retrait manquante: MAXICASH_INTEGRATOR_USERNAME et MAXICASH_INTEGRATOR_PASSWORD requis.');
  }
}

function toMaxiCashCents(amount) {
  return String(Math.round(Number(amount || 0) * 100));
}

function generateWithdrawReference(uid) {
  const cleanUser = String(uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'USER';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MONI-WTH-${cleanUser}-${Date.now()}-${random}`;
}

function normalizeProviderStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function getProviderErrorMessage(payload, fallback = '') {
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

function isProviderSuccess(payload) {
  const status = normalizeProviderStatus(payload?.ResponseStatus || payload?.responseStatus || payload?.Status || payload?.status);
  const data = normalizeProviderStatus(payload?.ResponseData || payload?.responseData);
  const error = getProviderErrorMessage({ ResponseError: payload?.ResponseError || payload?.responseError }, '');

  return !error && (['success', 'succes', 'ok', 'completed'].includes(status) || ['success', 'completed', 'complete', 'paid'].includes(data));
}

async function parseProviderResponse(response) {
  const rawText = await response.text().catch(() => '');
  const text = rawText.replace(/^\uFEFF/, '').trim();

  if (!text) {
    return {
      ResponseStatus: response.ok ? 'Success' : 'Failed',
      ResponseError: response.ok ? '' : `Erreur MaxiCash ${response.status}`,
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      ResponseStatus: response.ok ? 'Success' : 'Failed',
      ResponseError: response.ok ? '' : text,
      RawResponse: text,
    };
  }
}

async function getMaxiCashToken(config) {
  const loginUrl = new URL(config.loginUrl);
  loginUrl.searchParams.set('IntegratorUsername', config.integratorUsername);
  loginUrl.searchParams.set('IntegratorPassword', config.integratorPassword);

  const response = await fetch(loginUrl.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const payload = await parseProviderResponse(response);
  const token = String(payload?.ResponseData || payload?.SessionToken || '').trim();

  if (!response.ok || !isProviderSuccess(payload) || !token) {
    throw new MaxiCashWithdrawError(getProviderErrorMessage(payload, `Login MaxiCash refusé (${response.status}).`), {
      status: response.ok ? 502 : response.status,
      payload,
      step: 'login',
    });
  }

  return { token, payload };
}

function splitName(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: 'Client', surname: 'Moni' };

  return {
    firstName: parts[0],
    surname: parts.slice(1).join(' ') || 'Moni',
  };
}

async function executeTopUpMobileMoney(params) {
  const body = {
    RequestData: {
      Amount: toMaxiCashCents(params.amount),
      Reference: params.reference,
      Telephone: params.telephone,
      BeneficiaryFirstName: params.beneficiaryFirstName,
      BeneficiarySurname: params.beneficiarySurname,
      SenderFirstName: process.env.MONI_WITHDRAW_SENDER_FIRST_NAME || 'Moni',
      SenderSurname: process.env.MONI_WITHDRAW_SENDER_SURNAME || 'Wallet',
      SenderTelephone: normalizeCongolesePhone(process.env.MONI_WITHDRAW_SENDER_TELEPHONE || params.senderTelephone || params.telephone),
      SourceOfFund: process.env.MONI_WITHDRAW_SOURCE_OF_FUND || 'business',
    },
    UserToken: params.token,
    ToAcountType: params.accountType,
    ToAccountType: params.accountType,
    CurrencyCode: params.currency,
  };

  const response = await fetch(params.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await parseProviderResponse(response);

  if (!response.ok || !isProviderSuccess(payload)) {
    throw new MaxiCashWithdrawError(getProviderErrorMessage(payload, `Retrait MaxiCash refusé (${response.status}).`), {
      status: response.ok ? 502 : response.status,
      payload,
      step: 'topup',
    });
  }

  return { payload, requestBody: body };
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  if (req.method !== 'POST') return sendMethodNotAllowed(res);

  let transactionId = '';
  let auth;

  try {
    auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const amount = Number(body.amount || 0);
    const phoneNumber = String(body.phoneNumber || '').trim();
    const normalizedPhone = normalizeCongolesePhone(phoneNumber);
    const nationalDigits = getCongoleseNationalDigits(phoneNumber);
    const detectedOperator = detectDrcMobileMoneyOperator(phoneNumber);
    const requestedOperator = String(body.operator || detectedOperator || '').trim().toLowerCase();
    const operator = DRC_MOBILE_MONEY_OPERATORS[requestedOperator];

    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { success: false, error: 'Montant invalide.' });
    }

    if (nationalDigits.length < 9 || !normalizedPhone.startsWith('243')) {
      return sendJson(res, 400, { success: false, error: 'Numéro Mobile Money invalide.' });
    }

    if (!operator) {
      return sendJson(res, 400, { success: false, error: 'Opérateur Mobile Money non pris en charge.' });
    }

    const userPath = `users/${auth.uid}`;
    const userSnap = await getDocument(userPath, auth.token);
    if (!userSnap.exists) {
      return sendJson(res, 404, { success: false, error: 'Utilisateur introuvable.' });
    }

    const userData = userSnap.data;
    const walletCurrency = normalizeWalletCurrency(body.currency || userData.preferredCurrency || userData.currency);
    if (!SUPPORTED_WITHDRAW_CURRENCIES.includes(walletCurrency)) {
      return sendJson(res, 400, { success: false, error: 'Devise non prise en charge pour le retrait Mobile Money.' });
    }

    const fee = calculateWithdrawalFee(amount, walletCurrency);
    if (amount < fee.minimum) {
      return sendJson(res, 400, {
        success: false,
        error: `Montant minimum: ${fee.minimum} ${walletCurrency}.`,
      });
    }

    const balance = Number(userData.balance || 0);
    if (balance < fee.totalDebit) {
      return sendJson(res, 400, {
        success: false,
        error: 'Solde insuffisant frais inclus.',
        feeAmount: fee.feeAmount,
        totalDebit: fee.totalDebit,
      });
    }

    const config = getMaxiCashWithdrawConfig();
    assertConfig(config);

    const now = new Date();
    const reference = generateWithdrawReference(auth.uid);
    transactionId = createFirestoreId('mxc-wth-');
    const notificationId = createFirestoreId('notif-');
    const beneficiary = splitName(userData.displayName || auth.name || userData.name || 'Client Moni');

    await commitWrites(
      [
        updateWrite(
          `transactions/${transactionId}`,
          {
            userId: auth.uid,
            type: 'withdraw',
            amount: fee.totalDebit,
            status: 'pending',
            timestamp: now,
            title: 'Retrait Mobile Money',
            description: `Vers ${operator.label}`,
            icon: 'fas fa-mobile-alt',
            color: '#EF476F',
            reference,
            metadata: {
              provider: 'maxicash',
              integration: 'TopUpMobileMoney',
              requestedAmount: amount,
              feeRate: fee.feeRate,
              feeAmount: fee.feeAmount,
              totalDebit: fee.totalDebit,
              currency: walletCurrency,
              operator: operator.id,
              operatorLabel: operator.label,
              toAccountType: operator.accountType,
              phoneNumber: normalizedPhone,
            },
          },
          { exists: false }
        ),
      ],
      auth.token
    );

    let tokenResult;
    let providerResult;

    try {
      tokenResult = await getMaxiCashToken(config);
      providerResult = await executeTopUpMobileMoney({
        url: config.topUpMobileMoneyUrl,
        token: tokenResult.token,
        amount,
        currency: walletCurrency,
        reference,
        telephone: normalizedPhone,
        accountType: operator.accountType,
        beneficiaryFirstName: beneficiary.firstName,
        beneficiarySurname: beneficiary.surname,
        senderTelephone: userData.phoneNumber || userData.telephone || normalizedPhone,
      });
    } catch (error) {
      const providerError = error instanceof MaxiCashWithdrawError ? error : null;
      await commitWrites(
        [
          updateWrite(`transactions/${transactionId}`, {
            status: 'failed',
            metadata: {
              provider: 'maxicash',
              integration: 'TopUpMobileMoney',
              requestedAmount: amount,
              feeRate: fee.feeRate,
              feeAmount: fee.feeAmount,
              totalDebit: fee.totalDebit,
              currency: walletCurrency,
              operator: operator.id,
              operatorLabel: operator.label,
              toAccountType: operator.accountType,
              phoneNumber: normalizedPhone,
              providerStep: providerError?.step || 'provider',
              providerError: error?.message || 'Retrait refusé.',
              providerPayload: providerError?.payload || null,
            },
          }),
        ],
        auth.token
      ).catch((commitError) => {
        console.error('Unable to mark MaxiCash withdrawal as failed:', commitError);
      });

      return sendJson(res, providerError?.status || 502, {
        success: false,
        error: error?.message || 'Retrait Mobile Money refusé.',
        provider: 'maxicash',
        providerStep: providerError?.step || 'provider',
        providerResponse: providerError?.payload || null,
      });
    }

    await commitWrites(
      [
        incrementWrite(userPath, 'balance', -fee.totalDebit, {
          lastTransactionTime: now,
        }),
        updateWrite(`transactions/${transactionId}`, {
          status: 'completed',
          description: `Envoyé vers ${operator.label}`,
          metadata: {
            provider: 'maxicash',
            integration: 'TopUpMobileMoney',
            requestedAmount: amount,
            feeRate: fee.feeRate,
            feeAmount: fee.feeAmount,
            totalDebit: fee.totalDebit,
            currency: walletCurrency,
            operator: operator.id,
            operatorLabel: operator.label,
            toAccountType: operator.accountType,
            phoneNumber: normalizedPhone,
            providerLogin: {
              ResponseStatus: tokenResult.payload?.ResponseStatus || null,
              ResponseDesc: tokenResult.payload?.ResponseDesc || null,
              TransactionID: tokenResult.payload?.TransactionID || null,
            },
            providerPayload: providerResult.payload,
            providerRequest: {
              RequestData: providerResult.requestBody.RequestData,
              ToAcountType: providerResult.requestBody.ToAcountType,
              CurrencyCode: providerResult.requestBody.CurrencyCode,
            },
          },
        }),
        updateWrite(
          `notifications/${notificationId}`,
          {
            userId: auth.uid,
            type: 'withdraw-completed',
            title: 'Retrait Mobile Money effectué',
            message: `${amount} ${walletCurrency} envoyés vers ${operator.label}. Frais Moni: ${fee.feeAmount} ${walletCurrency}.`,
            amount: fee.totalDebit,
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

    return sendJson(res, 200, {
      success: true,
      transactionId,
      transactionStatus: 'completed',
      withdrawnAmount: amount,
      feeAmount: fee.feeAmount,
      feeRate: fee.feeRate,
      totalDebit: fee.totalDebit,
      currency: walletCurrency,
      operator: operator.id,
      operatorLabel: operator.label,
      phoneNumber: normalizedPhone,
      providerResponse: providerResult.payload,
    });
  } catch (error) {
    console.error('MaxiCash mobile money withdrawal error:', error);
    const message = error?.message || 'Impossible de lancer le retrait Mobile Money.';
    const status = message.includes('Non authentifié') ? 401 : message.includes('Configuration MaxiCash') ? 500 : 500;
    return sendJson(res, status, {
      success: false,
      error: message,
      provider: 'maxicash',
      transactionId: transactionId || undefined,
    });
  }
}

module.exports = handler;
