
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
 * Gère l'affichage différé pour les transactions traitées pendant l'absence de l'utilisateur.
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
            scale: 1.1,
            transition: { duration: 0.8, ease: "easeIn" }
          }}
          className={cn(
            "fixed inset-0 z-[3000] backdrop-blur-[40px] flex flex-col items-center justify-center p-8 overflow-hidden",
            isRejected ? "bg-destructive/10" : "bg-background/80"
          )}
        >
          <div className="absolute inset-0 pointer-events-none">
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

          <motion.div
            initial={{ y: 100, scale: 0.8, opacity: 0, filter: "blur(20px)" }}
            animate={{ 
              y: 0, 
              scale: 1, 
              opacity: 1, 
              filter: "blur(0px)",
              transition: { type: "spring", damping: 20, stiffness: 100, delay: 0.2 } 
            }}
            className="relative z-10 w-full max-sm flex flex-col items-center text-center space-y-12"
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
                "relative h-32 w-32 bg-card rounded-[3.5rem] flex items-center justify-center border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]",
                isRejected ? "border-red-500/20" : "border-primary/10"
              )}>
                {isRejected ? (
                  <AlertCircle className="h-16 w-16 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-16 w-16 text-primary" />
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
                animate={{ opacity: 0.4, letterSpacing: "0.6em" }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-[10px] font-black uppercase tracking-[0.6em]"
              >
                {isRejected ? "Dissonance de Flux" : "Flux Harmonisé"}
              </motion.p>
              <h2 className="text-5xl font-black tracking-tighter italic leading-none">
                {isRejected ? "Retrait Refusé" : "Dépôt Reçu"}
              </h2>
            </div>

            <div className={cn(
              "w-full p-10 bg-card/40 backdrop-blur-2xl rounded-[4rem] border shadow-2xl space-y-8 relative overflow-hidden group",
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
                  "text-6xl font-black tabular-nums tracking-tighter",
                  isRejected ? "text-red-500" : "text-primary"
                )}>
                  {activeExchange.amount?.toLocaleString()}
                </span>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Francs CFA</p>
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
                  <span className="text-xs font-black tracking-tight">{activeExchange.phoneNumber}</span>
                </div>
                <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.2em] px-6 leading-relaxed">
                  {isRejected 
                    ? "La demande n'a pas pu être harmonisée. Votre Lumière a été restituée sur votre solde." 
                    : "Le flux de votre Lumière a été matérialisé sur votre compte Wave."}
                </p>
              </div>
            </div>

            <Button
              onClick={handleDismiss}
              className={cn(
                "h-20 w-20 rounded-full bg-card hover:text-primary-foreground transition-all duration-500 shadow-2xl border group",
                isRejected ? "hover:bg-red-500 border-red-500/10" : "hover:bg-primary border-primary/5"
              )}
            >
              <X className="h-8 w-8 transition-transform group-hover:rotate-90" />
            </Button>
          </motion.div>

          <div className="fixed bottom-12 flex flex-col items-center gap-4 pointer-events-none opacity-20">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
