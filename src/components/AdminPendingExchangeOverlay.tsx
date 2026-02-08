"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, limit, orderBy, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Zap, Clock, Smartphone, Sparkles, X, ArrowUpRight, ShieldCheck } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

/**
 * @fileOverview Oracle de Vigilance Administrative.
 * Overlay cinématique pour les administrateurs lorsqu'un nouvel échange est en attente.
 */

export function AdminPendingExchangeOverlay() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [activeExchange, setActiveExchange] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const isAdmin = profile?.role === 'admin';

  // Attendre la stabilité du système
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      const timer = setTimeout(() => setIsReady(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [authLoading, user, isAdmin]);

  // Écouter TOUS les échanges en attente (pour les admins uniquement)
  const pendingQuery = useMemo(() => {
    if (!db || !isAdmin) return null;
    return query(
      collection(db, "exchanges"),
      where("status", "==", "pending"),
      orderBy("requestedAt", "desc"),
      limit(5)
    );
  }, [db, isAdmin]);

  const { data: pendingExchanges } = useCollection(pendingQuery);

  useEffect(() => {
    if (!isReady || !pendingExchanges || pendingExchanges.length === 0 || activeExchange) return;

    try {
      const seenIdsRaw = localStorage.getItem("seen_admin_pending_exchanges");
      const seenIds: string[] = seenIdsRaw ? JSON.parse(seenIdsRaw) : [];
      
      // Trouver le plus récent échange que l'admin n'a pas encore "vu" comme notification
      const unseenExchange = pendingExchanges.find(ex => !seenIds.includes(ex.id));

      if (unseenExchange) {
        haptic.medium();
        setActiveExchange(unseenExchange);
        
        // Marquer comme vu immédiatement pour cette session/appareil
        const updatedSeenIds = [...seenIds, unseenExchange.id];
        localStorage.setItem("seen_admin_pending_exchanges", JSON.stringify(updatedSeenIds));
      }
    } catch (error) {
      console.warn("Dissonance dans la mémoire de l'Oracle Admin:", error);
    }
  }, [pendingExchanges, activeExchange, isReady]);

  const handleDismiss = () => {
    haptic.light();
    setActiveExchange(null);
  };

  const handleGoToAdmin = () => {
    haptic.medium();
    setActiveExchange(null);
    router.push("/admin/conversions");
  };

  if (!isAdmin || !activeExchange) return null;

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
          className="fixed inset-0 z-[10001] bg-orange-500/5 backdrop-blur-[40px] overflow-y-auto"
        >
          {/* Background éthéré fixe */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.2, 0.1],
                rotate: [0, -45, 0]
              }}
              transition={{ duration: 12, repeat: Infinity }}
              className="absolute bottom-[-20%] right-[-20%] w-[100%] h-[100%] rounded-full bg-orange-500/10 blur-[150px]" 
            />
          </div>

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
                  className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl"
                />
                <div className="relative h-24 w-24 sm:h-32 sm:w-32 bg-card rounded-[2.5rem] sm:rounded-[3.5rem] flex items-center justify-center border border-orange-500/20 shadow-[0_32px_128px_-16px_rgba(249,115,22,0.3)]">
                  <Clock className="h-10 w-10 sm:h-16 sm:w-16 text-orange-500" />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-10px] border border-dashed border-orange-500/20 rounded-full"
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
                  Vigilance Maître
                </motion.p>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter italic leading-none">
                  Nouveau Flux
                </h2>
              </div>

              <div className="w-full p-8 sm:p-10 bg-card/40 backdrop-blur-2xl rounded-[3rem] sm:rounded-[4rem] border border-orange-500/10 shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden group">
                <motion.div 
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 skew-x-12 bg-gradient-to-r from-transparent via-orange-500/5 to-transparent"
                />
                
                <div className="space-y-2">
                  <span className="text-5xl sm:text-6xl font-black tabular-nums tracking-tighter text-orange-500">
                    {activeExchange?.amount?.toLocaleString()}
                  </span>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-30">Francs CFA sollicités</p>
                </div>

                <div className="h-px w-12 mx-auto bg-orange-500/10" />

                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-orange-500/5 border-orange-500/5">
                    <Zap className="h-3 w-3 text-orange-500 opacity-40" />
                    <span className="text-[11px] sm:text-xs font-black tracking-tight">@{activeExchange?.username}</span>
                  </div>
                  <p className="text-[8px] sm:text-[9px] font-bold opacity-30 uppercase tracking-[0.1em] px-4 leading-relaxed">
                    Un esprit demande la matérialisation de son énergie. Un arbitrage est requis.
                  </p>
                </div>
              </div>

              <div className="flex flex-col w-full gap-4">
                <Button
                  onClick={handleGoToAdmin}
                  className="h-16 sm:h-20 w-full rounded-[2rem] sm:rounded-[2.5rem] bg-orange-500 hover:bg-orange-600 text-white shadow-2xl shadow-orange-500/20 font-black text-xs uppercase tracking-[0.2em] gap-3"
                >
                  <ArrowUpRight className="h-5 w-5" />
                  Ouvrir la Console
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-12 w-full rounded-2xl opacity-30 hover:opacity-100 font-black text-[9px] uppercase tracking-[0.4em]"
                >
                  Plus tard
                </Button>
              </div>
            </motion.div>

            {/* Indicateur de bas de page */}
            <div className="py-8 flex flex-col items-center gap-4 pointer-events-none opacity-20">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="h-1 w-1 rounded-full bg-orange-500"
                  />
                ))}
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">
                Sceau de Vigilance
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
