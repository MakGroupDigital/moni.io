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

// api/maxicash/deposit/status.ts
var status_exports = {};
__export(status_exports, {
  default: () => handler
});
module.exports = __toCommonJS(status_exports);

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

// api/_lib/maxicash.ts
var DEFAULT_LIVE_WEBAPI = "https://webapi.maxicashapp.com";
var DEFAULT_SANDBOX_WEBAPI = "https://webapi-test.maxicashapp.com";
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
async function parseMaxiCashResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { ResponseStatus: response.ok ? "Success" : "Failed", ResponseError: text };
  }
}
async function checkMaxiCashPaymentStatusByReference(reference, transactionId) {
  const config = getMaxiCashConfig();
  assertMaxiCashConfig(config);
  const payload = {
    MerchantID: config.merchantId,
    MerchantPassword: config.merchantPassword,
    Reference: reference,
    TransactionID: transactionId || ""
  };
  const postResponse = await fetch(config.checkPaymentStatusByReferenceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  const postPayload = await parseMaxiCashResponse(postResponse);
  if (postResponse.ok && postPayload) return postPayload;
  const url = new URL(config.checkPaymentStatusByReferenceUrl);
  url.searchParams.set("MerchantID", config.merchantId);
  url.searchParams.set("MerchantPassword", config.merchantPassword);
  url.searchParams.set("Reference", reference);
  if (transactionId) url.searchParams.set("TransactionID", transactionId);
  const getResponse = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  const getPayload = await parseMaxiCashResponse(getResponse);
  if (!getResponse.ok) {
    return postPayload || getPayload || { ResponseStatus: "Failed", ResponseError: `Status check failed (${getResponse.status})` };
  }
  return getPayload;
}

// api/maxicash/deposit/status.ts
var FAIL_AFTER_MS = 15 * 60 * 1e3;
async function readJsonBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}
function sendMethodNotAllowed(res) {
  res.setHeader?.("Allow", ["POST", "OPTIONS"]);
  return sendJson(res, 405, { success: false, error: "M\xE9thode non autoris\xE9e." });
}
function getProviderTransactionId(payload, fallback) {
  return String(payload?.TransactionID || payload?.transactionID || payload?.TransactionId || payload?.transactionId || fallback || "") || null;
}
function getTransactionAgeMs(transaction) {
  const timestamp = transaction.timestamp;
  if (timestamp instanceof Date) return Date.now() - timestamp.getTime();
  if (timestamp) return Date.now() - new Date(String(timestamp)).getTime();
  if (transaction.createdAt) return Date.now() - new Date(String(transaction.createdAt)).getTime();
  return 0;
}
async function creditCompletedDeposit(params) {
  const now = /* @__PURE__ */ new Date();
  const userPath = `users/${params.uid}`;
  const metadata = {
    ...params.transaction.metadata || {},
    statusCheckPayload: params.statusPayload || null,
    statusCheckStatus: params.status || null,
    providerTransactionId: params.providerTransactionId,
    lastCheckedAt: now,
    completionVerified: true
  };
  const notificationId = createFirestoreId("notif-");
  await commitWrites(
    [
      incrementWrite(userPath, "balance", params.amountToCredit, {
        currency: params.walletCurrency,
        preferredCurrency: params.walletCurrency,
        lastTransactionTime: now
      }),
      updateWrite(
        params.transactionPath,
        {
          status: "completed",
          description: `Confirm\xE9 via ${params.transaction.metadata?.operatorLabel || "Mobile Money"}`,
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
          message: `${params.amountToCredit.toLocaleString()} ${params.walletCurrency} ajout\xE9s \xE0 votre portefeuille.`,
          amount: params.amountToCredit,
          timestamp: now,
          read: false,
          actionRequired: false,
          transactionId: params.transactionId
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
    const transactionId = String(body.transactionId || "").trim();
    if (!transactionId) {
      return sendJson(res, 400, { success: false, error: "Transaction introuvable." });
    }
    const transactionPath = `transactions/${transactionId}`;
    const transactionSnap = await getDocument(transactionPath, auth.token);
    if (!transactionSnap.exists) {
      return sendJson(res, 404, { success: false, error: "Transaction introuvable." });
    }
    const transaction = transactionSnap.data;
    if (transaction.userId !== auth.uid) {
      return sendJson(res, 403, { success: false, error: "Acc\xE8s refus\xE9." });
    }
    if (transaction.type !== "deposit" || transaction.metadata?.provider !== "maxicash") {
      return sendJson(res, 400, { success: false, error: "Cette transaction n\u2019est pas un d\xE9p\xF4t Mobile Money." });
    }
    const amountToCredit = Number(transaction.amount || transaction.metadata?.creditedAmount || 0);
    const walletCurrency = String(transaction.metadata?.walletCurrency || "USD");
    if (transaction.status === "completed") {
      return sendJson(res, 200, {
        success: true,
        transactionStatus: "completed",
        transactionId,
        creditedAmount: amountToCredit,
        walletCurrency,
        message: "D\xE9p\xF4t d\xE9j\xE0 confirm\xE9."
      });
    }
    const reference = String(transaction.reference || transaction.metadata?.reference || "").trim();
    if (!reference) {
      return sendJson(res, 400, { success: false, error: "R\xE9f\xE9rence MaxiCash manquante." });
    }
    const previousProviderTransactionId = transaction.metadata?.providerTransactionId || transaction.metadata?.providerPayload?.TransactionID || null;
    const statusPayload = await checkMaxiCashPaymentStatusByReference(reference, previousProviderTransactionId);
    const providerTransactionId = getProviderTransactionId(statusPayload, previousProviderTransactionId);
    const status = extractMaxiCashStatus(statusPayload);
    const providerError = getMaxiCashErrorMessage(statusPayload, "");
    const ageMs = getTransactionAgeMs(transaction);
    if (hasCompletedMaxiCashPayment(statusPayload)) {
      try {
        await creditCompletedDeposit({
          token: auth.token,
          uid: auth.uid,
          transactionId,
          transactionPath,
          transactionUpdateTime: transactionSnap.updateTime,
          transaction,
          statusPayload,
          status,
          providerTransactionId,
          amountToCredit,
          walletCurrency
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
        responseStatus: status,
        error: "",
        message: "D\xE9p\xF4t confirm\xE9.",
        creditedAmount: amountToCredit,
        walletCurrency,
        providerResponse: statusPayload
      });
    }
    const now = /* @__PURE__ */ new Date();
    const metadata = {
      ...transaction.metadata || {},
      statusCheckPayload: statusPayload || null,
      statusCheckStatus: status || null,
      providerTransactionId,
      lastCheckedAt: now,
      providerError: providerError || null
    };
    if (hasFailedMaxiCashPayment(statusPayload, status)) {
      const shouldFail = isImmediateMaxiCashFailure(statusPayload, status) || ageMs >= FAIL_AFTER_MS;
      await commitWrites(
        [
          updateWrite(
            transactionPath,
            {
              status: shouldFail ? "failed" : "pending",
              description: shouldFail ? `\xC9chec: ${providerError || "paiement refus\xE9"}` : "Confirmez le paiement sur votre t\xE9l\xE9phone",
              updatedAt: now,
              failedAt: shouldFail ? now : void 0,
              metadata
            },
            transactionSnap.updateTime ? { updateTime: transactionSnap.updateTime } : void 0
          )
        ],
        auth.token
      );
      return sendJson(res, shouldFail ? 502 : 200, {
        success: !shouldFail,
        transactionStatus: shouldFail ? "failed" : "pending",
        transactionId,
        reference,
        providerTransactionId,
        responseStatus: status,
        error: shouldFail ? providerError || "Paiement refus\xE9." : "",
        message: shouldFail ? "Paiement refus\xE9." : "Paiement en attente de confirmation.",
        creditedAmount: amountToCredit,
        walletCurrency,
        providerResponse: statusPayload
      });
    }
    await commitWrites(
      [
        updateWrite(
          transactionPath,
          {
            status: "pending",
            description: "Confirmez le paiement sur votre t\xE9l\xE9phone",
            updatedAt: now,
            metadata
          },
          transactionSnap.updateTime ? { updateTime: transactionSnap.updateTime } : void 0
        )
      ],
      auth.token
    );
    return sendJson(res, 200, {
      success: true,
      transactionStatus: "pending",
      transactionId,
      reference,
      providerTransactionId,
      responseStatus: status,
      error: "",
      message: "Paiement en attente de confirmation.",
      creditedAmount: amountToCredit,
      walletCurrency,
      providerResponse: statusPayload
    });
  } catch (error) {
    console.error("MaxiCash deposit status error:", error);
    const message = error?.message || "Impossible de v\xE9rifier le d\xE9p\xF4t.";
    const status = message.includes("Non authentifi\xE9") ? 401 : 500;
    return sendJson(res, status, {
      success: false,
      error: message
    });
  }
}

module.exports = handler;
