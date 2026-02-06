"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  increment 
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, X, Check, Zap, Sparkles, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import Image from "next/image";

/**
 * @fileOverview Oracle de Défis.
 * Affiche une invitation de duel en PLEIN ÉCRAN.
 * Gère le prélèvement de la mise de l'adversaire ou le remboursement du challenger.
 */

export function DuelInvitationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [activeDuel, setActiveDuel] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const invitationsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "duels"),
      where("opponentId", "==", user.uid),
      where("status", "==", "pending")
    );
  }, [db, user?.uid]);

  const { data: invitations } = useCollection(invitationsQuery);

  useEffect(() => {
    if (invitations && invitations.length > 0 && !activeDuel) {
      haptic.impact();
      setActiveDuel(invitations[0]);
    } else if (!invitations || invitations.length === 0) {
      setActiveDuel(null);
    }
  }, [invitations, activeDuel]);

  const handleAccept = async () => {
    if (!activeDuel || !db || !user?.uid || isProcessing) return;
    
    setIsProcessing(true);
    haptic.medium();
    
    try {
      const duelRef = doc(db, "duels", activeDuel.id);
      const myUserRef = doc(db, "users", user.uid);

      // Prélèvement de la mise chez l'adversaire (celui qui accepte)
      await updateDoc(myUserRef, {
        totalPoints: increment(-activeDuel.wager),
        updatedAt: serverTimestamp()
      });

      await updateDoc(duelRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      router.push(`/duels/${activeDuel.id}`);
    } catch (e) {
      console.error("Erreur lors de l'acceptation:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!activeDuel || !db || isProcessing) return;
    
    setIsProcessing(true);
    haptic.light();
    
    try {
      const duelRef = doc(db, "duels", activeDuel.id);
      const challengerUserRef = doc(db, "users", activeDuel.challengerId);

      // REMBOURSEMENT du challenger car l'invitation est refusée
      await updateDoc(challengerUserRef, {
        totalPoints: increment(activeDuel.wager),
        updatedAt: serverTimestamp()
      });

      await updateDoc(duelRef, { status: 'cancelled' });
      setActiveDuel(null);
    } catch (e) {
      console.error("Erreur lors du refus:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {activeDuel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(40px)" }}
          className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center overflow-hidden"
        >
          {/* Background éthéré */}
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
            className="w-full max-w-sm space-y-12 relative z-10"
          >
            <div className="space-y-6">
              <div className="relative mx-auto w-32 h-32">
                <motion.div 
                  animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-3xl"
                />
                
                <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[3rem] flex items-center justify-center shadow-2xl overflow-hidden">
                  {activeDuel.challengerPhoto ? (
                    <Image src={activeDuel.challengerPhoto} alt="" fill className="object-cover" />
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

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Duel de Résonance</p>
                <h2 className="text-3xl font-black tracking-tight italic">
                  @{activeDuel.challengerName} vous défie
                </h2>
              </div>
            </div>

            <div className="p-10 bg-primary/5 rounded-[3.5rem] border border-primary/10 shadow-inner relative overflow-hidden group">
              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
              />
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-6xl font-black tabular-nums tracking-tighter">{activeDuel.wager}</span>
                <span className="text-xs font-black uppercase tracking-widest opacity-30">PTS</span>
              </div>
              <p className="text-[9px] font-bold opacity-30 uppercase mt-4 tracking-widest">En Jeu</p>
            </div>

            <div className="flex flex-col gap-4">
              <Button 
                onClick={handleAccept} 
                disabled={isProcessing}
                className="w-full h-20 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] gap-4 shadow-2xl shadow-primary/20"
              >
                {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <Check className="h-6 w-6" />}
                Accepter le Défie
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDecline} 
                disabled={isProcessing}
                className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-all"
              >
                Refuser l'épreuve
              </Button>
            </div>
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