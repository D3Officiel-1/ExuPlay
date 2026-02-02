
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, ShieldCheck, Lock, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

interface BiometricLockProps {
  onSuccess: () => void;
}

export function BiometricLock({ onSuccess }: BiometricLockProps) {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleBiometricAuth = async () => {
    setLoading(true);
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
        },
      };

      const assertion = await navigator.credentials.get(options);
      
      if (assertion) {
        setIsSuccess(true);
        // Animation de succès ultra-stylisée avant redirection
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error("Biometric auth failed:", error);
      toast({
        variant: "destructive",
        title: "Échec d'authentification",
        description: "Nous n'avons pas pu valider votre identité biométrique.",
      });
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
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div 
            key="lock-ui"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
                <div className="relative h-full w-full bg-card border border-primary/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-visible">
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
                className="w-full h-20 rounded-3xl font-black text-lg gap-4 shadow-xl active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                DÉVERROUILLER
              </Button>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Sécurité Matérielle Active</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success-ui"
            initial={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            className="flex flex-col items-center justify-center space-y-8"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, ease: "backOut" }}
              className="w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(var(--primary-rgb),0.4)]"
            >
              <Check className="h-16 w-16 text-background stroke-[4]" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h2 className="text-2xl font-black tracking-[0.2em] uppercase">Reconnu</h2>
              <p className="text-sm font-medium opacity-40">Accès autorisé à l'éveil</p>
            </motion.div>

            {/* Expansive ripple animation */}
            <motion.div 
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 10, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute h-40 w-40 bg-primary/20 rounded-full -z-10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
