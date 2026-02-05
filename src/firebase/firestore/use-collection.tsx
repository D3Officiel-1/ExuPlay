
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  queryEqual,
} from 'firebase/firestore';

export function useCollection<T = DocumentData>(queryInstance: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Maintain a stable reference to the Firestore query to prevent infinite re-subscription loops.
  // This is necessary because the 'queryInstance' object identity might change even if it represents the same query.
  const stableQuery = useRef<Query<T> | null>(null);

  if (queryInstance && (!stableQuery.current || !queryEqual(queryInstance, stableQuery.current))) {
    stableQuery.current = queryInstance;
  } else if (!queryInstance && stableQuery.current) {
    stableQuery.current = null;
  }

  useEffect(() => {
    const activeQuery = stableQuery.current;
    if (!activeQuery) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T));
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [stableQuery.current]);

  return { data, loading, error };
}
