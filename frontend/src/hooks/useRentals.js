import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';

export function useRentals() {
  const { user } = useAuthContext();
  const uid = user?.uid;
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setRentals([]);
      setLoading(false);
      return;
    }

    const col = collection(db, 'users', uid, 'rentals');
    // Only filter by status — sort client-side to avoid composite index requirement
    const q = query(col, where('status', '==', 'active'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ...raw,
            // Firestore Timestamps → JS Date
            returnDate: raw.returnDate?.toDate ? raw.returnDate.toDate() : new Date(raw.returnDate),
            createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate() : new Date(raw.createdAt),
          };
        });
        // Sort by returnDate ascending (soonest first)
        data.sort((a, b) => a.returnDate - b.returnDate);
        setRentals(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Rentals listen error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [uid]);

  // Rentals due within 24 hours or overdue
  const urgentRentals = rentals.filter((r) => {
    const now = new Date();
    const diff = r.returnDate - now;
    return diff < 24 * 60 * 60 * 1000; // less than 24h away (or overdue)
  });

  return { rentals, urgentRentals, loading, error };
}
