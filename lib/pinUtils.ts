import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

const PIN_PREFIX = 'MONI_TRANSACTION_PIN';

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

export const hashPin = async (uid: string, pin: string): Promise<string> => {
  const payload = `${PIN_PREFIX}:${uid}:${pin}`;
  const encoded = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(digest);
};

export const getUserPinState = async (uid: string) => {
  const userSnapshot = await getDoc(doc(db, 'users', uid));
  const data = userSnapshot.exists() ? userSnapshot.data() : {};

  return {
    exists: Boolean(data?.transactionPinHash),
    hash: data?.transactionPinHash as string | undefined
  };
};

export const setTransactionPin = async (uid: string, pin: string) => {
  if (!isValidPin(pin)) {
    throw new Error('Le PIN doit contenir 4 à 6 chiffres.');
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      transactionPinHash: await hashPin(uid, pin),
      transactionPinSetAt: Timestamp.now()
    },
    { merge: true }
  );
};

export const verifyTransactionPin = async (uid: string, pin: string) => {
  if (!isValidPin(pin)) {
    return false;
  }

  const state = await getUserPinState(uid);
  if (!state.hash) {
    return false;
  }

  return state.hash === await hashPin(uid, pin);
};
