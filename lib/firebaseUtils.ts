import { setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { AuthUser } from '../types';

// Initialiser le profil utilisateur avec des données par défaut
export const initializeUserProfile = async (user: AuthUser) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      ...user,
      balance: 1250500,
      paypalBalance: 145.00,
      createdAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error initializing user profile:', error);
  }
};
