
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  query,
  orderBy, 
  limit
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Users, Sparkles, Brain, Trophy, Swords, Flag, ChevronRight, Rocket, Bomb } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";

function OracleThought() {
  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const thoughts = [
      "Le savoir est une lumière qui ne s'éteint jamais. 🕯️",
      "Chaque défi est un pas de plus vers l'Éveil Suprême. ✨",
      "L'esprit en paix voit la vérité à travers l'illusion. 🧘",
      "Votre résonance actuelle perturbe positivement l'éther. 🌀",
      "L'Oracle voit en vous un potentiel de Sage immense. 💎",
      "La patience est la clé qui ouvre les portes de l'Inconnu. 🔑",
      "Une pensée pure transmute le plomb en or spirituel. ⚗️"
    ];
    
    const timer = setTimeout(() => {
      setThought(thoughts[Math.floor(Math.random() * thoughts.length)]);
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl border border-primary/5">
      <motion.div 
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} 
        transition={{ duration: 6, repeat: Infinity }} 
        className="absolute -right-6 -top-6 text-primary opacity-5"
      >
        <Brain className="h-32 w-32" />
      </motion.div>
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-primary/10 rounded-lg flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Oracle des Pensées</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-full bg-primary/5 animate-pulse rounded-full" />
            <div className="h-4 w-3/4 bg-primary/5 animate-pulse rounded-full" />
          </div>
        ) : (
          <p className="text-base font-black italic leading-tight tracking-tight opacity-80">
            <EmojiOracle text={thought} />
          </p>
        )}
      </div>
    </Card>
  );
}

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

  const userRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const appStatusRef = useMemo(() => (db ? doc(db, "appConfig", "status") : null), [db]);
  
  const { data: profile } = useDoc(userRef);
  const { data: appStatus } = useDoc(appStatusRef);

  const royalChallengeUntil = appStatus?.royalChallengeActiveUntil?.toDate?.() || null;
  const isRoyalActive = royalChallengeUntil && royalChallengeUntil > new Date();

  const GAMES = [
    {
      id: "quiz",
      title: "Défis de Savoir",
      description: "Explorez les frontières de la pensée Ivoirienne.",
      icon: Trophy,
      color: "text-blue-500",
      bg: "bg-blue-500/5",
      path: "/quiz"
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
    <div className={cn("min-h-screen bg-background flex flex-col pb-32 transition-colors duration-1000", isRoyalActive && "bg-yellow-500/[0.02]")}>
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
          
          <div className="w-full">
            <OracleThought />
          </div>
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
            "Le savoir n'est qu'un des chemins. L'adresse et la vitesse forgent aussi l'esprit."
          </p>
        </div>
      </main>
    </div>
  );
}
