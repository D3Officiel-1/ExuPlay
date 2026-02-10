"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  Zap, 
  Loader2, 
  Dices, 
  TrendingUp, 
  Target, 
  ChevronUp, 
  ChevronDown,
  Sparkles,
  History,
  Edit3
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const MIN_BET = 5;
const RTP = 0.95; // 95% Retour au joueur

type Mode = 'over' | 'under';

export default function DicePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [betInput, setBetInput] = useState("50");
  const [targetNumber, setTargetNumber] = useState(50);
  const [mode, setMode] = useState<Mode>('over');
  const [rolledNumber, setRolledNumber] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<{ win: boolean; amount: number } | null>(null);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  // Calculs de probabilité
  const winChance = useMemo(() => {
    if (mode === 'over') return 99 - targetNumber;
    return targetNumber;
  }, [targetNumber, mode]);

  const multiplier = useMemo(() => {
    if (winChance <= 0) return 0;
    return parseFloat(( (100 * RTP) / winChance ).toFixed(2));
  }, [winChance]);

  const potentialWin = Math.floor(currentBet * multiplier);

  const handleRoll = async () => {
    if (!profile || !userDocRef || isRolling) return;

    if (currentBet < MIN_BET) {
      haptic.error();
      toast({ variant: "destructive", title: "Mise invalide", description: `Minimum ${MIN_BET} PTS.` });
      return;
    }

    if ((profile.totalPoints || 0) < currentBet) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante" });
      return;
    }

    setIsRolling(true);
    setLastResult(null);
    haptic.medium();

    try {
      // Déduire la mise
      await updateDoc(userDocRef, {
        totalPoints: increment(-currentBet),
        updatedAt: serverTimestamp()
      });

      // Simulation visuelle du roulement
      let iterations = 0;
      const interval = setInterval(() => {
        setRolledNumber(Math.floor(Math.random() * 100));
        iterations++;
        if (iterations > 15) {
          clearInterval(interval);
          finalizeRoll();
        }
      }, 60);

    } catch (e) {
      setIsRolling(false);
      toast({ variant: "destructive", title: "Dissonance Système" });
    }
  };

  const finalizeRoll = async () => {
    const result = Math.floor(Math.random() * 100);
    setRolledNumber(result);

    const isWin = mode === 'over' ? result > targetNumber : result < targetNumber;
    
    if (isWin) {
      haptic.success();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#fbbf24']
      });

      await updateDoc(userDocRef!, {
        totalPoints: increment(potentialWin),
        updatedAt: serverTimestamp()
      });
      setLastResult({ win: true, amount: potentialWin });
    } else {
      haptic.error();
      setLastResult({ win: false, amount: currentBet });
    }

    setIsRolling(false);
  };

  const adjustBet = (action: 'half' | 'double' | 'max') => {
    haptic.light();
    let val = parseInt(betInput) || 0;
    if (action === 'half') val = Math.floor(val / 2);
    else if (action === 'double') val = val * 2;
    else if (action === 'max') val = profile?.totalPoints || 0;
    setBetInput(Math.max(MIN_BET, val).toString());
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col pb-32 overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/5 backdrop-blur-xl border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-white/5 border border-white/10">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Les Dés de l'Éveil</p>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 mt-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-black tabular-nums">{(profile?.totalPoints || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-6 pt-28 flex flex-col gap-8 max-w-4xl mx-auto w-full">
        {/* Zone de Révélation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[3rem] p-10 flex flex-col items-center justify-center text-center space-y-4 border border-white/5 relative overflow-hidden h-64 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Ton Numéro</p>
            <span className="text-8xl font-black italic tracking-tighter tabular-nums text-white/90">{targetNumber}</span>
          </Card>

          <Card className={cn(
            "border-none backdrop-blur-3xl rounded-[3rem] p-10 flex flex-col items-center justify-center text-center space-y-4 border transition-all duration-500 h-64 shadow-2xl",
            rolledNumber === null ? "bg-card/20 border-white/5" : 
            ( (mode === 'over' ? rolledNumber > targetNumber : rolledNumber < targetNumber) 
              ? "bg-green-500/10 border-green-500/20" 
              : "bg-red-500/10 border-red-500/20")
          )}>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Numéro Tombé</p>
            <AnimatePresence mode="wait">
              <motion.span 
                key={rolledNumber ?? 'none'}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                  "text-8xl font-black italic tracking-tighter tabular-nums",
                  rolledNumber === null ? "opacity-10" : "opacity-100"
                )}
              >
                {rolledNumber ?? "00"}
              </motion.span>
            </AnimatePresence>
            {rolledNumber !== null && !isRolling && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn(
                "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                (mode === 'over' ? rolledNumber > targetNumber : rolledNumber < targetNumber) ? "bg-green-500 text-white" : "bg-red-500 text-white"
              )}>
                {(mode === 'over' ? rolledNumber > targetNumber : rolledNumber < targetNumber) ? "Triomphe" : "Dissonance"}
              </motion.div>
            )}
          </Card>
        </div>

        {/* Statistiques du Flux */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-3xl p-4 text-center border border-white/5">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Multiplicateur</p>
            <p className="text-xl font-black italic">x{multiplier}</p>
          </div>
          <div className="bg-white/5 rounded-3xl p-4 text-center border border-white/5">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Gain Possible</p>
            <p className="text-xl font-black text-primary">+{potentialWin} <span className="text-[10px] opacity-40">PTS</span></p>
          </div>
          <div className="bg-white/5 rounded-3xl p-4 text-center border border-white/5">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Chance</p>
            <p className="text-xl font-black tabular-nums">{winChance}%</p>
          </div>
        </div>

        {/* Panneau de Commandement */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/5 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Ajuster le Destin</span>
                </div>
                <span className="text-xl font-black italic text-primary">{targetNumber}</span>
              </div>
              
              <div className="px-2">
                <Slider 
                  value={[targetNumber]} 
                  onValueChange={(val) => { haptic.light(); setTargetNumber(val[0]); }}
                  min={1} 
                  max={98} 
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between mt-2 opacity-20 text-[10px] font-black tabular-nums">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>98</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { haptic.light(); setMode('under'); }}
                  className={cn(
                    "h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest border transition-all",
                    mode === 'under' ? "bg-primary text-primary-foreground border-primary shadow-xl" : "bg-white/5 border-white/5 opacity-40"
                  )}
                >
                  <ChevronDown className="h-4 w-4" /> Inférieur
                </button>
                <button
                  onClick={() => { haptic.light(); setMode('over'); }}
                  className={cn(
                    "h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest border transition-all",
                    mode === 'over' ? "bg-primary text-primary-foreground border-primary shadow-xl" : "bg-white/5 border-white/5 opacity-40"
                  )}
                >
                  <ChevronUp className="h-4 w-4" /> Supérieur
                </button>
              </div>
            </div>
          </Card>

          <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-primary opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                </div>
              </div>
              
              <div className="relative">
                <Input 
                  type="number" 
                  value={betInput} 
                  onChange={e => setBetInput(e.target.value)}
                  className="h-14 bg-black/40 border-none rounded-2xl text-center font-black text-xl shadow-inner"
                />
                <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => adjustBet('half')} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">/ 2</button>
                <button onClick={() => adjustBet('double')} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">x 2</button>
                <button onClick={() => adjustBet('max')} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Max</button>
              </div>
            </div>

            <Button 
              onClick={handleRoll}
              disabled={isRolling}
              className="w-full h-20 rounded-[2rem] bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 relative overflow-hidden group active:scale-95 transition-all"
            >
              <div className="relative z-10 flex items-center gap-3">
                {isRolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />}
                Lancer les Dés
              </div>
              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
            </Button>
          </Card>
        </div>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-white/5 text-center space-y-3 relative overflow-hidden">
          <Sparkles className="h-6 w-6 mx-auto text-primary opacity-10" />
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic px-4">
            "Le hasard est un langage que seuls les esprits précis peuvent déchiffrer. Calibrez votre intention."
          </p>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary/5 blur-[80px] rounded-full" />
        </div>
      </main>
    </div>
  );
}
