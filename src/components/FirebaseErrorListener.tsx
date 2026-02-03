'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      // In development, we want to throw the error to trigger the Next.js error overlay
      if (process.env.NODE_ENV === 'development') {
        // Wrap in a custom message that the developer will see in the overlay
        const developerMessage = `
          Firestore Security Rules Denied Request:
          Path: ${error.path}
          Operation: ${error.operation}
          Data: ${JSON.stringify(error.requestResourceData, null, 2)}
        `;
        console.error(developerMessage, error);
        
        // We throw it in a timeout to ensure it's not caught by the promise chain that emitted it
        setTimeout(() => {
          throw error;
        }, 0);
      } else {
        // In production, we show a professional toast
        toast({
          variant: 'destructive',
          title: 'Action restreinte',
          description: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette modification.',
        });
      }
    });

    return unsubscribe;
  }, [toast]);

  return null;
}
