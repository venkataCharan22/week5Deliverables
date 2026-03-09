import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBnyx9N-HvbrtjvNCguZfhXOkeDMJrxG-Q",
  authDomain: "business-2367b.firebaseapp.com",
  projectId: "business-2367b",
  storageBucket: "business-2367b.firebasestorage.app",
  messagingSenderId: "790562132091",
  appId: "1:790562132091:web:84fb043882aec95f9192de",
  measurementId: "G-P1YL8LT15B",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
