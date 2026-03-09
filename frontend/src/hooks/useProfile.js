import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';

function lsKey(uid) {
  return `bizbuddy_profile_${uid}`;
}

function readLocalProfile(uid) {
  if (!uid) return null;
  try {
    const stored = localStorage.getItem(lsKey(uid));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useProfile() {
  const { user } = useAuthContext();
  const uid = user?.uid;

  const [profile, setProfile] = useState(() => readLocalProfile(uid));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Read from localStorage first for instant display
    const local = readLocalProfile(uid);
    if (local) setProfile(local);

    let cancelled = false;

    async function sync() {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'settings', 'profile'));
        if (!cancelled && snap.exists()) {
          const data = snap.data();
          setProfile(data);
          localStorage.setItem(lsKey(uid), JSON.stringify(data));
        }
      } catch (err) {
        console.error('Profile sync error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    sync();
    return () => { cancelled = true; };
  }, [uid]);

  const saveProfile = useCallback(async (data) => {
    if (!uid) return;

    const firestoreData = {
      ...data,
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid, 'settings', 'profile'), firestoreData);

    const localData = { ...data, onboardingComplete: true, updatedAt: new Date().toISOString() };
    localStorage.setItem(lsKey(uid), JSON.stringify(localData));
    setProfile(localData);
  }, [uid]);

  return { profile, loading, saveProfile };
}
