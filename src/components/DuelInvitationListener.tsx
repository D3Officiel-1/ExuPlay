
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
import { Swords, X, Check, Zap, Sparkles, Loader2, User, Timer, ShieldAlert } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import Image from "next/image";

/**
 * @fileOverview Oracle de Défis Bidirectionnel.
 * Gère l'affichage pour l'adversaire (Invitation) ET pour le challenger (Attente).
 */

export function DuelInvitationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isProcessing, setIsProcessing] = useState(false);

  // On écoute les duels où l'utilisateur est impliqué et qui ne sont pas finis
  const activeDuelsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "duels"),
      and(
        or(
          where("opponentId", "==", user.uid),
          where("challengerId", "==", user.uid)
        ),
        where("status", "in", ["pending", "accepted", "cancelled"])
      )
    );
  }, [db, user?.uid]);

  const { data: duels } = useCollection(activeDuelsQuery);

  const activeDuel = useMemo(() => {
    if (!duels || duels.length === 0) return null;
    return duels[0];
  }, [duels]);

  // Redirection automatique vers l'arène quand le duel est accepté
  useEffect(() => {
    if (activeDuel?.status === 'accepted' || activeDuel?.status === 'active') {
      // Si on n'est pas déjà sur la page du duel, on y va
      if (!pathname.includes(`/duels/${activeDuel.id}`)) {
        const timer = setTimeout(() => {
          router.push(`/duels/${activeDuel.id}`);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeDuel?.status, activeDuel?.id, router, pathname]);

  const handleAccept = async () => {
    if (!activeDuel || !db || !user?.uid || isProcessing) return;
    setIsProcessing(true);
    haptic.medium();
    try {
      const myUserRef = doc(db, "users", user.uid);
      await updateDoc(myUserRef, {
        totalPoints: increment(-activeDuel.wager),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, "duels", activeDuel.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineOrCancel = async () => {
    if (!activeDuel || !db || isProcessing) return;
    setIsProcessing(true);
    haptic.light();
    try {
      const challengerUserRef = doc(db, "users", activeDuel.challengerId);
      if (activeDuel.status === 'pending') {
        await updateDoc(challengerUserRef, {
          totalPoints: increment(activeDuel.wager),
          updatedAt: serverTimestamp()
        });
      }
      await updateDoc(doc(db, "duels", activeDuel.id), { status: 'cancelled' });
      setTimeout(async () => {
        await deleteDoc(doc(db, "duels", activeDuel.id));
      }, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseMessage = async () => {
    if (!activeDuel || !db) return;
    await deleteDoc(doc(db, "duels", activeDuel.id));
  };

  // Ne pas afficher l'overlay si on est déjà dans l'arène de CE duel
  if (!activeDuel || !user || pathname.includes(`/duels/${activeDuel.id}`)) return null;

  const isOpponent = activeDuel.opponentId === user.uid;
  const isChallenger = activeDuel.challengerId === user.uid;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, filter: "blur(40px)" }}
        className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center overflow-hidden"
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
                {isOpponent ? (
                  activeDuel.challengerPhoto ? <Image src={activeDuel.challengerPhoto} alt="" fill className="object-cover" /> : <User className="h-14 w-14 text-primary opacity-20" />
                ) : (
                  activeDuel.opponentPhoto ? <Image src={activeDuel.opponentPhoto} alt="" fill className="object-cover" /> : <User className="h-14 w-14 text-primary opacity-20" />
                )}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-[-10px] border border-dashed border-primary/20 rounded-full" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                {activeDuel.status === 'accepted' ? "Résonance Établie" : activeDuel.status === 'cancelled' ? "Dissonance" : "Arène de Combat"}
              </p>
              <h2 className="text-3xl font-black tracking-tight italic">
                {activeDuel.status === 'cancelled' 
                  ? (isChallenger ? "Défi Refusé" : "Duel Annulé")
                  : activeDuel.status === 'accepted'
                    ? "Combat Imminent"
                    : isOpponent ? `@${activeDuel.challengerName} vous défie` : `Attente de @${activeDuel.opponentName}`}
              </h2>
            </div>
          </div>

          <div className="p-10 bg-primary/5 rounded-[3.5rem] border border-primary/10 shadow-inner relative overflow-hidden group">
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12" />
            
            {activeDuel.status === 'pending' ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-black tabular-nums tracking-tighter">{activeDuel.wager}</span>
                  <span className="text-xs font-black uppercase tracking-widest opacity-30">PTS</span>
                </div>
                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Mise en jeu</p>
              </div>
            ) : activeDuel.status === 'accepted' ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-xs font-black uppercase tracking-widest">Ouverture de l'Arène...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <ShieldAlert className="h-12 w-12 text-destructive opacity-40" />
                <p className="text-[10px] font-medium opacity-40 italic">"L'équilibre a été rompu."</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {activeDuel.status === 'pending' && isOpponent && (
              <>
                <Button onClick={handleAccept} disabled={isProcessing} className="w-full h-20 rounded-[2rem] font-black text-sm uppercase gap-4 shadow-2xl shadow-primary/20">
                  {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <Check className="h-6 w-6" />} Accepter le Défie
                </Button>
                <button onClick={handleDeclineOrCancel} disabled={isProcessing} className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-opacity">
                  Refuser l'épreuve
                </button>
              </>
            )}

            {activeDuel.status === 'pending' && isChallenger && (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-3 opacity-40">
                  <Timer className="h-4 w-4 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">En attente de réponse...</p>
                </div>
                <Button variant="ghost" onClick={handleDeclineOrCancel} disabled={isProcessing} className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] opacity-40 hover:opacity-100 border border-primary/5">
                  Annuler le Duel
                </Button>
              </div>
            )}

            {activeDuel.status === 'cancelled' && (
              <div className="space-y-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-destructive">
                  {isChallenger ? "Points de lumière restitués" : "Duel fermé"}
                </p>
                <Button variant="outline" onClick={handleCloseMessage} className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em]">
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
          <div className="h-px w-12 bg-primary/20" />
          <Swords className="h-4 w-4" />
          <div className="h-px w-12 bg-primary/20" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
