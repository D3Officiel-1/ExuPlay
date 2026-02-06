
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, limit, orderBy, doc, updateDoc } from "firebase/firestore";
import { Zap, Sparkles, Ghost, User, CheckCircle2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * @fileOverview Oracle de Transmission.
 * Overlay global cinématique s'activant à la réception d'un don de lumière.
 */

export function IncomingTransferOverlay() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const [activeTransfer, setActiveTransfer] = useState<any>(null);

  const transfersQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "transfers"),
      where("toId", "==", user.uid),
      where("read", "==", false),
      orderBy("timestamp", "desc"),
      limit(1)
    );
  }, [db, user?.uid]);

  const { data: incomingTransfers } = useCollection(transfersQuery);

  useEffect(() => {
    if (incomingTransfers && incomingTransfers.length > 0 && !activeTransfer) {
      const transfer = incomingTransfers[0];
      haptic.impact();
      setActiveTransfer(transfer);

      // Auto-lecture après un délai
      const timer = setTimeout(async () => {
        handleClose(transfer.id);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [incomingTransfers, activeTransfer]);

  const handleClose = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "transfers", id), { read: true });
      setActiveTransfer(null);
    } catch (e) {
      setActiveTransfer(null);
    }
  };

  const isAnonymous = activeTransfer?.fromId === "anonymous";

  return (
    <AnimatePresence>
      {activeTransfer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(40px)" }}
          className="fixed inset-0 z-[10000] bg-background/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary/20 blur-[120px]" 
            />
          </div>

          <motion.div
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="space-y-10 max-w-sm relative z-10"
          >
            <div className="relative mx-auto w-32 h-32">
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-3xl"
              />
              
              <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[3rem] flex items-center justify-center shadow-2xl overflow-hidden">
                {isAnonymous ? (
                  <Ghost className="h-14 w-14 text-primary opacity-40 animate-pulse" />
                ) : activeTransfer.fromPhoto ? (
                  <Image src={activeTransfer.fromPhoto} alt="" fill className="object-cover" />
                ) : (
                  <User className="h-14 w-14 text-primary opacity-20" />
                )}
                
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-10px] border border-dashed border-primary/20 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                  {isAnonymous ? "Don Mystérieux" : "Résonance Établie"}
                </p>
                <h2 className="text-3xl font-black tracking-tight italic">
                  {isAnonymous ? "Lumière du Voile" : `@${activeTransfer.fromName}`}
                </h2>
              </div>

              <div className="p-10 bg-primary/5 rounded-[3.5rem] border border-primary/10 shadow-inner relative overflow-hidden group">
                <motion.div 
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
                />
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-black tabular-nums tracking-tighter">+{activeTransfer.amount}</span>
                  <span className="text-xs font-black uppercase tracking-widest opacity-30">PTS</span>
                </div>
                <p className="text-[9px] font-bold opacity-30 uppercase mt-4 tracking-widest">Lumière Reçue</p>
              </div>
            </div>

            <button 
              onClick={() => handleClose(activeTransfer.id)}
              className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
            >
              Fermer le Flux
            </button>
          </motion.div>

          <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
            <div className="h-px w-12 bg-primary/20" />
            <Sparkles className="h-4 w-4" />
            <div className="h-px w-12 bg-primary/20" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
