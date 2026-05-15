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

// api/paypal/link/start.ts
var start_exports = {};
__export(start_exports, {
  default: () => handler
});
module.exports = __toCommonJS(start_exports);

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
function documentName(path) {
  return `${databaseName()}/${path}`;
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

// api/paypal/link/start.ts
function sendMethodNotAllowed(res) {
  res.setHeader?.("Allow", ["POST", "OPTIONS"]);
  return sendJson(res, 405, { success: false, error: "M\xE9thode non autoris\xE9e." });
}
async function handler(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  try {
    const auth = getFirebaseAuthContext(req);
    const config = getPayPalConfig(req);
    assertPayPalConfig(config);
    const state = createFirestoreId("pp-");
    await saveDocument(
      `paypalLinkStates/${state}`,
      {
        uid: auth.uid,
        status: "created",
        env: config.env,
        redirectUri: config.redirectUri,
        createdAt: /* @__PURE__ */ new Date()
      },
      auth.token,
      { exists: false }
    );
    const params = new URLSearchParams({
      flowEntry: "static",
      client_id: config.clientId,
      response_type: "code",
      scope: "openid profile email",
      redirect_uri: config.redirectUri,
      state
    });
    return sendJson(res, 200, {
      success: true,
      approvalUrl: `${config.authorizeUrl}?${params.toString()}`,
      state
    });
  } catch (error) {
    console.error("PayPal link start error:", error);
    const message = error?.message || "Impossible de d\xE9marrer la liaison PayPal.";
    const status = message.includes("Non authentifi\xE9") ? 401 : 500;
    return sendJson(res, status, { success: false, error: message });
  }
}
