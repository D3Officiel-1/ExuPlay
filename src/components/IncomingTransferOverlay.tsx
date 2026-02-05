
"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  limit, 
  orderBy, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { Sparkles, Zap, User } from "lucide-react";
import Image from "next/image";

/**
 * @fileOverview Un composant global qui écoute les transferts entrants et affiche une animation "ultra stylée".
 */

export function IncomingTransferOverlay() {
  const { user } = useUser();
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

  const { data: transfers } = useCollection(transfersQuery);

  useEffect(() => {
    if (transfers && transfers.length > 0 && !activeTransfer) {
      const transfer = transfers[0];
      setActiveTransfer(transfer);
      
      // Jouer un son de notification
      const audio = new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_f80e052d2e.mp3");
      audio.play().catch(() => {});

      // Marquer comme lu après un délai pour l'animation
      const timer = setTimeout(async () => {
        if (db) {
          await updateDoc(doc(db, "transfers", transfer.id), { read: true });
          setActiveTransfer(null);
        }
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [transfers, activeTransfer, db]);

  return (
    <AnimatePresence>
      {activeTransfer && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/40 backdrop-blur-[60px]"
          />
          
          <motion.div
            initial={{ scale: 0.8, y: 100, opacity: 0, filter: "blur(20px)" }}
            animate={{ scale: 1, y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 1.2, opacity: 0, filter: "blur(40px)" }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative w-full max-w-sm bg-card/60 backdrop-blur-3xl border border-primary/10 rounded-[3.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.3)] pointer-events-auto overflow-hidden"
          >
            {/* Effets de particules de fond */}
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                rotate: [0, 45, 0],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-primary/10 rounded-full blur-[80px]"
            />

            <div className="relative z-10 flex flex-col items-center space-y-8 text-center">
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="h-28 w-28 rounded-[2.5rem] bg-card border-2 border-primary/10 shadow-2xl overflow-hidden relative"
                >
                  {activeTransfer.fromPhoto ? (
                    <Image src={activeTransfer.fromPhoto} alt="" fill className="object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-primary opacity-20 m-auto absolute inset-0" />
                  )}
                </motion.div>
                
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-4 -right-4 h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20"
                >
                  <Zap className="h-6 w-6 text-primary-foreground fill-current" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40"
                >
                  Résonance Entrante
                </motion.p>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-3xl font-black tracking-tighter"
                >
                  @{activeTransfer.fromName}
                </motion.h2>
              </div>

              <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/5 w-full relative group">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="absolute bottom-0 left-8 right-8 h-[2px] bg-primary/20 origin-left"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, type: "spring" }}
                  className="flex flex-col items-center"
                >
                  <span className="text-6xl font-black tabular-nums tracking-tighter">
                    +{activeTransfer.amount}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-30 mt-1">Lumière Transmise</span>
                </motion.div>
                
                <Sparkles className="absolute top-4 right-4 h-5 w-5 text-primary opacity-20 animate-pulse" />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTransfer(null)}
                className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-opacity"
              >
                Fermer l'horizon
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
