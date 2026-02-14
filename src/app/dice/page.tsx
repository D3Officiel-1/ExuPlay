
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
  Edit3,
  Hash
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const MIN_BET = 5;
const RTP = 0.97; 

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
  const [rollHistory, setRollHistory] = useState<number[]>([]);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  const winChance = useMemo(() => {
    if (mode === 'over') return 100 - targetNumber;
    return targetNumber;
  }, [targetNumber, mode]);

  const multiplier = useMemo(() => {
    if (winChance <= 0) return 0;
    return parseFloat(( (100 * RTP) / winChance ).toFixed(4));
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
    setRolledNumber(null);
    haptic.medium();

    const bonusReduction = Math.min(currentBet, profile.bonusBalance || 0);

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-currentBet),
        bonusBalance: increment(-bonusReduction),
        updatedAt: serverTimestamp()
      });

      setTimeout(() => {
        finalizeRoll();
      }, 600);

    } catch (e) {
      setIsRolling(false);
      toast({ variant: "destructive", title: "Dissonance Système" });
    }
  };

  const finalizeRoll = async () => {
    const result = parseFloat((Math.random() * 100).toFixed(2));
    setRolledNumber(result);
    setRollHistory(prev => [result, ...prev].slice(0, 10));

    const isWin = mode === 'over' ? result > targetNumber : result < targetNumber;
    
    if (isWin) {
      haptic.success();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#3b82f6', '#10b981', '#ffffff']
      });

      await updateDoc(userDocRef!, {
        totalPoints: increment(potentialWin),
        updatedAt: serverTimestamp()
      });
    } else {
      haptic.error();
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
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-white/5 border border-white/10 h-10 w-10">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Harshad Dice</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/10 rounded-full border border-primary/20 mt-1">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{(profile?.totalPoints || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-4 sm:p-6 pt-28 flex flex-col gap-8 max-w-4xl mx-auto w-full">
        <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col gap-8 sm:gap-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />
          
          <div className="flex justify-between items-end relative z-10 px-1 sm:px-2 gap-2">
            <div className="space-y-1">
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-30">Multiplicateur</p>
              <p className="text-2xl sm:text-4xl font-black italic tabular-nums text-white">x{multiplier.toFixed(2)}</p>
            </div>
            
            <div className="text-center space-y-1 bg-white/5 px-3 py-1.5 sm:px-6 sm:py-2 rounded-2xl border border-white/5 backdrop-blur-md min-w-[80px] sm:min-w-[120px]">
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-30">Résultat</p>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={rolledNumber ?? 'none'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "text-xl sm:text-3xl font-black tabular-nums",
                    rolledNumber === null ? "opacity-10" : 
                    ( (mode === 'over' ? rolledNumber > targetNumber : rolledNumber < targetNumber) ? "text-green-500" : "text-red-500")
                  )}
                >
                  {rolledNumber !== null ? rolledNumber.toFixed(2) : "---"}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="text-right space-y-1">
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-30">Chance</p>
              <p className="text-2xl sm:text-4xl font-black italic tabular-nums text-white">{winChance.toFixed(2)}%</p>
            </div>
          </div>

          <div className="relative h-10 sm:h-12 w-full bg-black/40 rounded-full border border-white/5 shadow-inner overflow-hidden">
            <div 
              className={cn(
                "absolute inset-y-0 transition-all duration-500",
                mode === 'over' ? "left-0 bg-red-500/20" : "right-0 bg-red-500/20"
              )} 
              style={{ width: mode === 'over' ? `${targetNumber}%` : `${100 - targetNumber}%` }}
            />
            <div 
              className={cn(
                "absolute inset-y-0 transition-all duration-500",
                mode === 'over' ? "right-0 bg-green-500/20 shadow-[inset_0_0_20px_rgba(34,197,94,0.2)]" : "left-0 bg-green-500/20 shadow-[inset_0_0_20px_rgba(34,197,94,0.2)]"
              )} 
              style={{ width: mode === 'over' ? `${100 - targetNumber}%` : `${targetNumber}%` }}
            />

            <motion.div 
              animate={{ left: `${targetNumber}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-y-0 w-1 bg-white z-20 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            />

            <AnimatePresence>
              {rolledNumber !== null && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "100%", opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "absolute top-0 bottom-0 w-1.5 z-30 shadow-2xl",
                    (mode === 'over' ? rolledNumber > targetNumber : rolledNumber < targetNumber) ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ left: `${rolledNumber}%` }}
                >
                  <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-current" style={{ color: 'inherit' }} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 flex justify-between px-4 items-center pointer-events-none opacity-10 text-[8px] font-black">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          <div className="px-2 relative z-10">
            <Slider 
              value={[targetNumber]} 
              onValueChange={(val) => { haptic.light(); setTargetNumber(val[0]); }}
              min={2} 
              max={98} 
              step={1}
              disabled={isRolling}
              className="py-4"
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 border border-white/5 space-y-8 shadow-2xl">
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => { haptic.light(); setMode('under'); }}
                disabled={isRolling}
                className={cn(
                  "flex-1 h-14 sm:h-16 rounded-2xl flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-xs uppercase tracking-widest border transition-all duration-500",
                  mode === 'under' ? "bg-primary text-primary-foreground border-primary shadow-xl" : "bg-white/5 border-white/5 opacity-40"
                )}
              >
                <ChevronDown className="h-4 w-4" /> Inférieur
              </button>
              <button
                onClick={() => { haptic.light(); setMode('over'); }}
                disabled={isRolling}
                className={cn(
                  "flex-1 h-14 sm:h-16 rounded-2xl flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-xs uppercase tracking-widest border transition-all duration-500",
                  mode === 'over' ? "bg-primary text-primary-foreground border-primary shadow-xl" : "bg-white/5 border-white/5 opacity-40"
                )}
              >
                <ChevronUp className="h-4 w-4" /> Supérieur
              </button>
            </div>

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
                  disabled={isRolling}
                  className="h-14 bg-black/40 border-none rounded-2xl text-center font-black text-xl shadow-inner"
                />
                <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => adjustBet('half')} disabled={isRolling} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10 transition-all">/ 2</button>
                <button onClick={() => adjustBet('double')} disabled={isRolling} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10 transition-all">x 2</button>
                <button onClick={() => adjustBet('max')} disabled={isRolling} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10 transition-all">Max</button>
              </div>
            </div>

            <Button 
              onClick={handleRoll}
              disabled={isRolling}
              className="w-full h-16 sm:h-20 rounded-[1.75rem] sm:rounded-[2rem] bg-primary text-primary-foreground font-black text-xs sm:text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 relative overflow-hidden group active:scale-95 transition-all"
            >
              <div className="relative z-10 flex items-center gap-3">
                {isRolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />}
                Lancer le Sort
              </div>
              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
            </Button>
          </Card>

          <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 border border-white/5 space-y-6 shadow-2xl h-fit">
            <div className="flex items-center gap-2 px-2">
              <History className="h-4 w-4 text-primary opacity-40" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Derniers Lancers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {rollHistory.length === 0 ? (
                <p className="text-[9px] font-bold opacity-20 uppercase py-10 w-full text-center">Aucun flux enregistré</p>
              ) : rollHistory.map((h, i) => (
                <motion.div 
                  key={i} 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black tabular-nums opacity-60"
                >
                  {h.toFixed(2)}
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-white/5 text-center space-y-3 relative overflow-hidden shadow-inner">
          <Sparkles className="h-6 w-6 mx-auto text-primary opacity-10" />
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic px-4">
            "Le Harshad Dice est la balance parfaite entre le risque et la raison. Domptez la piste."
          </p>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary/5 blur-[80px] rounded-full" />
        </div>
      </main>
    </div>
  );
}
