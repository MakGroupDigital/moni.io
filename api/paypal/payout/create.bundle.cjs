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

// api/paypal/payout/create.ts
var create_exports = {};
__export(create_exports, {
  default: () => handler
});
module.exports = __toCommonJS(create_exports);

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
function createFirestoreId(prefix = "") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now()}${random}`;
}

// api/_lib/paypal.ts
var PayPalApiError = class extends Error {
  constructor(message, options) {
    super(message);
    this.name = "PayPalApiError";
    this.status = options.status;
    this.debugId = options.debugId;
    this.errorName = options.errorName;
    this.details = options.details;
    this.payload = options.payload;
  }
};
function normalizeEnv(value) {
  return String(value || "").toLowerCase() === "live" ? "live" : "sandbox";
}
function getPayPalConfig(req) {
  const env = normalizeEnv(process.env.PAYPAL_ENV);
  const apiBaseUrl = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const authorizeUrl = env === "live" ? "https://www.paypal.com/signin/authorize" : "https://www.sandbox.paypal.com/signin/authorize";
  const hostHeader = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  const protocolHeader = req?.headers?.["x-forwarded-proto"];
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader;
  const inferredOrigin = host ? `${protocol || "https"}://${host}` : "http://localhost:3000";
  return {
    env,
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    redirectUri: process.env.PAYPAL_REDIRECT_URI || `${inferredOrigin}/paypal/callback`,
    authorizeUrl,
    apiBaseUrl
  };
}
function assertPayPalConfig(config) {
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Configuration PayPal manquante: PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET requis.");
  }
}
async function getPayPalAccessToken(config) {
  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials"
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || `Erreur PayPal ${response.status}`);
  }
  return payload;
}
async function createPayPalPayout(params) {
  const response = await fetch(`${params.config.apiBaseUrl}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "PayPal-Request-Id": params.senderBatchId
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: params.senderBatchId,
        email_subject: "Votre retrait Moni est en cours",
        email_message: "Moni a envoy\xE9 un retrait vers votre compte PayPal."
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: params.amount.toFixed(2),
            currency: params.currency
          },
          note: params.note,
          sender_item_id: `${params.senderBatchId}-item`,
          receiver: params.receiver,
          notification_language: "fr-FR"
        }
      ]
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = Array.isArray(payload?.details) ? payload.details.map((detail) => detail?.issue || detail?.description).filter(Boolean).join(" / ") : "";
    const debugId = payload?.debug_id || response.headers.get("paypal-debug-id") || void 0;
    const errorName = payload?.name || payload?.error || void 0;
    const rawMessage = details || payload?.message || payload?.name || `Erreur PayPal ${response.status}`;
    const isAuthorizationError = response.status === 403 || String(payload?.name || "").includes("AUTHORIZATION") || String(rawMessage).toLowerCase().includes("authorization");
    if (isAuthorizationError) {
      throw new PayPalApiError(
        "PayPal refuse ce retrait: le token contient le scope Payouts, mais le compte marchand ou l\u2019application Live n\u2019est pas autoris\xE9 \xE0 ex\xE9cuter les Payouts API pour ce compte.",
        {
          status: response.status,
          debugId,
          errorName,
          details,
          payload
        }
      );
    }
    throw new PayPalApiError(rawMessage, {
      status: response.status,
      debugId,
      errorName,
      details,
      payload
    });
  }
  return payload;
}

// api/paypal/payout/create.ts
var WALLET_CURRENCIES = ["USD", "EUR", "CDF", "XOF", "FCFA"];
var PAYPAL_PAYOUT_CURRENCIES = ["USD", "EUR"];
async function readJsonBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}
function sendMethodNotAllowed(res) {
  res.setHeader?.("Allow", ["POST", "OPTIONS"]);
  return sendJson(res, 405, { success: false, error: "M\xE9thode non autoris\xE9e." });
}
function normalizeWalletCurrency(value) {
  const currency = String(value || "").trim().toUpperCase();
  return WALLET_CURRENCIES.includes(currency) ? currency : "USD";
}
function normalizePayoutCurrency(value, fallback) {
  const currency = String(value || "").trim().toUpperCase();
  if (PAYPAL_PAYOUT_CURRENCIES.includes(currency)) return currency;
  if (PAYPAL_PAYOUT_CURRENCIES.includes(fallback)) return fallback;
  return "USD";
}
async function handler(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const amount = Number(body.amount || 0);
    const receiverEmail = String(body.receiverEmail || "").trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { success: false, error: "Montant invalide." });
    }
    if (!receiverEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) {
      return sendJson(res, 400, { success: false, error: "Compte PayPal invalide." });
    }
    const userPath = `users/${auth.uid}`;
    const userSnap = await getDocument(userPath, auth.token);
    if (!userSnap.exists) {
      return sendJson(res, 404, { success: false, error: "Utilisateur introuvable." });
    }
    const userData = userSnap.data;
    const balance = Number(userData.balance || 0);
    if (balance < amount) {
      return sendJson(res, 400, { success: false, error: "Solde insuffisant." });
    }
    const walletCurrency = normalizeWalletCurrency(body.currency || userData.preferredCurrency || userData.currency);
    const payoutCurrency = normalizePayoutCurrency(process.env.PAYPAL_PAYOUT_CURRENCY || body.payoutCurrency, walletCurrency);
    const conversion = await convertAmount(amount, walletCurrency, payoutCurrency);
    const payoutAmount = conversion.amount;
    const config = getPayPalConfig(req);
    assertPayPalConfig(config);
    const paypalToken = await getPayPalAccessToken(config);
    const paypalScopes = String(paypalToken.scope || "").split(" ").filter(Boolean);
    const hasPayoutScope = paypalScopes.some((scope) => scope.includes("/payments/payouts"));
    if (!hasPayoutScope) {
      return sendJson(res, 403, {
        success: false,
        provider: "paypal",
        error: "PayPal refuse ce retrait: le token OAuth de cette application ne contient pas le scope Payouts.",
        paypalAppId: paypalToken.app_id || null,
        paypalScopes
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
      note: `Retrait Moni ${amount.toFixed(2)} ${walletCurrency}`
    });
    const batchHeader = payout.batch_header || {};
    const batchStatus = String(batchHeader.batch_status || "PENDING");
    const payoutBatchId = String(batchHeader.payout_batch_id || "");
    const transactionId = createFirestoreId("paypal-wth-");
    const notificationId = createFirestoreId("notif-");
    const now = /* @__PURE__ */ new Date();
    await commitWrites(
      [
        incrementWrite(userPath, "balance", -amount, {
          lastTransactionTime: now
        }),
        updateWrite(
          `transactions/${transactionId}`,
          {
            userId: auth.uid,
            type: "withdraw",
            amount,
            status: batchStatus === "SUCCESS" ? "completed" : "pending",
            timestamp: now,
            title: "Retrait PayPal",
            description: batchStatus === "SUCCESS" ? `Envoy\xE9 \xE0 ${receiverEmail}` : `En cours vers ${receiverEmail}`,
            icon: "fab fa-paypal",
            color: "#0070BA",
            reference: senderBatchId,
            metadata: {
              provider: "paypal",
              integration: "Payouts",
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
              providerPayload: payout
            }
          },
          { exists: false }
        ),
        updateWrite(
          `notifications/${notificationId}`,
          {
            userId: auth.uid,
            type: "withdraw-completed",
            title: "Retrait PayPal lanc\xE9",
            message: `${payoutAmount.toFixed(2)} ${payoutCurrency} envoy\xE9s vers ${receiverEmail}.`,
            amount,
            timestamp: now,
            read: false,
            actionRequired: false,
            transactionId
          },
          { exists: false }
        )
      ],
      auth.token
    );
    return sendJson(res, 200, {
      success: true,
      transactionId,
      transactionStatus: batchStatus === "SUCCESS" ? "completed" : "pending",
      payoutBatchId,
      payoutBatchStatus: batchStatus,
      walletAmount: amount,
      walletCurrency,
      payoutAmount,
      payoutCurrency,
      receiverEmail,
      providerResponse: payout
    });
  } catch (error) {
    console.error("PayPal payout error:", error);
    const message = error?.message || "Impossible de lancer le retrait PayPal.";
    const paypalError = error instanceof PayPalApiError ? error : null;
    const status = message.includes("Non authentifi\xE9") ? 401 : message.includes("Payouts") ? 403 : 500;
    return sendJson(res, status, {
      success: false,
      error: message,
      provider: "paypal",
      debugId: paypalError?.debugId,
      paypalErrorName: paypalError?.errorName,
      paypalErrorDetails: paypalError?.details
    });
  }
}

module.exports = handler;
