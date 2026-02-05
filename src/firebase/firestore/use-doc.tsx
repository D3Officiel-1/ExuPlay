
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentSnapshot,
  DocumentData,
  refEqual,
} from 'firebase/firestore';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Maintain a stable reference to the Firestore document to prevent infinite re-subscription loops.
  // This is necessary because the 'ref' object identity might change even if it points to the same path.
  const stableRef = useRef<DocumentReference<T> | null>(null);

  if (ref && (!stableRef.current || !refEqual(ref, stableRef.current))) {
    stableRef.current = ref;
  } else if (!ref && stableRef.current) {
    stableRef.current = null;
  }

  useEffect(() => {
    const activeRef = stableRef.current;
    if (!activeRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      activeRef,
      (snapshot: DocumentSnapshot<T>) => {
        const newData = snapshot.exists()
          ? ({ ...snapshot.data(), id: snapshot.id } as T)
          : null;
        
        setData(newData);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [stableRef.current]);

  return { data, loading, error };
}
