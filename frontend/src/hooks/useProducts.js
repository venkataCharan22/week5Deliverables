import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';

export function useProducts() {
  const { user } = useAuthContext();
  const uid = user?.uid;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const col = collection(db, 'users', uid, 'products');
    const q = query(col, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(data);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore listen error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  const addProduct = useCallback(async (product) => {
    if (!uid) return;
    const col = collection(db, 'users', uid, 'products');
    const docRef = await addDoc(col, {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...product };
  }, [uid]);

  const updateProduct = useCallback(async (id, updates) => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'products', id);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  }, [uid]);

  const deleteProduct = useCallback(async (id) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'products', id));
  }, [uid]);

  return { products, loading, error, addProduct, updateProduct, deleteProduct };
}
