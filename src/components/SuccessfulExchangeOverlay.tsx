"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, limit, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, Smartphone, Sparkles, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

/**
 * @fileOverview Oracle de Prospérité.
 * Overlay cinématique plein écran qui s'affiche lors de la validation d'une conversion.
 */

export function SuccessfulExchangeOverlay() {
  const { user } = useUser();
  const db = useFirestore();
  const [activeExchange, setActiveExchange] = useState<any>(null);

  // Écouter les échanges complétés pour l'utilisateur
  const exchangesQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "exchanges"),
      where("userId", "==", user.uid),
      where("status", "==", "completed"),
      orderBy("processedAt", "desc"),
      limit(5)
    );
  }, [db, user?.uid]);

  const { data: completedExchanges } = useCollection(exchangesQuery);

  useEffect(() => {
    if (!completedExchanges || completedExchanges.length === 0) return;

    // Récupérer la liste des IDs déjà vus depuis le localStorage
    const seenIds = JSON.parse(localStorage.getItem("seen_exchanges") || "[]");
    
    // Trouver le premier échange complété non encore affiché
    const newExchange = completedExchanges.find(ex => !seenIds.includes(ex.id));

    if (newExchange && !activeExchange) {
      haptic.success();
      setActiveExchange(newExchange);
      
      // Marquer comme vu immédiatement
      const updatedSeenIds = [...seenIds, newExchange.id];
      localStorage.setItem("seen_exchanges", JSON.stringify(updatedSeenIds));
    }
  }, [completedExchanges, activeExchange]);

  const handleDismiss = () => {
    haptic.light();
    setActiveExchange(null);
  };

  return (
    <AnimatePresence>
      {activeExchange && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)" }}
          className="fixed inset-0 z-[3000] bg-background/80 backdrop-blur-[40px] flex flex-col items-center justify-center p-8 overflow-hidden"
        >
          {/* Effets de fond éthérés */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.3, 0.1],
                rotate: [0, 90, 0]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full bg-primary/10 blur-[150px]" 
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.05, 0.2, 0.05],
                rotate: [0, -90, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, delay: 1 }}
              className="absolute bottom-[-20%] right-[-20%] w-[100%] h-[100%] rounded-full bg-primary/5 blur-[150px]" 
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
            className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-12"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
              />
              <div className="relative h-32 w-32 bg-card rounded-[3.5rem] flex items-center justify-center border border-primary/10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]">
                <CheckCircle2 className="h-16 w-16 text-primary" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-10px] border border-dashed border-primary/20 rounded-full"
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
                Flux Harmonisé
              </motion.p>
              <h2 className="text-5xl font-black tracking-tighter italic leading-none">
                Dépôt Reçu
              </h2>
            </div>

            <div className="w-full p-10 bg-card/40 backdrop-blur-2xl rounded-[4rem] border border-primary/5 shadow-2xl space-y-8 relative overflow-hidden group">
              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
              />
              
              <div className="space-y-2">
                <span className="text-6xl font-black tabular-nums tracking-tighter text-primary">
                  {activeExchange.amount?.toLocaleString()}
                </span>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Francs CFA</p>
              </div>

              <div className="h-px bg-primary/10 w-12 mx-auto" />

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/5">
                  <Smartphone className="h-3 w-3 opacity-40" />
                  <span className="text-xs font-black tracking-tight">{activeExchange.phoneNumber}</span>
                </div>
                <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.2em] px-6 leading-relaxed">
                  Le flux de votre Lumière a été matérialisé sur votre compte Wave.
                </p>
              </div>
            </div>

            <Button
              onClick={handleDismiss}
              className="h-20 w-20 rounded-full bg-card hover:bg-primary hover:text-primary-foreground transition-all duration-500 shadow-2xl border border-primary/5 group"
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
                  className="h-1 w-1 bg-primary rounded-full"
                />
              ))}
            </div>
            <p className="text-[8px] font-black uppercase tracking-[0.4em]">Sceau de Prospérité</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
