import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem('bizbuddy_profile');
  }, []);

  return { user, loading, signIn, signUp, signInWithGoogle, signOut };
}
