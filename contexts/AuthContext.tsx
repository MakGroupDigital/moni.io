import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userRef);

          let userData: AuthUser;

          if (userDoc.exists()) {
            // L'utilisateur existe déjà, utiliser ses données
            userData = userDoc.data() as AuthUser;
          } else {
            // Créer un nouvel utilisateur
            userData = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'User',
              photoURL: fbUser.photoURL || undefined,
              moniNumber: `MN1000${Math.floor(Math.random() * 10000)}`,
              balance: 0,
              paypalBalance: 0,
              createdAt: new Date()
            };

            // Sauvegarder le nouvel utilisateur dans Firestore
            await setDoc(userRef, userData);
          }

          setUser(userData);
          setFirebaseUser(fbUser);
          setLoading(false);

          // Écouter les changements du document utilisateur en temps réel
          const unsubscribeSnapshot = onSnapshot(
            userRef,
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const updatedUserData = docSnapshot.data() as AuthUser;
                setUser(updatedUserData);
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
