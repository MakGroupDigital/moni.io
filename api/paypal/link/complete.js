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

// api/paypal/link/complete.ts
var complete_exports = {};
__export(complete_exports, {
  default: () => handler
});
module.exports = __toCommonJS(complete_exports);

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

// api/_lib/paypal.ts
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
async function exchangePayPalCode(config, code) {
  const response = await fetch(`${config.apiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || `Erreur PayPal ${response.status}`);
  }
  return payload;
}
async function fetchPayPalUserInfo(config, accessToken) {
  const response = await fetch(`${config.apiBaseUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || `Erreur PayPal ${response.status}`);
  }
  return payload;
}

// api/paypal/link/complete.ts
async function readJsonBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}
function sendMethodNotAllowed(res) {
  res.setHeader?.("Allow", ["POST", "OPTIONS"]);
  return sendJson(res, 405, { success: false, error: "M\xE9thode non autoris\xE9e." });
}
async function handler(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  try {
    const auth = getFirebaseAuthContext(req);
    const body = await readJsonBody(req);
    const code = String(body.code || "");
    const state = String(body.state || "");
    if (!code || !state) {
      return sendJson(res, 400, { success: false, error: "Code PayPal ou \xE9tat manquant." });
    }
    const statePath = `paypalLinkStates/${state}`;
    const stateSnap = await getDocument(statePath, auth.token);
    if (!stateSnap.exists || stateSnap.data.uid !== auth.uid) {
      return sendJson(res, 400, { success: false, error: "Session PayPal invalide." });
    }
    if (stateSnap.data.status === "linked") {
      return sendJson(res, 200, { success: true, paypalEmail: stateSnap.data.paypalEmail || null });
    }
    const config = getPayPalConfig(req);
    assertPayPalConfig(config);
    const token = await exchangePayPalCode(config, code);
    const profile = await fetchPayPalUserInfo(config, token.access_token);
    const paypalEmail = String(profile.email || profile.emails?.[0]?.value || "");
    const paypalPayerId = String(profile.user_id || profile.payer_id || profile.sub || "");
    if (!paypalEmail && !paypalPayerId) {
      throw new Error("PayPal n\u2019a pas retourn\xE9 les informations du compte.");
    }
    const now = /* @__PURE__ */ new Date();
    await commitWrites(
      [
        updateWrite(`users/${auth.uid}`, {
          paypalLinked: true,
          paypalEmail: paypalEmail || null,
          paypalPayerId: paypalPayerId || null,
          paypalLinkedAt: now
        }),
        updateWrite(
          statePath,
          {
            status: "linked",
            paypalEmail: paypalEmail || null,
            paypalPayerId: paypalPayerId || null,
            linkedAt: now
          },
          stateSnap.updateTime ? { updateTime: stateSnap.updateTime } : void 0
        )
      ],
      auth.token
    );
    return sendJson(res, 200, {
      success: true,
      paypalEmail,
      paypalPayerId
    });
  } catch (error) {
    console.error("PayPal link complete error:", error);
    const message = error?.message || "Impossible de finaliser la liaison PayPal.";
    const status = message.includes("Non authentifi\xE9") ? 401 : 500;
    return sendJson(res, status, { success: false, error: message });
  }
}
