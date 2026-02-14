"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit,
  updateDoc,
  increment,
  serverTimestamp
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Users, Sparkles, Trophy, Swords, Flag, ChevronRight, Rocket, Bomb, Ticket, Coins, Dices, RefreshCw, Gift, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

function GlobalActivityTicker() {
  const db = useFirestore();
  const transfersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "transfers"), orderBy("timestamp", "desc"), limit(1));
  }, [db]);

  const { data: recentTransfers } = useCollection(transfersQuery);
  const transfer = recentTransfers?.[0];

  return (
    <AnimatePresence mode="wait">
      {transfer && (
        <motion.div 
          key={transfer.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/5 rounded-full backdrop-blur-md"
        >
          <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center border border-background">
            <Users className="h-2 w-2 text-primary" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
            <span className="text-primary">@<EmojiOracle text={transfer.fromName} /></span> a transmis <span className="text-primary">{transfer.amount} PTS</span>
          </p>
          <Zap className="h-2.5 w-2.5 text-primary animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CommunityGoalProgress({ appStatus }: { appStatus: any }) {
  if (!appStatus) return null;

  const current = appStatus.communityGoalPoints || 0;
  const target = appStatus.communityGoalTarget || 10000;
  const progress = Math.min((current / target) * 100, 100);
  
  const royalChallengeUntil = appStatus.royalChallengeActiveUntil?.toDate?.() || null;
  const isRoyalActive = royalChallengeUntil && royalChallengeUntil > new Date();

  return (
    <Card className={cn(
      "border-none bg-card/20 backdrop-blur-3xl rounded-full overflow-hidden w-full max-w-lg mb-4 transition-all duration-700",
      isRoyalActive && "ring-1 ring-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
    )}>
      <CardContent className="p-3 px-6 space-y-2">
        <div className="h-1 bg-primary/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={cn("h-full transition-colors duration-500", isRoyalActive ? "bg-yellow-500" : "bg-primary")}
          />
        </div>
        <p className={cn("text-[8px] font-black uppercase tracking-[0.4em] text-center", isRoyalActive ? "text-yellow-600" : "opacity-20")}>
          {isRoyalActive ? "Éveil Royal Actif" : `Encore ${Math.max(0, target - current).toLocaleString()} points requis`}
        </p>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const appStatusRef = useMemo(() => (db ? doc(db, "appConfig", "status") : null), [db]);
  
  const { data: profile } = useDoc(userRef);
  const { data: appStatus } = useDoc(appStatusRef);

  useEffect(() => {
    if (profile && !profile.hasReceivedWelcomeBonus && userRef) {
      haptic.success();
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#ffffff', '#3b82f6']
      });

      updateDoc(userRef, {
        totalPoints: increment(1000),
        bonusBalance: increment(1000),
        hasReceivedWelcomeBonus: true,
        updatedAt: serverTimestamp()
      }).then(() => {
        toast({
          title: "Cadeau de Bienvenue",
          description: "L'Oracle vous offre 1000 PTS pour commencer votre éveil !",
        });
      });
    }
  }, [profile, userRef, toast]);

  const royalChallengeUntil = appStatus?.royalChallengeActiveUntil?.toDate?.() || null;
  const isRoyalActive = royalChallengeUntil && royalChallengeUntil > new Date();

  const GAMES = [
    {
      id: "loto",
      title: "Loto de l'Éveil",
      description: "La numérologie sacrée du 5/90. Invoquez la fortune.",
      icon: Hash,
      color: "text-green-400",
      bg: "bg-green-400/5",
      path: "/loto"
    },
    {
      id: "sport",
      title: "Arènes Sportives",
      description: "Prédisez les flux des champions mondiaux.",
      icon: Ticket,
      color: "text-orange-500",
      bg: "bg-orange-500/5",
      path: "/sport"
    },
    {
      id: "double",
      title: "Double de l'Éveil",
      description: "Misez sur la trinité chromatique.",
      icon: RefreshCw,
      color: "text-rose-500",
      bg: "bg-rose-500/5",
      path: "/double"
    },
    {
      id: "dice",
      title: "Dés de l'Éveil",
      description: "Calibrez votre destin sur l'échelle de l'Oracle.",
      icon: Dices,
      color: "text-indigo-500",
      bg: "bg-indigo-500/5",
      path: "/dice"
    },
    {
      id: "coinflip",
      title: "Pile ou Face",
      description: "Défiez le destin avec la pièce de l'Oracle.",
      icon: Coins,
      color: "text-yellow-500",
      bg: "bg-yellow-500/5",
      path: "/coinflip"
    },
    {
      id: "mines",
      title: "Mines de l'Éveil",
      description: "Purifiez les cristaux et évitez le vide.",
      icon: Bomb,
      color: "text-amber-500",
      bg: "bg-amber-500/5",
      path: "/mines"
    },
    {
      id: "jet-lumiere",
      title: "Jet de Lumière",
      description: "Prédisez l'ascension du flux avant la chute.",
      icon: Rocket,
      color: "text-purple-500",
      bg: "bg-purple-500/5",
      path: "/jet-lumiere"
    },
    {
      id: "penalties",
      title: "Arène Sacrée",
      description: "Défiez l'Oracle lors d'une séance de tirs au but.",
      icon: Swords,
      color: "text-red-500",
      bg: "bg-red-500/5",
      path: "/penalties"
    },
    {
      id: "arcade",
      title: "Circuit de l'Éveil",
      description: "Maîtrisez la vitesse dans une dimension arcade.",
      icon: Flag,
      color: "text-green-500",
      bg: "bg-green-500/5",
      path: "/arcade"
    }
  ];

  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col pb-32 transition-colors duration-1000",
      isRoyalActive && "bg-yellow-500/[0.02]"
    )}>
      <main className="flex-1 flex flex-col items-center p-6 pt-24 space-y-8 z-10 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-col items-center space-y-6"
        >
          <div className="flex flex-col items-center gap-4">
            <GlobalActivityTicker />
            <CommunityGoalProgress appStatus={appStatus} />
          </div>
          
          <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl border border-primary/5 w-full">
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Bienvenue dans le Sanctuaire</p>
                <h2 className="text-2xl font-black italic tracking-tight">@<EmojiOracle text={profile?.username || "Esprit"} /></h2>
              </div>
              <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/5">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="w-full space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Zap className="h-4 w-4 text-primary opacity-40" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Les Portails de l'Éveil</h2>
          </div>

          <div className="space-y-4">
            {GAMES.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card 
                  onClick={() => { haptic.medium(); router.push(game.path); }}
                  className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden group hover:bg-card/60 transition-all cursor-pointer shadow-xl border border-primary/5"
                >
                  <CardContent className="p-6 flex items-center gap-6">
                    <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner border border-primary/5 transition-transform duration-500 group-hover:scale-110", game.bg)}>
                      <game.icon className={cn("h-8 w-8", game.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-lg uppercase italic leading-none mb-1">{game.title}</h3>
                      <p className="text-[10px] font-medium opacity-40 leading-tight">{game.description}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <ChevronRight className="h-5 w-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden w-full">
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic">
            "Le hasard n'est qu'une loi que l'on ne comprend pas encore."
          </p>
        </div>
      </main>
    </div>
  );
}