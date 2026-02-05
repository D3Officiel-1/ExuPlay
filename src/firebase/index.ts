
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { useMemo, useRef } from 'react';

export function initializeFirebase(): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
} {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  return { app, db, auth };
}

/**
 * Custom hook for stabilizing Firebase references/queries.
 * Uses Firestore's native isEqual methods to ensure stability across renders.
 */
export function useMemoFirebase<T extends { isEqual: (other: T) => boolean } | null | undefined>(
  factory: () => T,
  deps: any[]
): T {
  const value = useMemo(factory, deps);
  const ref = useRef<T>(undefined);

  const areEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a && b && typeof a.isEqual === 'function') {
      try {
        return a.isEqual(b);
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  if (ref.current === undefined || !areEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current as T;
}

export { FirebaseProvider, useFirebaseApp, useFirestore, useAuth } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
