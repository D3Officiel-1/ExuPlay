"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, ShieldCheck, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";

interface BiometricLockProps {
  onSuccess: () => void;
}

export function BiometricLock({ onSuccess }: BiometricLockProps) {
  const [loading, setLoading] = useState(false);

  const handleBiometricAuth = async () => {
    setLoading(true);
    try {
      // Défi factice pour la validation WebAuthn
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
        },
      };

      // Déclenche l'interface native de l'OS (FaceID, TouchID, Windows Hello)
      const assertion = await navigator.credentials.get(options);
      
      if (assertion) {
        onSuccess();
      }
    } catch (error) {
      console.error("Biometric auth failed:", error);
      // On laisse l'utilisateur réessayer en cas d'échec ou d'annulation
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-6"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="w-full max-w-sm text-center space-y-12"
      >
        <div className="flex justify-center">
          <Logo className="scale-75" />
        </div>
        
        <div className="space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-xl"
            />
            <div className="relative h-full w-full bg-card border border-primary/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
              <Lock className="h-10 w-10 text-primary/40 absolute -top-2 -right-2 bg-background p-1.5 rounded-full border border-primary/5" />
              <Fingerprint className="h-12 w-12 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight">Accès Protégé</h2>
            <p className="text-sm text-muted-foreground font-medium px-8 leading-relaxed opacity-60">
              Votre identité est requise pour déverrouiller l'expérience Citation.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleBiometricAuth} 
            disabled={loading}
            className="w-full h-20 rounded-3xl font-black text-lg gap-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:shadow-none transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            Déverrouiller
          </Button>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Sécurité Biométrique Active</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
