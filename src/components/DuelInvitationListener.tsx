
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
  increment, 
  deleteDoc,
  or,
  and
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Swords, X, Check, Zap, Sparkles, Loader2, User, Timer, ShieldAlert, Users } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import Image from "next/image";

export function DuelInvitationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isProcessing, setIsProcessing] = useState(false);

  const activeDuelsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "duels"),
      and(
        where("participantIds", "array-contains", user.uid),
        where("status", "in", ["pending", "accepted", "active", "cancelled"])
      )
    );
  }, [db, user?.uid]);

  const { data: duels } = useCollection(activeDuelsQuery);
  const activeDuel = duels?.[0];

  // Redirection automatique vers l'arène
  useEffect(() => {
    if (activeDuel?.status === 'accepted' || activeDuel?.status === 'active') {
      if (!pathname.includes(`/duels/${activeDuel.id}`)) {
        router.push(`/duels/${activeDuel.id}`);
      }
    }
  }, [activeDuel?.status, activeDuel?.id, router, pathname]);

  const handleAccept = async () => {
    if (!activeDuel || !db || !user?.uid || isProcessing) return;
    setIsProcessing(true);
    haptic.medium();
    try {
      await updateDoc(doc(db, "users", user.uid), {
        totalPoints: increment(-activeDuel.wager),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, "duels", activeDuel.id), {
        [`participants.${user.uid}.status`]: 'accepted'
      });

      // Vérifier si tout le monde a répondu (serveur ou client)
      const allParticipants = Object.values(activeDuel.participants);
      const allResponded = allParticipants.every((p: any) => p.status !== 'pending' || p.userId === user.uid);
      if (allResponded) {
        await updateDoc(doc(db, "duels", activeDuel.id), { status: 'accepted' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!activeDuel || !db || !user?.uid || isProcessing) return;
    setIsProcessing(true);
    haptic.light();
    try {
      await updateDoc(doc(db, "duels", activeDuel.id), {
        [`participants.${user.uid}.status`]: 'rejected'
      });
      // Si un rejet annule le choc collectif (optionnel, ici on l'annule)
      await updateDoc(doc(db, "duels", activeDuel.id), { status: 'cancelled' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!activeDuel || !user || pathname.includes(`/duels/${activeDuel.id}`)) return null;

  const isChallenger = activeDuel.challengerId === user.uid;
  const myStatus = activeDuel.participants[user.uid]?.status;

  if (myStatus !== 'pending' && !isChallenger) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center overflow-hidden">
        <motion.div initial={{ scale: 0.8, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} className="w-full max-w-sm space-y-12">
          <div className="space-y-6">
            <div className="relative mx-auto w-32 h-32">
              <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[3rem] flex items-center justify-center shadow-2xl overflow-hidden">
                {activeDuel.challengerPhoto ? <Image src={activeDuel.challengerPhoto} alt="" fill className="object-cover" /> : <User className="h-14 w-14 text-primary opacity-20" />}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Le Choc des Esprits</p>
              <h2 className="text-3xl font-black italic">@{activeDuel.challengerName} vous défie</h2>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest flex items-center justify-center gap-2">
                <Users className="h-3 w-3" /> {activeDuel.participantIds.length - 1} opposants requis
              </p>
            </div>
          </div>

          <div className="p-10 bg-primary/5 rounded-[3.5rem] border border-primary/10 shadow-inner">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-6xl font-black tabular-nums">{activeDuel.wager}</span>
              <span className="text-xs font-black uppercase tracking-widest opacity-30">PTS</span>
            </div>
          </div>

          {isChallenger ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 opacity-40">
                <Timer className="h-4 w-4 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Attente de la sentence des autres...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Button onClick={handleAccept} disabled={isProcessing} className="w-full h-20 rounded-[2rem] font-black text-sm uppercase gap-4 shadow-2xl">
                {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <Check className="h-6 w-6" />} Accepter le Défie
              </Button>
              <button onClick={handleDecline} disabled={isProcessing} className="w-full h-14 rounded-2xl font-black text-[10px] uppercase opacity-40">Refuser</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
