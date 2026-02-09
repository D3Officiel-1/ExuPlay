
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Zap, 
  Loader2, 
  Bomb, 
  Diamond, 
  Trophy, 
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  History,
  TrendingUp,
  Settings2
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import confetti from "canvas-confetti";

const GRID_SIZE = 25;
const BET_PRESETS = [50, 100, 200, 500];
const MINES_PRESETS = [1, 3, 5, 10, 24];

type CellState = 'hidden' | 'gem' | 'mine';

/**
 * Calcule le multiplicateur pour le prochain clic réussi.
 * Formule : (Combinaisons Totales / Combinaisons Possibles sans mines)
 */
function calculateMultiplier(totalCells: number, totalMines: number, gemsFound: number) {
  let multiplier = 1;
  for (let i = 0; i < gemsFound; i++) {
    multiplier = multiplier * ((totalCells - i) / (totalCells - totalMines - i));
  }
  // On applique une marge de 3% pour le Sanctuaire
  return Math.max(1, multiplier * 0.97);
}

export default function MinesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // États du jeu
  const [bet, setBet] = useState(100);
  const [minesCount, setMinesCount] = useState(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [grid, setGrid] = useState<CellState[]>(Array(GRID_SIZE).fill('hidden'));
  const [minePositions, setMinesPositions] = useState<number[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentMultiplier = useMemo(() => {
    if (revealedIndices.length === 0) return 1;
    return calculateMultiplier(GRID_SIZE, minesCount, revealedIndices.length);
  }, [revealedIndices.length, minesCount]);

  const nextMultiplier = useMemo(() => {
    return calculateMultiplier(GRID_SIZE, minesCount, revealedIndices.length + 1);
  }, [revealedIndices.length, minesCount]);

  const potentialWin = Math.floor(bet * currentMultiplier);

  const handleStartGame = async () => {
    if (!profile || !userDocRef || isProcessing) return;
    
    if ((profile.totalPoints || 0) < bet) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Il vous manque ${bet - (profile.totalPoints || 0)} PTS.`
      });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      // Déduire la mise
      await updateDoc(userDocRef, {
        totalPoints: increment(-bet),
        updatedAt: serverTimestamp()
      });

      // Générer les mines
      const positions: number[] = [];
      while (positions.length < minesCount) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        if (!positions.includes(r)) positions.push(r);
      }

      setMinesPositions(positions);
      setGrid(Array(GRID_SIZE).fill('hidden'));
      setRevealedIndices([]);
      setGameState('playing');
      setLastWin(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance Système" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCellClick = (index: number) => {
    if (gameState !== 'playing' || revealedIndices.includes(index) || isProcessing) return;

    haptic.light();
    
    if (minePositions.includes(index)) {
      // PERDU
      haptic.error();
      const newGrid = [...grid];
      minePositions.forEach(pos => newGrid[pos] = 'mine');
      setGrid(newGrid);
      setGameState('ended');
      toast({
        variant: "destructive",
        title: "Dissonance !",
        description: "Vous avez heurté une mine de vide."
      });
    } else {
      // CONTINUER
      haptic.success();
      setRevealedIndices(prev => [...prev, index]);
      const newGrid = [...grid];
      newGrid[index] = 'gem';
      setGrid(newGrid);

      // Si toutes les gemmes sont trouvées, on cashout auto
      if (revealedIndices.length + 1 === GRID_SIZE - minesCount) {
        handleCashout();
      }
    }
  };

  const handleCashout = async () => {
    if (gameState !== 'playing' || revealedIndices.length === 0 || isProcessing) return;

    setIsProcessing(true);
    haptic.impact();

    try {
      const win = Math.floor(bet * currentMultiplier);
      await updateDoc(userDocRef!, {
        totalPoints: increment(win),
        updatedAt: serverTimestamp()
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#000000', '#ffd700']
      });

      setLastWin(win);
      setGameState('ended');
      
      // Révéler les mines restantes en transparence
      const newGrid = [...grid];
      minePositions.forEach(pos => {
        if (newGrid[pos] === 'hidden') newGrid[pos] = 'mine';
      });
      setGrid(newGrid);

      toast({
        title: "Lumière Récoltée !",
        description: `+${win} PTS de prospérité.`
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de transfert" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    haptic.light();
    setGameState('idle');
    setGrid(Array(GRID_SIZE).fill('hidden'));
    setRevealedIndices([]);
    setLastWin(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Mines de l'Éveil</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/5 rounded-full border border-primary/5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{profile?.totalPoints?.toLocaleString()} PTS</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        {/* Grille de Jeu */}
        <div className="relative aspect-square w-full grid grid-cols-5 gap-2 sm:gap-3 p-4 bg-card/20 backdrop-blur-3xl rounded-[3rem] border border-primary/5 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03),transparent_70%)] pointer-events-none" />
          
          {grid.map((state, i) => (
            <motion.button
              key={i}
              whileHover={state === 'hidden' && gameState === 'playing' ? { scale: 1.05 } : {}}
              whileTap={state === 'hidden' && gameState === 'playing' ? { scale: 0.95 } : {}}
              onClick={() => handleCellClick(i)}
              disabled={state !== 'hidden' || gameState !== 'playing' || isProcessing}
              className={cn(
                "relative flex items-center justify-center rounded-2xl sm:rounded-[1.5rem] transition-all duration-500 overflow-hidden",
                state === 'hidden' && "bg-primary/5 border border-primary/5 shadow-inner",
                state === 'gem' && "bg-green-500/10 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]",
                state === 'mine' && "bg-destructive/10 border-destructive/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]",
                gameState === 'ended' && state === 'hidden' && "opacity-40"
              )}
            >
              <AnimatePresence mode="wait">
                {state === 'hidden' ? (
                  <motion.div key="hidden" exit={{ scale: 0, rotate: 90, opacity: 0 }}>
                    <div className="h-2 w-2 rounded-full bg-primary/10" />
                  </motion.div>
                ) : state === 'gem' ? (
                  <motion.div 
                    key="gem" 
                    initial={{ scale: 0, rotate: -180 }} 
                    animate={{ scale: 1, rotate: 0 }} 
                    className="text-xl sm:text-2xl"
                  >
                    <EmojiOracle text="💎" forceStatic />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="mine" 
                    initial={{ scale: 0, rotate: 180 }} 
                    animate={{ scale: 1, rotate: 0 }} 
                    className="text-xl sm:text-2xl"
                  >
                    <EmojiOracle text="💣" forceStatic />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {/* Panneau de Contrôle */}
        <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl border border-primary/5">
          <div className="space-y-8">
            {gameState === 'idle' ? (
              <div className="space-y-6">
                {/* Configuration de la mise */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Zap className="h-3 w-3 text-primary opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {BET_PRESETS.map(amt => (
                      <button 
                        key={amt} 
                        onClick={() => { haptic.light(); setBet(amt); }}
                        className={cn(
                          "px-5 py-2.5 rounded-xl font-black text-xs transition-all border shrink-0",
                          bet === amt ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-primary/5 border-transparent opacity-40"
                        )}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Configuration des mines */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Bomb className="h-3 w-3 text-primary opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Concentration de Mines</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {MINES_PRESETS.map(count => (
                      <button 
                        key={count} 
                        onClick={() => { haptic.light(); setMinesCount(count); }}
                        className={cn(
                          "px-5 py-2.5 rounded-xl font-black text-xs transition-all border shrink-0",
                          minesCount === count ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-primary/5 border-transparent opacity-40"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleStartGame} 
                  disabled={isProcessing}
                  className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Invoquer le Flux"}
                </Button>
              </div>
            ) : gameState === 'playing' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-primary/5 rounded-[2rem] text-center space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Gain Actuel</p>
                    <p className="text-2xl font-black">{potentialWin} <span className="text-xs opacity-30">PTS</span></p>
                  </div>
                  <div className="p-5 bg-primary/5 rounded-[2rem] text-center space-y-1 border border-primary/5">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Prochain Flux</p>
                    <p className="text-2xl font-black text-primary">x{nextMultiplier.toFixed(2)}</p>
                  </div>
                </div>

                <Button 
                  onClick={handleCashout} 
                  disabled={revealedIndices.length === 0 || isProcessing}
                  className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/20"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : `Récolter ${potentialWin} PTS`}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-4">
                  {lastWin ? (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-2">
                      <Trophy className="h-12 w-12 text-yellow-500 mx-auto" />
                      <h2 className="text-3xl font-black italic">Triomphe !</h2>
                      <p className="text-sm font-medium opacity-40">+{lastWin} points de lumière extraits.</p>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-2">
                      <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                      <h2 className="text-3xl font-black italic">Extinction</h2>
                      <p className="text-sm font-medium opacity-40">Le vide a englouti votre mise.</p>
                    </motion.div>
                  )}
                </div>

                <Button 
                  onClick={handleReset}
                  className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl"
                >
                  Nouveau Cycle
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Footer Poétique */}
        <div className="p-8 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden">
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic">
            "Le savoir est une gemme cachée sous le poids de l'illusion. Purifiez votre intuition."
          </p>
        </div>
      </main>
    </div>
  );
}
