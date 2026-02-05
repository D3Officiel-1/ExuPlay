"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { verifyPasskey } from "@/lib/passkey";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ShieldCheck, Loader2, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * @fileOverview Un écran de verrouillage biométrique global ultra-réactif.
 * Se déclenche au montage et à chaque fois que l'app revient au premier plan.
 */

export function BiometricLock() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const hasAttemptedAutoAuth = useRef(false);

  const userRef = user?.uid ? doc(db, "users", user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Fonction d'authentification mémoïsée
  const handleUnlock = useCallback(async () => {
    if (!profile?.passkeyId || authenticating) return;
    
    setAuthenticating(true);
    try {
      const success = await verifyPasskey(profile.passkeyId);
      if (success) {
        sessionStorage.setItem(`auth_${user?.uid}`, "true");
        setLocked(false);
        toast({ title: "Accès autorisé", description: "Votre Sceau a été reconnu." });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
        toast({ 
          variant: "destructive", 
          title: "Échec d'identification", 
          description: "Le Sceau n'a pas pu être validé." 
        });
      }
    } finally {
      setAuthenticating(false);
    }
  }, [profile?.passkeyId, authenticating, user?.uid, toast]);

  // 1. Déclenchement au montage ou changement de profil
  useEffect(() => {
    if (!authLoading && !profileLoading && profile?.biometricEnabled && profile?.passkeyId) {
      const isSessionAuthenticated = sessionStorage.getItem(`auth_${user?.uid}`);
      if (!isSessionAuthenticated) {
        setLocked(true);
      }
    } else if (!authLoading && !profileLoading) {
      setLocked(false);
    }
  }, [authLoading, profileLoading, profile, user?.uid]);

  // 2. Déclenchement automatique au verrouillage
  useEffect(() => {
    if (locked && profile?.passkeyId && !authenticating) {
      // Un petit délai pour s'assurer que l'UI est prête après le splash
      const timer = setTimeout(() => {
        handleUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [locked, profile?.passkeyId, handleUnlock]);

  // 3. Gestion du retour en arrière-plan (Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // L'app revient au premier plan
        if (profile?.biometricEnabled && profile?.passkeyId) {
          // On force le re-verrouillage pour plus de sécurité
          sessionStorage.removeItem(`auth_${user?.uid}`);
          setLocked(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [profile?.biometricEnabled, profile?.passkeyId, user?.uid]);

  if (!locked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, filter: "blur(20px)" }}
        className="fixed inset-0 z-[2000] bg-background flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-12 max-w-sm z-10"
        >
          <div className="flex justify-center">
            <Logo className="scale-110" />
          </div>

          <div className="space-y-8">
            <div className="relative mx-auto w-24 h-24">
              <motion.div 
                animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl"
              />
              <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight uppercase italic">Sanctuaire Verrouillé</h2>
              <p className="text-sm font-medium opacity-40 leading-relaxed px-4">
                L'éveil est protégé par votre Sceau Biométrique.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleUnlock} 
              disabled={authenticating}
              className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.4em] gap-3 shadow-2xl shadow-primary/20"
            >
              {authenticating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Fingerprint className="h-5 w-5" />
                  Débloquer l'Esprit
                </>
              )}
            </Button>
            
            {authenticating && (
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30 animate-pulse">
                Approbation en cours...
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
