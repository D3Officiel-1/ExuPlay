"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { Zap, Shield } from "lucide-react";
import { getHonorTitle } from "@/lib/titles";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Oracle de la Récompense Cachée.
 * Un overlay invoqué par clic droit ou appui prolongé pour visualiser son essence.
 */
export function RewardQuickView() {
  const { user } = useUser();
  const db = useFirestore();
  const [isVisible, setIsVisible] = useState(false);

  const { data: profile } = useDoc(user?.uid ? doc(db, "users", user.uid) : null);
  const title = getHonorTitle(profile?.totalPoints || 0);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setIsVisible(true);
    };

    window.addEventListener('contextmenu', onContextMenu);
    return () => window.removeEventListener('contextmenu', onContextMenu);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsVisible(false)}
          className="fixed inset-0 z-[10000] bg-background/60 backdrop-blur-2xl flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full max-w-sm bg-card border border-primary/10 rounded-[3rem] p-10 shadow-2xl text-center space-y-8 relative overflow-hidden"
          >
            <motion.div 
              animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute inset-0 bg-primary/5 rounded-full blur-3xl pointer-events-none" 
            />

            <div className="space-y-2 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Votre Essence</p>
              <h2 className="text-3xl font-black tracking-tight italic">Flux de Lumière</h2>
            </div>

            <div className="space-y-1 relative z-10">
              <div className="flex items-center justify-center gap-3">
                <Zap className="h-8 w-8 text-primary animate-pulse" />
                <span className="text-6xl font-black tabular-nums tracking-tighter">
                  {profile?.totalPoints?.toLocaleString() || 0}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase opacity-20 tracking-widest">Points accumulés</p>
            </div>

            <div className={cn(
              "inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 relative z-10",
              title.bgClass, title.borderColor
            )}>
              <Shield className={cn("h-4 w-4", title.color)} />
              <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", title.color)}>
                {title.name}
              </span>
            </div>

            <p className="text-[9px] font-medium opacity-30 italic px-4 relative z-10">
              "Touchez n'importe où pour retourner au Sanctuaire"
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
