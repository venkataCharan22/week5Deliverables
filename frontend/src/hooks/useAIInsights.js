import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';

export function useAIInsights() {
  const { user } = useAuthContext();
  const uid = user?.uid;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'settings', 'ai_setup'));
        if (!cancelled && snap.exists()) {
          setData(snap.data());
        }
      } catch (err) {
        console.error('AI insights fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [uid]);

  return {
    insights: data?.business_insights || [],
    tips: data?.tips || [],
    greeting: data?.ai_greeting || '',
    welcomeMessage: data?.welcome_message || '',
    loading,
  };
}
