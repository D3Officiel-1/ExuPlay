
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, limit, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, Smartphone, Sparkles, X, AlertCircle } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Oracle de Flux.
 * Overlay cinématique plein écran qui s'affiche lors de la validation ou du rejet d'une conversion.
 * Optimisé pour s'adapter à toutes les tailles d'écran sans débordement.
 */

export function SuccessfulExchangeOverlay() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const [activeExchange, setActiveExchange] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Attendre que l'application soit stable avant de déclencher l'overlay
  useEffect(() => {
    if (!authLoading && user) {
      const timer = setTimeout(() => setIsReady(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [authLoading, user]);

  // Écouter les échanges traités (validés ou rejetés) pour l'utilisateur
  const exchangesQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "exchanges"),
      where("userId", "==", user.uid),
      where("status", "in", ["completed", "rejected"]),
      orderBy("processedAt", "desc"),
      limit(5)
    );
  }, [db, user?.uid]);

  const { data: processedExchanges } = useCollection(exchangesQuery);

  useEffect(() => {
    if (!isReady || !processedExchanges || processedExchanges.length === 0 || activeExchange) return;

    try {
      const seenIdsRaw = localStorage.getItem("seen_exchanges");
      const seenIds: string[] = seenIdsRaw ? JSON.parse(seenIdsRaw) : [];
      
      const unseenExchange = processedExchanges.find(ex => !seenIds.includes(ex.id));

      if (unseenExchange) {
        if (unseenExchange.status === 'completed') {
          haptic.success();
        } else {
          haptic.error();
        }
        setActiveExchange(unseenExchange);
        
        const updatedSeenIds = [...seenIds, unseenExchange.id];
        localStorage.setItem("seen_exchanges", JSON.stringify(updatedSeenIds));
      }
    } catch (error) {
      console.warn("Échec de synchronisation de l'Oracle:", error);
    }
  }, [processedExchanges, activeExchange, isReady]);

  const handleDismiss = () => {
    haptic.light();
    setActiveExchange(null);
  };

  const isRejected = activeExchange?.status === 'rejected';

  return (
    <AnimatePresence>
      {activeExchange && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            filter: "blur(40px)",
            transition: { duration: 0.8, ease: "easeIn" }
          }}
          className={cn(
            "fixed inset-0 z-[3000] backdrop-blur-[40px] overflow-y-auto",
            isRejected ? "bg-destructive/10" : "bg-background/80"
          )}
        >
          {/* Background éthéré fixe */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.3, 0.1],
                rotate: [0, 90, 0]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className={cn(
                "absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full blur-[150px]",
                isRejected ? "bg-red-500/10" : "bg-primary/10"
              )} 
            />
          </div>

          {/* Conteneur de centrage avec gestion du scroll */}
          <div className="min-h-full w-full flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">
            <motion.div
              initial={{ y: 60, scale: 0.9, opacity: 0, filter: "blur(20px)" }}
              animate={{ 
                y: 0, 
                scale: 1, 
                opacity: 1, 
                filter: "blur(0px)",
                transition: { type: "spring", damping: 20, stiffness: 100, delay: 0.2 } 
              }}
              className="w-full max-w-sm flex flex-col items-center text-center space-y-10 sm:space-y-12 py-10"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className={cn(
                    "absolute inset-0 rounded-full blur-3xl",
                    isRejected ? "bg-red-500/20" : "bg-primary/20"
                  )}
                />
                <div className={cn(
                  "relative h-24 w-24 sm:h-32 sm:w-32 bg-card rounded-[2.5rem] sm:rounded-[3.5rem] flex items-center justify-center border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]",
                  isRejected ? "border-red-500/20" : "border-primary/10"
                )}>
                  {isRejected ? (
                    <AlertCircle className="h-10 w-10 sm:h-16 sm:w-16 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
                  )}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className={cn(
                      "absolute inset-[-10px] border border-dashed rounded-full",
                      isRejected ? "border-red-500/20" : "border-primary/20"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <motion.p 
                  initial={{ opacity: 0, letterSpacing: "0.2em" }}
                  animate={{ opacity: 0.4, letterSpacing: "0.4em" }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em]"
                >
                  {isRejected ? "Dissonance de Flux" : "Flux Harmonisé"}
                </motion.p>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter italic leading-none">
                  {isRejected ? "Retrait Refusé" : "Dépôt Reçu"}
                </h2>
              </div>

              <div className={cn(
                "w-full p-8 sm:p-10 bg-card/40 backdrop-blur-2xl rounded-[3rem] sm:rounded-[4rem] border shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden group",
                isRejected ? "border-red-500/10" : "border-primary/5"
              )}>
                <motion.div 
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className={cn(
                    "absolute inset-0 skew-x-12",
                    isRejected ? "bg-gradient-to-r from-transparent via-red-500/5 to-transparent" : "bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                  )}
                />
                
                <div className="space-y-2">
                  <span className={cn(
                    "text-5xl sm:text-6xl font-black tabular-nums tracking-tighter",
                    isRejected ? "text-red-500" : "text-primary"
                  )}>
                    {activeExchange.amount?.toLocaleString()}
                  </span>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-30">Francs CFA</p>
                </div>

                <div className={cn(
                  "h-px w-12 mx-auto",
                  isRejected ? "bg-red-500/10" : "bg-primary/10"
                )} />

                <div className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border",
                    isRejected ? "bg-red-500/5 border-red-500/5" : "bg-primary/5 border-primary/5"
                  )}>
                    <Smartphone className="h-3 w-3 opacity-40" />
                    <span className="text-[11px] sm:text-xs font-black tracking-tight">{activeExchange.phoneNumber}</span>
                  </div>
                  <p className="text-[8px] sm:text-[9px] font-bold opacity-30 uppercase tracking-[0.1em] px-4 leading-relaxed">
                    {isRejected 
                      ? "La demande a été rejetée. Votre Lumière a été entièrement restituée." 
                      : "Le flux de votre Lumière a été matérialisé sur votre compte Wave."}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleDismiss}
                className={cn(
                  "h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-card hover:text-primary-foreground transition-all duration-500 shadow-2xl border group",
                  isRejected ? "hover:bg-red-500 border-red-500/10" : "hover:bg-primary border-primary/5"
                )}
              >
                <X className="h-6 w-6 sm:h-8 sm:w-8 transition-transform group-hover:rotate-90" />
              </Button>
            </motion.div>

            {/* Indicateur de bas de page */}
            <div className="py-8 flex flex-col items-center gap-4 pointer-events-none opacity-20">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className={cn("h-1 w-1 rounded-full", isRejected ? "bg-red-500" : "bg-primary")}
                  />
                ))}
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">
                {isRejected ? "Sceau de Dissonance" : "Sceau de Prospérité"}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
