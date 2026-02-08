import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAxPnjjaZo3gxCdjuFjxltg3twS_AYSaIU",
  authDomain: "moni-io.firebaseapp.com",
  projectId: "moni-io",
  storageBucket: "moni-io.firebasestorage.app",
  messagingSenderId: "697501419455",
  appId: "1:697501419455:web:ac91c99f1156c64016c30a",
  measurementId: "G-1ELMV1XS1B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;
