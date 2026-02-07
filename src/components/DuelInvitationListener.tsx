
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
  and
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Swords, X, Check, Zap, Sparkles, Loader2, User, Timer, ShieldAlert, Users, Clock } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function DuelInvitationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
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

      // Vérifier si tout le monde a répondu
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

  const handleCancelInvitation = async () => {
    if (!activeDuel || !db || !user?.uid || isProcessing) return;
    setIsProcessing(true);
    haptic.medium();
    try {
      // Identifier tous les esprits ayant accepté (y compris le challenger)
      const acceptedUids = Object.entries(activeDuel.participants)
        .filter(([_, p]: [string, any]) => p.status === 'accepted')
        .map(([uid, _]) => uid);

      // Rembourser chaque esprit
      const refundPromises = acceptedUids.map(uid => 
        updateDoc(doc(db, "users", uid), {
          totalPoints: increment(activeDuel.wager),
          updatedAt: serverTimestamp()
        })
      );

      await Promise.all(refundPromises);
      
      // Supprimer définitivement le duel
      await deleteDoc(doc(db, "duels", activeDuel.id));
      
      toast({ title: "Invocation annulée", description: "Les mises de lumière ont été restituées." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de restitution" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!activeDuel || !db || !user?.uid || isProcessing) return;
    setIsProcessing(true);
    haptic.light();
    try {
      // Si un participant refuse, on annule et on rembourse tout le monde
      const acceptedUids = Object.entries(activeDuel.participants)
        .filter(([_, p]: [string, any]) => p.status === 'accepted')
        .map(([uid, _]) => uid);

      const refundPromises = acceptedUids.map(uid => 
        updateDoc(doc(db, "users", uid), {
          totalPoints: increment(activeDuel.wager),
          updatedAt: serverTimestamp()
        })
      );

      await Promise.all(refundPromises);
      await deleteDoc(doc(db, "duels", activeDuel.id));

      toast({ title: "Choc évité", description: "Le duel a été dissous et les points rendus." });
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
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center overflow-hidden"
      >
        <motion.div 
          initial={{ scale: 0.8, y: 40, opacity: 0 }} 
          animate={{ scale: 1, y: 0, opacity: 1 }} 
          className="w-full max-w-sm space-y-10 overflow-y-auto max-h-[92vh] no-scrollbar py-6"
        >
          <div className="space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden">
                {isChallenger ? (
                  <Swords className="h-10 w-10 text-primary opacity-40 animate-pulse" />
                ) : activeDuel.challengerPhoto ? (
                  <Image src={activeDuel.challengerPhoto} alt="" fill className="object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary opacity-20" />
                )}
              </div>
              {!isChallenger && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground h-8 w-8 rounded-xl flex items-center justify-center border-2 border-background shadow-lg">
                  <Swords className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                {isChallenger ? "Processus d'Invocation" : "Le Choc des Esprits"}
              </p>
              <h2 className="text-2xl font-black italic">
                {isChallenger ? "Appel de la Cohorte" : `@${activeDuel.challengerName} vous défie`}
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30">Cohorte du Combat</p>
            <div className="grid grid-cols-4 gap-3 bg-primary/5 p-4 rounded-[2.5rem] border border-primary/5">
              {Object.entries(activeDuel.participants).map(([uid, p]: [string, any]) => (
                <div key={uid} className="flex flex-col items-center gap-2">
                  <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-primary/10 bg-background shadow-inner">
                    {p.photo ? (
                      <Image src={p.photo} alt="" fill className="object-cover" />
                    ) : (
                      <User className="h-6 w-6 m-auto opacity-10" />
                    )}
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center transition-colors duration-500",
                      p.status === 'accepted' ? "bg-green-500/20" : p.status === 'rejected' ? "bg-red-500/20" : "bg-background/40"
                    )}>
                      {p.status === 'accepted' && <Check className="h-4 w-4 text-green-500" />}
                      {p.status === 'rejected' && <X className="h-4 w-4 text-red-500" />}
                      {p.status === 'pending' && <Clock className="h-4 w-4 text-orange-500 animate-pulse" />}
                    </div>
                  </div>
                  <span className="text-[7px] font-black uppercase opacity-40 truncate w-full text-center">
                    @{p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-primary/5 rounded-[3rem] border border-primary/10 shadow-inner">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-black tabular-nums">{activeDuel.wager}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-30">PTS</span>
            </div>
            <p className="text-[8px] font-bold opacity-30 uppercase mt-2 tracking-widest">Mise par esprit</p>
          </div>

          {isChallenger ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10">
                  <Timer className="h-5 w-5 text-primary animate-spin" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Attente de la sentence des autres...</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleCancelInvitation} 
                disabled={isProcessing}
                className="w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 border-destructive/20 text-destructive hover:bg-destructive/5"
              >
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <X className="h-4 w-4" />}
                Annuler l'Invocation
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Button 
                onClick={handleAccept} 
                disabled={isProcessing} 
                className="w-full h-20 rounded-[2.2rem] font-black text-sm uppercase gap-4 shadow-2xl"
              >
                {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <Check className="h-6 w-6" />} 
                Accepter le Choc
              </Button>
              <button 
                onClick={handleDecline} 
                disabled={isProcessing} 
                className="w-full h-14 rounded-2xl font-black text-[10px] uppercase opacity-40 hover:opacity-100 transition-opacity"
              >
                Refuser l'Appel
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
