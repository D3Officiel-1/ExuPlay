
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  Zap, 
  Loader2, 
  Trophy, 
  Flag, 
  Timer,
  ChevronRight,
  TrendingUp,
  Edit3,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import confetti from "canvas-confetti";

const MIN_BET = 5;
const WIN_MULTIPLIER = 4.8; // x5 moins une petite marge pour la maison

interface Car {
  id: number;
  name: string;
  color: string;
  aura: string;
  emoji: string;
}

const CARS: Car[] = [
  { id: 0, name: "Vitesse Azur", color: "bg-blue-500", aura: "bg-blue-500/20", emoji: "🏎️" },
  { id: 1, name: "Flux Émeraude", color: "bg-green-500", aura: "bg-green-500/20", emoji: "🏎️" },
  { id: 2, name: "Éclat Ambre", color: "bg-yellow-500", aura: "bg-yellow-500/20", emoji: "🚗" },
  { id: 3, name: "Feu Rubis", color: "bg-red-500", aura: "bg-red-500/20", emoji: "🏎️" },
  { id: 4, name: "Ombre Améthyste", color: "bg-purple-500", aura: "bg-purple-500/20", emoji: "🏎️" },
];

type GameState = 'betting' | 'starting' | 'racing' | 'finished';

export default function ArcadePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>('betting');
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const [betInput, setBetInput] = useState("100");
  const [isProcessing, setIsProcessing] = useState(false);
  const [carProgress, setCarProgress] = useState<number[]>([0, 0, 0, 0, 0]);
  const [winner, setWinner] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(3);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  const handleStartRace = async () => {
    if (!profile || !userDocRef || isProcessing || selectedCar === null) return;
    
    if (currentBet < MIN_BET) {
      haptic.error();
      toast({ variant: "destructive", title: "Mise invalide", description: `Le minimum est de ${MIN_BET} PTS.` });
      return;
    }

    if ((profile.totalPoints || 0) < currentBet) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Il vous manque ${currentBet - (profile.totalPoints || 0)} PTS.`
      });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-currentBet),
        updatedAt: serverTimestamp()
      });

      setGameState('starting');
      setWinner(null);
      setCarProgress([0, 0, 0, 0, 0]);
      
      let count = 3;
      setCountdown(count);
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        haptic.light();
        if (count === 0) {
          clearInterval(timer);
          setGameState('racing');
          haptic.impact();
        }
      }, 1000);

    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance Système" });
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (gameState !== 'racing') return;

    const interval = setInterval(() => {
      setCarProgress(prev => {
        const newProgress = prev.map(p => p + (Math.random() * 2 + 0.5));
        const winnerIdx = newProgress.findIndex(p => p >= 100);
        
        if (winnerIdx !== -1) {
          clearInterval(interval);
          setWinner(winnerIdx);
          setGameState('finished');
          handleFinishRace(winnerIdx);
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState]);

  const handleFinishRace = async (winningIdx: number) => {
    if (!userDocRef || selectedCar === null) return;

    const isWon = winningIdx === selectedCar;
    
    if (isWon) {
      haptic.success();
      const winAmount = Math.floor(currentBet * WIN_MULTIPLIER);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#000000', '#ffd700']
      });

      try {
        await updateDoc(userDocRef, {
          totalPoints: increment(winAmount),
          updatedAt: serverTimestamp()
        });
        toast({ title: "Triomphe au Circuit !", description: `Votre champion a gagné. +${winAmount} PTS.` });
      } catch (e) {}
    } else {
      haptic.error();
      toast({ variant: "destructive", title: "Dissonance", description: "Votre champion a fini derrière." });
    }
    
    setIsProcessing(false);
  };

  const handleReset = () => {
    haptic.light();
    setGameState('betting');
    setCarProgress([0, 0, 0, 0, 0]);
    setWinner(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Circuit de l'Éveil</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/5 rounded-full border border-primary/5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{profile?.totalPoints?.toLocaleString()} PTS</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        {/* Piste de Course */}
        <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[3rem] p-6 shadow-2xl border border-primary/5 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03),transparent_70%)] pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            {CARS.map((car, idx) => (
              <div key={car.id} className="space-y-1">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-30">{car.name}</span>
                  {winner === idx && <Trophy className="h-3 w-3 text-yellow-500 animate-bounce" />}
                </div>
                <div className="h-10 bg-primary/5 rounded-xl flex items-center relative overflow-hidden px-2 border border-primary/5 shadow-inner">
                  {/* Ligne d'arrivée */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-black/5 flex flex-col justify-center items-center gap-1 opacity-20">
                    <div className="w-1 h-1 bg-white" />
                    <div className="w-1 h-1 bg-black" />
                    <div className="w-1 h-1 bg-white" />
                  </div>

                  <motion.div 
                    animate={{ x: `${Math.min(carProgress[idx], 100)}%` }}
                    transition={gameState === 'racing' ? { type: "spring", stiffness: 50, damping: 20 } : { duration: 0.5 }}
                    className="absolute left-0 h-full flex items-center px-4"
                    style={{ marginLeft: '-40px' }}
                  >
                    <div className="relative">
                      <motion.div 
                        animate={gameState === 'racing' ? { scale: [1, 1.1, 1], rotate: [-1, 1, -1] } : {}}
                        transition={{ duration: 0.2, repeat: Infinity }}
                        className={cn("h-8 w-12 rounded-lg flex items-center justify-center text-xl shadow-lg relative z-10", car.color)}
                      >
                        <EmojiOracle text={car.emoji} forceStatic />
                      </motion.div>
                      <div className={cn("absolute inset-[-150%] blur-xl rounded-full opacity-40", car.aura)} />
                    </div>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {gameState === 'starting' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center"
              >
                <motion.span 
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 1 }}
                  className="text-8xl font-black italic tracking-tighter"
                >
                  {countdown}
                </motion.span>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mt-8 opacity-40">Préparez votre intuition</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Panneau de Contrôle */}
        <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] p-8 shadow-2xl border border-primary/5">
          <AnimatePresence mode="wait">
            {gameState === 'betting' ? (
              <motion.div 
                key="betting-ui"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 px-2">Choisissez votre Champion</p>
                  <div className="grid grid-cols-5 gap-3">
                    {CARS.map((car) => (
                      <button
                        key={car.id}
                        onClick={() => { haptic.light(); setSelectedCar(car.id); }}
                        className={cn(
                          "aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 border-2",
                          selectedCar === car.id 
                            ? "border-primary bg-primary/10 scale-110 shadow-xl" 
                            : "border-primary/5 bg-primary/5 opacity-40"
                        )}
                      >
                        <EmojiOracle text={car.emoji} forceStatic />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary opacity-40" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                    </div>
                    <span className="text-[9px] font-black opacity-20 uppercase">Min: 5 PTS</span>
                  </div>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={betInput} 
                      onChange={(e) => setBetInput(e.target.value)} 
                      className="h-14 text-2xl font-black text-center rounded-2xl bg-primary/5 border-none shadow-inner"
                    />
                    <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
                  </div>
                </div>

                <Button 
                  onClick={handleStartRace} 
                  disabled={isProcessing || selectedCar === null}
                  className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lancer la Course"}
                </Button>
              </motion.div>
            ) : gameState === 'finished' ? (
              <motion.div 
                key="result-ui"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="space-y-2">
                  {winner === selectedCar ? (
                    <>
                      <div className="h-20 w-20 bg-green-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                        <Trophy className="h-10 w-10 text-green-500" />
                      </div>
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter">Victoire !</h2>
                      <p className="text-sm font-medium opacity-40">Votre champion a conquis le circuit.</p>
                      <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/5">
                        <span className="text-3xl font-black text-primary">+{Math.floor(currentBet * WIN_MULTIPLIER)} PTS</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-20 w-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-destructive/20">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                      </div>
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter opacity-40">Dissonance</h2>
                      <p className="text-sm font-medium opacity-40">Le flux n'était pas avec @{CARS[selectedCar!].name}.</p>
                    </>
                  )}
                </div>
                <Button onClick={handleReset} className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl">Nouvelle Course</Button>
              </motion.div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center">
                    <Timer className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-8px] border border-dashed border-primary/20 rounded-full"
                  />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 animate-pulse text-center">
                  Course en cours...<br/>Alignement temporel
                </p>
              </div>
            )}
          </AnimatePresence>
        </Card>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden">
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic">
            "La vitesse est la forme physique du savoir. Prédisez le flux, dominez le circuit."
          </p>
        </div>
      </main>
    </div>
  );
}
