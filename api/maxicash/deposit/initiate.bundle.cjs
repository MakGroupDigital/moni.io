var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/maxicash/deposit/initiate.ts
var initiate_exports = {};
__export(initiate_exports, {
  default: () => handler
});
module.exports = __toCommonJS(initiate_exports);

// api/_lib/rates.ts
var RATE_PROVIDER = "ExchangeRate-API";
var DEFAULT_RATE_API_URL = "https://open.er-api.com/v6/latest";
function apiCurrency(currency) {
  return currency === "FCFA" ? "XOF" : currency;
}
function roundForCurrency(amount, currency) {
  if (["CDF", "XOF", "FCFA"].includes(currency)) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}
async function fetchRates(baseCurrency) {
  const baseUrl = process.env.EXCHANGE_RATE_API_URL || DEFAULT_RATE_API_URL;
  const providerUrl = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(baseCurrency)}`;
  const response = await fetch(providerUrl, {
    headers: { Accept: "application/json" }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.rates) {
    throw new Error("Impossible de r\xE9cup\xE9rer le taux de change du jour.");
  }
  return { payload, providerUrl };
}
async function convertAmount(amount, sourceCurrency, targetCurrency) {
  if (sourceCurrency === targetCurrency) {
    return {
      amount: roundForCurrency(amount, targetCurrency),
      rate: 1,
      provider: RATE_PROVIDER,
      providerUrl: process.env.EXCHANGE_RATE_API_URL || DEFAULT_RATE_API_URL,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sourceCurrency,
      targetCurrency
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
      updatedAt: String(direct.payload.time_last_update_utc || direct.payload.time_last_update_unix || ""),
      sourceCurrency,
      targetCurrency
    };
  }
  const usd = await fetchRates("USD");
  const sourcePerUsd = source === "USD" ? 1 : Number(usd.payload.rates?.[source]);
  const targetPerUsd = target === "USD" ? 1 : Number(usd.payload.rates?.[target]);
  if (!Number.isFinite(sourcePerUsd) || !Number.isFinite(targetPerUsd) || sourcePerUsd <= 0 || targetPerUsd <= 0) {
    throw new Error("Taux de change indisponible pour cette devise.");
  }
  const rate = targetPerUsd / sourcePerUsd;
  return {
    amount: roundForCurrency(amount * rate, targetCurrency),
    rate,
    provider: RATE_PROVIDER,
    providerUrl: usd.providerUrl,
    updatedAt: String(usd.payload.time_last_update_utc || usd.payload.time_last_update_unix || ""),
    sourceCurrency,
    targetCurrency
  };
}

// api/_lib/http.ts
function sendJson(res, statusCode, body) {
  if (typeof res.end === "function") {
    res.statusCode = statusCode;
    res.setHeader?.("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify(body));
  }
  return res.status?.(statusCode).json(body);
}
function sendNoContent(res, statusCode = 204) {
  if (typeof res.end === "function") {
    res.statusCode = statusCode;
    return res.end();
  }
  return res.status?.(statusCode).end();
}

// api/_lib/firestore.ts
function getProjectId() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Configuration Firestore manquante: VITE_FIREBASE_PROJECT_ID requis.");
  return projectId;
}
function databaseName() {
  return `projects/${getProjectId()}/databases/(default)/documents`;
}
function encodeDocumentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
function documentName(path) {
  return `${databaseName()}/${path}`;
}
function documentUrl(path) {
  return `https://firestore.googleapis.com/v1/${databaseName()}/${encodeDocumentPath(path)}`;
}
function getHeader(req, name) {
  const value = req.headers?.[name] || req.headers?.[name.toLowerCase()] || req.headers?.[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}
function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}
function getFirebaseAuthContext(req) {
  const authHeader = getHeader(req, "authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    throw new Error("Non authentifi\xE9.");
  }
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(decodeBase64Url(payload || ""));
    const uid = String(decoded.user_id || decoded.sub || "");
    if (!uid) throw new Error("UID manquant");
    if (decoded.exp && Number(decoded.exp) * 1e3 < Date.now()) {
      throw new Error("Token expir\xE9");
    }
    return {
      token,
      uid,
      email: decoded.email,
      name: decoded.name
    };
  } catch {
    throw new Error("Non authentifi\xE9.");
  }
}
function toFirestoreValue(value) {
  if (value === void 0 || value === null) return { nullValue: "NULL_VALUE" };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "boolean":
      return { booleanValue: value };
    case "number":
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case "object":
      return { mapValue: { fields: toFirestoreFields(value) } };
    default:
      return { stringValue: String(value) };
  }
}
function toFirestoreFields(data) {
  return Object.entries(data).reduce((fields, [key, value]) => {
    if (value !== void 0) fields[key] = toFirestoreValue(value);
    return fields;
  }, {});
}
function fromFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return new Date(value.timestampValue);
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  return void 0;
}
function fromFirestoreFields(fields) {
  return Object.entries(fields).reduce((data, [key, value]) => {
    data[key] = fromFirestoreValue(value);
    return data;
  }, {});
}
function writePrecondition(precondition) {
  if (!precondition) return void 0;
  if (precondition.updateTime) return { updateTime: precondition.updateTime };
  if (precondition.exists !== void 0) return { exists: precondition.exists };
  return void 0;
}
function updateWrite(path, data, precondition) {
  return {
    update: {
      name: documentName(path),
      fields: toFirestoreFields(data)
    },
    updateMask: {
      fieldPaths: Object.keys(data).filter((key) => data[key] !== void 0)
    },
    currentDocument: writePrecondition(precondition)
  };
}
function incrementWrite(path, fieldPath, amount, extraData) {
  if (!extraData) {
    return {
      transform: {
        document: documentName(path),
        fieldTransforms: [
          {
            fieldPath,
            increment: toFirestoreValue(amount)
          }
        ]
      }
    };
  }
  return {
    update: {
      name: documentName(path),
      fields: toFirestoreFields(extraData)
    },
    updateMask: {
      fieldPaths: Object.keys(extraData).filter((key) => extraData[key] !== void 0)
    },
    updateTransforms: [
      {
        fieldPath,
        increment: toFirestoreValue(amount)
      }
    ]
  };
}
async function firestoreRequest(path, token, init) {
  const response = await fetch(documentUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers || {}
    }
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 404) {
    return { response, payload };
  }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error?.status || `Erreur Firestore ${response.status}`;
    if (response.status === 401 || response.status === 403) throw new Error("Non authentifi\xE9.");
    throw new Error(message);
  }
  return { response, payload };
}
async function getDocument(path, token) {
  const { response, payload } = await firestoreRequest(path, token);
  if (response.status === 404) {
    return { exists: false, data: {} };
  }
  return {
    exists: true,
    name: payload.name,
    updateTime: payload.updateTime,
    data: fromFirestoreFields(payload.fields || {})
  };
}
async function commitWrites(writes, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${databaseName()}:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ writes })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error?.status || `Erreur Firestore ${response.status}`;
    if (response.status === 401 || response.status === 403) throw new Error("Non authentifi\xE9.");
    throw new Error(message);
  }
  return payload;
}
async function saveDocument(path, data, token, precondition) {
  const payload = await commitWrites([updateWrite(path, data, precondition)], token);
  return payload?.writeResults?.[0]?.updateTime;
}
function createFirestoreId(prefix = "") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now()}${random}`;
}

// api/_lib/maxicash.ts
var DEFAULT_LIVE_WEBAPI = "https://webapi.maxicashapp.com";
var DEFAULT_SANDBOX_WEBAPI = "https://webapi-test.maxicashapp.com";
var MAXICASH_OPERATORS = {
  airtel: { label: "Airtel Money", payType: 1 },
  mpesa: { label: "M-Pesa", payType: 2 },
  orange: { label: "Orange Money", payType: 3 },
  africell: { label: "Africell Money", payType: 52 }
};
function getMaxiCashConfig() {
  const environment = process.env.MAXICASH_ENV === "live" ? "live" : "sandbox";
  const webapiBaseUrl = environment === "live" ? DEFAULT_LIVE_WEBAPI : DEFAULT_SANDBOX_WEBAPI;
  return {
    environment,
    merchantId: process.env.MAXICASH_MERCHANT_ID || "",
    merchantPassword: process.env.MAXICASH_MERCHANT_PASSWORD || "",
    payNowSyncUrl: process.env.MAXICASH_PAY_NOW_SYNC_URL || `${webapiBaseUrl}/Integration/PayNowSync`,
    checkPaymentStatusByReferenceUrl: process.env.MAXICASH_CHECK_PAYMENT_STATUS_BY_REFERENCE_URL || `${webapiBaseUrl}/Integration/CheckPaymentStatusByReference`,
    africellPayType: Number(process.env.MAXICASH_AFRICELL_PAY_TYPE || 52)
  };
}
function assertMaxiCashConfig(config = getMaxiCashConfig()) {
  if (!config.merchantId || !config.merchantPassword) {
    throw new Error("Configuration MaxiCash manquante.");
  }
}
function getMaxiCashOperatorConfig(operator, config = getMaxiCashConfig()) {
  const base = MAXICASH_OPERATORS[operator];
  if (!base) throw new Error("Op\xE9rateur non pris en charge.");
  return {
    ...base,
    payType: operator === "africell" ? config.africellPayType : base.payType
  };
}
function normalizeCongolesePhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("243")) return digits;
  if (digits.startsWith("0")) return `243${digits.slice(1)}`;
  return digits;
}
function toMaxiCashCents(amount) {
  return String(Math.round(amount * 100));
}
function generateMaxiCashReference(userId) {
  const cleanUser = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "USER";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MONI-MXC-${cleanUser}-${Date.now()}-${random}`;
}
function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}
function statusCandidates(payload, fallback) {
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
    fallback
  ].filter((value) => value !== void 0 && value !== null && String(value).trim() !== "");
}
function paymentStatusCandidates(payload) {
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
    payload.result
  ].filter((value) => value !== void 0 && value !== null && String(value).trim() !== "");
}
function isSuccessfulMaxiCashStatus(value) {
  return ["success", "successful", "completed", "complete", "paid", "approved", "ok", "succeeded", "succes"].includes(
    normalizeStatus(value)
  );
}
function isFailedMaxiCashStatus(value) {
  return [
    "failed",
    "failure",
    "declined",
    "decline",
    "cancelled",
    "canceled",
    "error",
    "expired",
    "timeout",
    "rejected"
  ].includes(normalizeStatus(value));
}
function extractMaxiCashStatus(payload, fallback) {
  return String(
    payload?.Status || payload?.status || payload?.ResponseStatus || payload?.responseStatus || payload?.TransactionStatus || payload?.transactionStatus || payload?.PaymentStatus || payload?.paymentStatus || payload?.Result || payload?.result || fallback || ""
  );
}
function getMaxiCashErrorMessage(payload, fallback = "") {
  return String(
    payload?.ResponseError || payload?.responseError || payload?.Error || payload?.error || payload?.Message || payload?.message || payload?.ResponseDesc || payload?.responseDesc || payload?.ResponseData || payload?.responseData || fallback || ""
  );
}
function hasCompletedMaxiCashPayment(payload) {
  return paymentStatusCandidates(payload).some(isSuccessfulMaxiCashStatus);
}
function hasFailedMaxiCashPayment(payload, fallback) {
  return statusCandidates(payload, fallback).some(isFailedMaxiCashStatus);
}
function isImmediateMaxiCashFailure(payload, fallback) {
  const message = `${getMaxiCashErrorMessage(payload, fallback)} ${extractMaxiCashStatus(payload, fallback)}`.toLowerCase();
  return [
    "merchant not active",
    "invalid credential",
    "invalid credentials",
    "invalid merchant",
    "merchant account not found",
    "not found",
    "unauthorized",
    "forbidden"
  ].some((pattern) => message.includes(pattern));
}
function isMaxiCashRequestAccepted(payload) {
  const responseStatus = normalizeStatus(payload?.ResponseStatus || payload?.responseStatus);
  return responseStatus === "success" || responseStatus === "succes" || responseStatus === "ok";
}
async function parseMaxiCashResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { ResponseStatus: response.ok ? "Success" : "Failed", ResponseError: text };
  }
}
async function initiateMaxiCashPayment(params) {
  const config = getMaxiCashConfig();
  assertMaxiCashConfig(config);
  const operator = getMaxiCashOperatorConfig(params.operator, config);
  const payload = {
    RequestData: {
      Amount: toMaxiCashCents(params.amount),
      Reference: params.reference,
      Telephone: normalizeCongolesePhone(params.phoneNumber)
    },
    MerchantID: config.merchantId,
    MerchantPassword: config.merchantPassword,
    PayType: operator.payType,
    CurrencyCode: params.currency
  };
  const response = await fetch(config.payNowSyncUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await parseMaxiCashResponse(response);
  const status = extractMaxiCashStatus(data, response.statusText);
  return {
    ok: response.ok,
    payload: data,
    status,
    errorMessage: getMaxiCashErrorMessage(data, response.ok ? "" : `Erreur MaxiCash ${response.status}`)
  };
}

// api/maxicash/deposit/initiate.ts
var SUPPORTED_WALLET_CURRENCIES = ["USD", "EUR", "CDF", "XOF", "FCFA"];
var SUPPORTED_PAYMENT_CURRENCIES = ["USD", "CDF"];
function normalizeWalletCurrency(value) {
  const currency = String(value || "").trim().toUpperCase();
  return SUPPORTED_WALLET_CURRENCIES.includes(currency) ? currency : "USD";
}
function normalizePaymentCurrency(value) {
  const currency = String(value || "").trim().toUpperCase();
  return SUPPORTED_PAYMENT_CURRENCIES.includes(currency) ? currency : "USD";
}
function normalizeOperator(value) {
  const operator = String(value || "").trim().toLowerCase();
  if (operator === "airtel-money") return "airtel";
  if (operator === "orange-money") return "orange";
  if (operator === "afrimoney") return "africell";
  if (operator in MAXICASH_OPERATORS) return operator;
  return null;
}
async function readJsonBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}
function sendMethodNotAllowed(res) {
  res.setHeader?.("Allow", ["POST", "OPTIONS"]);
  return sendJson(res, 405, { success: false, error: "M\xE9thode non autoris\xE9e." });
}
function getProviderTransactionId(payload) {
  return String(payload?.TransactionID || payload?.transactionID || payload?.TransactionId || payload?.transactionId || "") || null;
}
async function completeDeposit(params) {
  const now = /* @__PURE__ */ new Date();
  const metadata = {
    ...params.transactionData.metadata || {},
    providerPayload: params.providerPayload || null,
    providerStatus: params.responseStatus || null,
    providerTransactionId: params.providerTransactionId,
    lastCheckedAt: now,
    completionVerified: true
  };
  const notificationId = createFirestoreId("notif-");
  await commitWrites(
    [
      incrementWrite(params.userPath, "balance", params.creditedAmount, {
        currency: params.walletCurrency,
        preferredCurrency: params.walletCurrency,
        lastTransactionTime: now
      }),
      updateWrite(
        params.transactionPath,
        {
          status: "completed",
          description: `Confirm\xE9 via ${params.operatorLabel}`,
          updatedAt: now,
          completedAt: now,
          creditedAt: now,
          metadata
        },
        params.transactionUpdateTime ? { updateTime: params.transactionUpdateTime } : void 0
      ),
      updateWrite(
        `notifications/${notificationId}`,
        {
          userId: params.uid,
          type: "deposit-completed",
          title: "D\xE9p\xF4t confirm\xE9",
          message: `${params.creditedAmount.toLocaleString()} ${params.walletCurrency} ajout\xE9s \xE0 votre portefeuille.`,
          amount: params.creditedAmount,
          timestamp: now,
          read: false,
          actionRequired: false,
          transactionId: params.transactionPath.split("/").pop()
        },
        { exists: false }
      )
    ],
    params.token
  );
}
async function handler(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const amount = Number(body.amount || 0);
    const paymentCurrency = normalizePaymentCurrency(body.paymentCurrency || body.currency);
    const operator = normalizeOperator(body.operator);
    const phoneNumber = normalizeCongolesePhone(String(body.phoneNumber || body.telephone || ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { success: false, error: "Montant invalide." });
    }
    if (!operator) {
      return sendJson(res, 400, { success: false, error: "Op\xE9rateur non pris en charge." });
    }
    if (!phoneNumber || phoneNumber.length < 11) {
      return sendJson(res, 400, { success: false, error: "Num\xE9ro de t\xE9l\xE9phone invalide." });
    }
    const userPath = `users/${auth.uid}`;
    const userSnap = await getDocument(userPath, auth.token);
    const userData = userSnap.exists ? userSnap.data : {};
    const walletCurrency = normalizeWalletCurrency(body.walletCurrency || userData.preferredCurrency || userData.currency);
    const conversion = await convertAmount(amount, paymentCurrency, walletCurrency);
    const creditedAmount = conversion.amount;
    const reference = generateMaxiCashReference(auth.uid);
    const transactionId = createFirestoreId("mxc-");
    const transactionPath = `transactions/${transactionId}`;
    const maxicashConfig = getMaxiCashConfig();
    assertMaxiCashConfig(maxicashConfig);
    const operatorConfig = getMaxiCashOperatorConfig(operator, maxicashConfig);
    const operatorLabel = operatorConfig.label;
    const now = /* @__PURE__ */ new Date();
    if (!userSnap.exists) {
      await saveDocument(
        userPath,
        {
          uid: auth.uid,
          email: auth.email || "",
          displayName: auth.name || "Utilisateur",
          balance: 0,
          paypalBalance: 0,
          currency: walletCurrency,
          preferredCurrency: walletCurrency,
          createdAt: now
        },
        auth.token
      );
    }
    const pendingTransaction = {
      userId: auth.uid,
      type: "deposit",
      amount: creditedAmount,
      status: "pending",
      timestamp: now,
      title: "D\xE9p\xF4t Mobile Money",
      description: `En attente via ${operatorLabel}`,
      icon: "fas fa-arrow-down",
      color: "#00F5D4",
      reference,
      metadata: {
        provider: "maxicash",
        integration: "PayNowSync",
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
        providerStatus: "pending"
      }
    };
    const transactionUpdateTime = await saveDocument(transactionPath, pendingTransaction, auth.token, { exists: false });
    const providerResult = await initiateMaxiCashPayment({
      amount,
      currency: paymentCurrency,
      operator,
      phoneNumber,
      reference
    });
    const providerPayload = providerResult.payload;
    const providerTransactionId = getProviderTransactionId(providerPayload);
    const responseStatus = extractMaxiCashStatus(providerPayload, providerResult.status);
    const providerError = providerResult.errorMessage || getMaxiCashErrorMessage(providerPayload, "");
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
          providerTransactionId
        });
      } catch (error) {
        const latest = await getDocument(transactionPath, auth.token);
        if (latest.data.status !== "completed") throw error;
      }
      return sendJson(res, 200, {
        success: true,
        transactionStatus: "completed",
        transactionId,
        reference,
        providerTransactionId,
        responseStatus,
        error: "",
        message: "D\xE9p\xF4t confirm\xE9.",
        creditedAmount,
        walletCurrency,
        paymentAmount: amount,
        paymentCurrency,
        operatorLabel,
        providerResponse: providerPayload
      });
    }
    const providerMetadata = {
      ...pendingTransaction.metadata,
      providerPayload: providerPayload || null,
      providerStatus: responseStatus || null,
      providerTransactionId,
      providerError: providerError || null,
      lastCheckedAt: /* @__PURE__ */ new Date()
    };
    if (!providerResult.ok || hasFailedMaxiCashPayment(providerPayload, responseStatus)) {
      if (isImmediateMaxiCashFailure(providerPayload, responseStatus) || !isMaxiCashRequestAccepted(providerPayload)) {
        await saveDocument(
          transactionPath,
          {
            status: "failed",
            description: `\xC9chec: ${providerError || "paiement refus\xE9"}`,
            failedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date(),
            metadata: providerMetadata
          },
          auth.token,
          transactionUpdateTime ? { updateTime: transactionUpdateTime } : void 0
        );
        return sendJson(res, 502, {
          success: false,
          transactionStatus: "failed",
          transactionId,
          reference,
          providerTransactionId,
          responseStatus,
          error: providerError || "Paiement refus\xE9.",
          creditedAmount,
          walletCurrency,
          paymentAmount: amount,
          paymentCurrency,
          operatorLabel,
          providerResponse: providerPayload
        });
      }
    }
    await saveDocument(
      transactionPath,
      {
        status: "pending",
        description: "Confirmez le paiement sur votre t\xE9l\xE9phone",
        updatedAt: /* @__PURE__ */ new Date(),
        metadata: providerMetadata
      },
      auth.token,
      transactionUpdateTime ? { updateTime: transactionUpdateTime } : void 0
    );
    return sendJson(res, 200, {
      success: true,
      transactionStatus: "pending",
      transactionId,
      reference,
      providerTransactionId,
      responseStatus,
      error: "",
      message: "Demande envoy\xE9e. Confirmez le paiement sur votre t\xE9l\xE9phone.",
      creditedAmount,
      walletCurrency,
      paymentAmount: amount,
      paymentCurrency,
      operatorLabel,
      providerResponse: providerPayload
    });
  } catch (error) {
    console.error("MaxiCash deposit initiation error:", error);
    const message = error?.message || "Impossible d\u2019initier le d\xE9p\xF4t.";
    const status = message.includes("Non authentifi\xE9") ? 401 : 500;
    return sendJson(res, status, {
      success: false,
      error: message
    });
  }
}

module.exports = handler;
