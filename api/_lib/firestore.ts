type ApiRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

export interface FirebaseAuthContext {
  token: string;
  uid: string;
  email?: string;
  name?: string;
}

export interface FirestoreDocument {
  exists: boolean;
  name?: string;
  updateTime?: string;
  data: Record<string, any>;
}

type Precondition = {
  exists?: boolean;
  updateTime?: string;
};

function getProjectId() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Configuration Firestore manquante: VITE_FIREBASE_PROJECT_ID requis.');
  return projectId;
}

function databaseName() {
  return `projects/${getProjectId()}/databases/(default)/documents`;
}

function encodeDocumentPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function documentName(path: string) {
  return `${databaseName()}/${path}`;
}

function documentUrl(path: string) {
  return `https://firestore.googleapis.com/v1/${databaseName()}/${encodeDocumentPath(path)}`;
}

function getHeader(req: ApiRequest, name: string) {
  const value = req.headers?.[name] || req.headers?.[name.toLowerCase()] || req.headers?.[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function getFirebaseAuthContext(req: ApiRequest): FirebaseAuthContext {
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

function toFirestoreValue(value: any): Record<string, any> {
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

function toFirestoreFields(data: Record<string, any>) {
  return Object.entries(data).reduce<Record<string, any>>((fields, [key, value]) => {
    if (value !== undefined) fields[key] = toFirestoreValue(value);
    return fields;
  }, {});
}

function fromFirestoreValue(value: Record<string, any>): any {
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

function fromFirestoreFields(fields: Record<string, any>) {
  return Object.entries(fields).reduce<Record<string, any>>((data, [key, value]) => {
    data[key] = fromFirestoreValue(value);
    return data;
  }, {});
}

function writePrecondition(precondition?: Precondition) {
  if (!precondition) return undefined;
  if (precondition.updateTime) return { updateTime: precondition.updateTime };
  if (precondition.exists !== undefined) return { exists: precondition.exists };
  return undefined;
}

export function updateWrite(path: string, data: Record<string, any>, precondition?: Precondition) {
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

export function incrementWrite(path: string, fieldPath: string, amount: number, extraData?: Record<string, any>) {
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

async function firestoreRequest(path: string, token: string, init?: RequestInit) {
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

export async function getDocument(path: string, token: string): Promise<FirestoreDocument> {
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

export async function commitWrites(writes: Record<string, any>[], token: string) {
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

export async function saveDocument(
  path: string,
  data: Record<string, any>,
  token: string,
  precondition?: Precondition
) {
  const payload = await commitWrites([updateWrite(path, data, precondition)], token);
  return payload?.writeResults?.[0]?.updateTime as string | undefined;
}

export function createFirestoreId(prefix = '') {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now()}${random}`;
}
