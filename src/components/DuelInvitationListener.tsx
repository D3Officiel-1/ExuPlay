
"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, X, Check, Zap, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";

export function DuelInvitationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [activeDuel, setActiveDuel] = useState<any>(null);

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
    if (!activeDuel || !db) return;
    haptic.medium();
    const duelRef = doc(db, "duels", activeDuel.id);
    await updateDoc(duelRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp()
    });
    router.push(`/duels/${activeDuel.id}`);
  };

  const handleDecline = async () => {
    if (!activeDuel || !db) return;
    haptic.light();
    const duelRef = doc(db, "duels", activeDuel.id);
    await updateDoc(duelRef, { status: 'cancelled' });
    setActiveDuel(null);
  };

  return (
    <AnimatePresence>
      {activeDuel && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-0 right-0 z-[150] px-6 max-w-lg mx-auto pointer-events-none"
        >
          <Card className="bg-primary text-primary-foreground border-none shadow-[0_20px_60px_rgba(0,0,0,0.4)] rounded-[2.5rem] overflow-hidden pointer-events-auto relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Swords className="h-24 w-24" /></div>
            <CardContent className="p-6 flex flex-col gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/10 flex items-center justify-center overflow-hidden">
                  {activeDuel.challengerPhoto ? <img src={activeDuel.challengerPhoto} alt="" className="object-cover" /> : <Swords className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Duel de Résonance</p>
                  <h3 className="text-lg font-black truncate">@{activeDuel.challengerName} vous défie !</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Zap className="h-3 w-3 fill-current text-yellow-400" />
                    <span className="text-sm font-bold">{activeDuel.wager} PTS en jeu</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleDecline} variant="ghost" className="flex-1 h-12 rounded-xl font-bold bg-primary-foreground/5 hover:bg-primary-foreground/10">Refuser</Button>
                <Button onClick={handleAccept} className="flex-2 h-12 rounded-xl font-black uppercase tracking-widest gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Check className="h-4 w-4" /> Accepter
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
