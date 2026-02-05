"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { verifyPasskey } from "@/lib/passkey";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ShieldCheck, Loader2, Fingerprint, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * @fileOverview Un écran de verrouillage biométrique global ultra-réactif avec animation de succès cinématographique.
 */

export function BiometricLock() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const userRef = user?.uid ? doc(db, "users", user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Fonction d'authentification mémoïsée
  const handleUnlock = useCallback(async () => {
    if (!profile?.passkeyId || authenticating || isUnlocked) return;
    
    setAuthenticating(true);
    try {
      const success = await verifyPasskey(profile.passkeyId);
      if (success) {
        // Déclencher l'animation de succès "Ultra Stylée"
        setIsUnlocked(true);
        
        // Laisser l'animation se jouer avant de lever le verrou
        setTimeout(() => {
          sessionStorage.setItem(`auth_${user?.uid}`, "true");
          setLocked(false);
          setIsUnlocked(false);
        }, 1000);
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
  }, [profile?.passkeyId, authenticating, user?.uid, toast, isUnlocked]);

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
    if (locked && profile?.passkeyId && !authenticating && !isUnlocked) {
      const timer = setTimeout(() => {
        handleUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [locked, profile?.passkeyId, handleUnlock, authenticating, isUnlocked]);

  // 3. Gestion du retour en arrière-plan
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (profile?.biometricEnabled && profile?.passkeyId) {
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
      {locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.1, 
            filter: "blur(40px)",
            transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
          }}
          className="fixed inset-0 z-[2000] bg-background flex flex-col items-center justify-center p-8 text-center overflow-hidden"
        >
          {/* Texture de bruit numérique animée */}
          <motion.div
            animate={{ opacity: [0.02, 0.05, 0.02] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: "150px 150px",
            }}
          />

          {/* Arrière-plan éthéré */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <motion.div 
              animate={isUnlocked ? { scale: 3, opacity: 0.4 } : { scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: isUnlocked ? 1.5 : 8, ease: "easeOut" }}
              className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" 
            />
          </div>

          {/* Onde de choc lors du succès */}
          <AnimatePresence>
            {isUnlocked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 4, opacity: [0, 0.5, 0] }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-0 m-auto w-64 h-64 bg-primary/20 rounded-full blur-[100px] z-5"
              />
            )}
          </AnimatePresence>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-12 max-w-sm z-10"
          >
            <motion.div 
              animate={isUnlocked ? { y: -20, opacity: 0, scale: 0.9, filter: "blur(10px)" } : {}}
              className="flex justify-center"
            >
              <Logo className="scale-110" />
            </motion.div>

            <div className="space-y-8">
              <div className="relative mx-auto w-24 h-24">
                <motion.div 
                  animate={isUnlocked 
                    ? { scale: [1, 1.5], opacity: 0 } 
                    : { scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }
                  }
                  transition={{ duration: isUnlocked ? 0.5 : 3, repeat: isUnlocked ? 0 : Infinity }}
                  className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl"
                />
                
                <motion.div 
                  animate={isUnlocked 
                    ? { 
                        backgroundColor: "rgba(34, 197, 94, 0.1)", 
                        borderColor: "rgba(34, 197, 94, 0.3)",
                        scale: 1.1,
                        rotate: 360
                      } 
                    : {}
                  }
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl"
                >
                  <AnimatePresence mode="wait">
                    {isUnlocked ? (
                      <motion.div
                        key="success-icon"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        <ShieldCheck className="h-10 w-10 text-green-500" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="lock-icon"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                      >
                        <ShieldCheck className="h-10 w-10 text-primary" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              <motion.div 
                animate={isUnlocked ? { scale: 1.05, opacity: 0.2 } : {}}
                className="space-y-2"
              >
                <h2 className="text-3xl font-black tracking-tight uppercase italic">
                  {isUnlocked ? "Sceau Reconnu" : "Sanctuaire Verrouillé"}
                </h2>
                <p className="text-sm font-medium opacity-40 leading-relaxed px-4">
                  {isUnlocked ? "Libération du flux de l'éveil..." : "L'éveil est protégé par votre Sceau Biométrique."}
                </p>
              </motion.div>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleUnlock} 
                disabled={authenticating || isUnlocked}
                className={`w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.4em] gap-3 transition-all duration-500 ${isUnlocked ? 'bg-green-500 text-white shadow-green-500/20' : 'shadow-2xl shadow-primary/20'}`}
              >
                {authenticating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isUnlocked ? (
                  <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Entrée en cours
                  </motion.div>
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
      )}
    </AnimatePresence>
  );
}
