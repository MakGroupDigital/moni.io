const WALLET_CURRENCIES = ['USD', 'EUR', 'CDF', 'XOF', 'FCFA'];

const DRC_MOBILE_MONEY_OPERATORS = {
  airtel: { id: 'airtel', label: 'Airtel Money', accountType: 1, prefixes: ['97', '98', '99'] },
  mpesa: { id: 'mpesa', label: 'M-Pesa', accountType: 2, prefixes: ['81', '82', '83', '86'] },
  orange: { id: 'orange', label: 'Orange Money', accountType: 3, prefixes: ['80', '84', '85', '89'] },
  africell: { id: 'africell', label: 'Africell Money', accountType: 4, prefixes: ['90', '91'] },
};

function sendJson(res, statusCode, body) {
  if (typeof res.end === 'function') {
    res.statusCode = statusCode;
    if (!res.headersSent) {
      res.setHeader?.('Content-Type', 'application/json; charset=utf-8');
    }
    return res.end(JSON.stringify(body));
  }

  return res.status?.(statusCode).json(body);
}

function sendNoContent(res, statusCode = 204) {
  if (typeof res.end === 'function') {
    res.statusCode = statusCode;
    return res.end();
  }

  return res.status?.(statusCode).end();
}

async function readJsonBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);

  if (typeof req.on === 'function') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
  }

  return {};
}

function getHeader(req, name) {
  const value = req.headers?.[name] || req.headers?.[name.toLowerCase()] || req.headers?.[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function getFirebaseAuthContext(req) {
  const authHeader = getHeader(req, 'authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    throw new Error('Non authentifié.');
  }

  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(decodeBase64Url(payload || ''));
    const uid = String(decoded.user_id || decoded.sub || '');

    if (!uid) throw new Error('UID manquant');
    if (decoded.exp && Number(decoded.exp) * 1000 < Date.now()) {
      throw new Error('Token expiré');
    }

    return {
      token,
      uid,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    throw new Error('Non authentifié.');
  }
}

function getProjectId() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Configuration Firestore manquante: VITE_FIREBASE_PROJECT_ID requis.');
  return projectId;
}

function databaseName() {
  return `projects/${getProjectId()}/databases/(default)/documents`;
}

function encodeDocumentPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function documentName(path) {
  return `${databaseName()}/${path}`;
}

function documentUrl(path) {
  return `https://firestore.googleapis.com/v1/${databaseName()}/${encodeDocumentPath(path)}`;
}

function toFirestoreValue(value) {
  if (value === undefined || value === null) return { nullValue: 'NULL_VALUE' };
  if (value instanceof Date) return { timestampValue: value.toISOString() };

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }

  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case 'object':
      return { mapValue: { fields: toFirestoreFields(value) } };
    default:
      return { stringValue: String(value) };
  }
}

function toFirestoreFields(data) {
  return Object.entries(data).reduce((fields, [key, value]) => {
    if (value !== undefined) fields[key] = toFirestoreValue(value);
    return fields;
  }, {});
}

function fromFirestoreValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function fromFirestoreFields(fields) {
  return Object.entries(fields).reduce((data, [key, value]) => {
    data[key] = fromFirestoreValue(value);
    return data;
  }, {});
}

function writePrecondition(precondition) {
  if (!precondition) return undefined;
  if (precondition.updateTime) return { updateTime: precondition.updateTime };
  if (precondition.exists !== undefined) return { exists: precondition.exists };
  return undefined;
}

function updateWrite(path, data, precondition) {
  return {
    update: {
      name: documentName(path),
      fields: toFirestoreFields(data),
    },
    updateMask: {
      fieldPaths: Object.keys(data).filter((key) => data[key] !== undefined),
    },
    currentDocument: writePrecondition(precondition),
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
            increment: toFirestoreValue(amount),
          },
        ],
      },
    };
  }

  return {
    update: {
      name: documentName(path),
      fields: toFirestoreFields(extraData),
    },
    updateMask: {
      fieldPaths: Object.keys(extraData).filter((key) => extraData[key] !== undefined),
    },
    updateTransforms: [
      {
        fieldPath,
        increment: toFirestoreValue(amount),
      },
    ],
  };
}

async function firestoreRequest(path, token, init) {
  const response = await fetch(documentUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (response.status === 404) {
    return { response, payload };
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.error?.status || `Erreur Firestore ${response.status}`;
    if (response.status === 401 || response.status === 403) throw new Error('Non authentifié.');
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
    data: fromFirestoreFields(payload.fields || {}),
  };
}

async function commitWrites(writes, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${databaseName()}:commit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ writes }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || payload?.error?.status || `Erreur Firestore ${response.status}`;
    if (response.status === 401 || response.status === 403) throw new Error('Non authentifié.');
    throw new Error(message);
  }

  return payload;
}

function createFirestoreId(prefix = '') {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now()}${random}`;
}

function normalizeWalletCurrency(value) {
  const currency = String(value || '').trim().toUpperCase();
  return WALLET_CURRENCIES.includes(currency) ? currency : 'USD';
}

function roundForCurrency(amount, currency) {
  if (['CDF', 'XOF', 'FCFA'].includes(currency)) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

function calculateWithdrawalFee(amount, currency) {
  const normalizedCurrency = normalizeWalletCurrency(currency);
  const numericAmount = Number(amount || 0);
  const minimum = normalizedCurrency === 'CDF' ? 1000 : 1;
  const onePercentLimit = normalizedCurrency === 'CDF' ? 100000 : 100;

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { feeRate: 0, feeAmount: 0, totalDebit: 0, minimum, onePercentLimit };
  }

  const feeRate = numericAmount >= minimum && numericAmount <= onePercentLimit ? 0.01 : 0.02;
  const feeAmount = roundForCurrency(numericAmount * feeRate, normalizedCurrency);
  const totalDebit = roundForCurrency(numericAmount + feeAmount, normalizedCurrency);

  return { feeRate, feeAmount, totalDebit, minimum, onePercentLimit };
}

function getCongoleseNationalDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('243')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function normalizeCongolesePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('243')) return digits;
  if (digits.startsWith('0')) return `243${digits.slice(1)}`;
  if (digits.length === 9) return `243${digits}`;
  return digits;
}

function detectDrcMobileMoneyOperator(value) {
  const nationalDigits = getCongoleseNationalDigits(value);
  if (nationalDigits.length < 2) return '';

  const prefix = nationalDigits.slice(0, 2);
  const match = Object.values(DRC_MOBILE_MONEY_OPERATORS).find((operator) => operator.prefixes.includes(prefix));
  return match?.id || '';
}

module.exports = {
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
  roundForCurrency,
  calculateWithdrawalFee,
  getCongoleseNationalDigits,
  normalizeCongolesePhone,
  detectDrcMobileMoneyOperator,
};
