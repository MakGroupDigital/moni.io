import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

interface StoredBiometricAuth {
  enabled?: boolean;
  credentialId?: string;
  type?: string;
  platform?: string;
}

export interface BiometricAuthState {
  available: boolean;
  enabled: boolean;
  credentialId?: string;
  reason?: string;
}

const BIOMETRIC_PLATFORM = 'webauthn-platform';

const publicKeyCredential = () => {
  if (typeof window === 'undefined') return null;
  return window.PublicKeyCredential as (typeof PublicKeyCredential & {
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  }) | undefined;
};

const createRandomBuffer = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes.buffer;
};

const toBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return buffer;
};

const userHandleFromUid = async (uid: string) => {
  const encoded = new TextEncoder().encode(uid);
  return crypto.subtle.digest('SHA-256', encoded);
};

const getStoredBiometricAuth = async (uid: string): Promise<StoredBiometricAuth> => {
  const userSnapshot = await getDoc(doc(db, 'users', uid));
  const data = userSnapshot.exists() ? userSnapshot.data() : {};
  return (data?.biometricAuth || {}) as StoredBiometricAuth;
};

export const isBiometricSupported = async () => {
  const credentialConstructor = publicKeyCredential();

  if (!credentialConstructor || !navigator.credentials) {
    return false;
  }

  if (!window.isSecureContext) {
    return false;
  }

  try {
    return Boolean(await credentialConstructor.isUserVerifyingPlatformAuthenticatorAvailable?.());
  } catch {
    return false;
  }
};

export const getBiometricAuthState = async (uid: string): Promise<BiometricAuthState> => {
  const available = await isBiometricSupported();
  const stored = await getStoredBiometricAuth(uid);

  return {
    available,
    enabled: Boolean(stored.enabled && stored.credentialId),
    credentialId: stored.credentialId,
    reason: available
      ? undefined
      : 'La biométrie n’est pas disponible sur ce navigateur ou ce contexte. Utilisez HTTPS, localhost ou l’app ajoutée à l’écran d’accueil.',
  };
};

export const registerBiometricAuthenticator = async (uid: string, displayName: string, email: string) => {
  if (!(await isBiometricSupported())) {
    throw new Error('La biométrie n’est pas disponible sur cet appareil ou ce navigateur.');
  }

  const existing = await getStoredBiometricAuth(uid);
  const excludeCredentials = existing.credentialId
    ? [{
        id: fromBase64Url(existing.credentialId),
        type: 'public-key' as const,
        transports: ['internal'] as AuthenticatorTransport[],
      }]
    : undefined;

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: createRandomBuffer(),
      rp: {
        name: 'Moni.io',
      },
      user: {
        id: await userHandleFromUid(uid),
        name: email || displayName || uid,
        displayName: displayName || email || 'Utilisateur Moni',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        requireResidentKey: false,
        userVerification: 'required',
      },
      excludeCredentials,
      timeout: 60000,
      attestation: 'none',
    },
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Aucune authentification biométrique n’a été créée.');
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      biometricAuth: {
        enabled: true,
        credentialId: toBase64Url(credential.rawId),
        type: credential.type,
        platform: BIOMETRIC_PLATFORM,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    },
    { merge: true }
  );

  return true;
};

export const authenticateWithBiometric = async (uid: string) => {
  if (!(await isBiometricSupported())) {
    throw new Error('La biométrie n’est pas disponible sur cet appareil.');
  }

  const stored = await getStoredBiometricAuth(uid);

  if (!stored.enabled || !stored.credentialId) {
    throw new Error('La biométrie n’est pas encore activée pour ce compte.');
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: createRandomBuffer(),
      allowCredentials: [
        {
          id: fromBase64Url(stored.credentialId),
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Authentification biométrique annulée.');
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      biometricAuth: {
        lastUsedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    },
    { merge: true }
  );

  return true;
};

export const disableBiometricAuthenticator = async (uid: string) => {
  await setDoc(
    doc(db, 'users', uid),
    {
      biometricAuth: {
        enabled: false,
        credentialId: null,
        disabledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    },
    { merge: true }
  );
};
