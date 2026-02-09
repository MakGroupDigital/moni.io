import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Générer un numéro Moni unique basé sur l'UID
const generateMoniNumber = (uid: string): string => {
  // Utiliser les 8 derniers caractères du UID en base 10
  const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const uniqueNumber = Math.abs(hash % 1000000).toString().padStart(6, '0');
  return `MN1000${uniqueNumber}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          
          // Générer un numéro Moni unique basé sur l'UID
          const moniNumber = generateMoniNumber(fbUser.uid);
          
          // Créer un utilisateur minimal immédiatement
          const minimalUser: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'User',
            photoURL: fbUser.photoURL || undefined,
            moniNumber,
            balance: 0,
            paypalBalance: 0,
            createdAt: new Date()
          };

          setUser(minimalUser);
          setFirebaseUser(fbUser);
          setLoading(false);

          // Essayer de récupérer/créer le document utilisateur en arrière-plan
          try {
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
              // Créer un nouvel utilisateur dans Firestore avec le numéro Moni
              await setDoc(userRef, {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'User',
                photoURL: fbUser.photoURL || undefined,
                moniNumber,
                balance: 0,
                paypalBalance: 0,
                createdAt: Timestamp.now()
              });
            } else {
              // Mettre à jour avec les données de Firestore
              const userData = userDoc.data();
              // S'assurer que le moniNumber et displayName sont définis
              if (!userData?.moniNumber || !userData?.displayName) {
                await setDoc(userRef, { 
                  ...userData, 
                  moniNumber: userData?.moniNumber || moniNumber,
                  displayName: userData?.displayName || fbUser.displayName || 'User'
                }, { merge: true });
              }
              // Convertir les données correctement
              const convertedUser: AuthUser = {
                uid: userData?.uid || fbUser.uid,
                email: userData?.email || fbUser.email || '',
                displayName: userData?.displayName || fbUser.displayName || 'User',
                photoURL: userData?.photoURL || fbUser.photoURL || undefined,
                moniNumber: userData?.moniNumber || moniNumber,
                balance: userData?.balance || 0,
                paypalBalance: userData?.paypalBalance || 0,
                createdAt: userData?.createdAt?.toDate?.() || new Date()
              };
              setUser(convertedUser);
            }
          } catch (firestoreError) {
            console.warn('Firestore error (offline?):', firestoreError);
            // Continuer avec l'utilisateur minimal
          }

          // Écouter les changements du document utilisateur en temps réel
          const unsubscribeSnapshot = onSnapshot(
            userRef,
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                // Convertir les données correctement
                const convertedUser: AuthUser = {
                  uid: userData?.uid || fbUser.uid,
                  email: userData?.email || fbUser.email || '',
                  displayName: userData?.displayName || fbUser.displayName || 'User',
                  photoURL: userData?.photoURL || fbUser.photoURL || undefined,
                  moniNumber: userData?.moniNumber || moniNumber,
                  balance: userData?.balance || 0,
                  paypalBalance: userData?.paypalBalance || 0,
                  createdAt: userData?.createdAt?.toDate?.() || new Date()
                };
                setUser(convertedUser);
              }
            },
            (error) => {
              console.warn('Error listening to user data:', error);
            }
          );

          // Retourner une fonction de nettoyage qui désabonne le listener
          return unsubscribeSnapshot;
        } catch (error) {
          console.error('Error setting up user:', error);
          // Créer un utilisateur minimal même en cas d'erreur
          const moniNumber = generateMoniNumber(fbUser.uid);
          const minimalUser: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'User',
            photoURL: fbUser.photoURL || undefined,
            moniNumber,
            balance: 0,
            paypalBalance: 0,
            createdAt: new Date()
          };
          setUser(minimalUser);
          setFirebaseUser(fbUser);
          setLoading(false);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
