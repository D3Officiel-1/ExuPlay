
'use client';

import { useState, useEffect, useCallback, FC, useRef, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronLeft, 
  Minus, 
  Plus, 
  History, 
  Send, 
  Rocket, 
  Zap, 
  Activity, 
  Edit3, 
  Loader2, 
  TrendingUp,
  Flame,
  Globe,
  Users,
  ShieldCheck,
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp, increment, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from '@/lib/haptics';
import { EmojiOracle } from '@/components/EmojiOracle';
import { triggerNextJetRound, getJetHistory } from '@/app/actions/jet-lumiere';

type GameState = 'waiting' | 'betting' | 'in_progress' | 'crashed';
type BetState = 'IDLE' | 'PENDING' | 'PLACED' | 'CASHED_OUT' | 'LOST';
type PlayerStatus = 'waiting' | 'betting' | 'cashed_out' | 'lost';

interface BetPanelData {
  betState: BetState;
  betAmount: number;
  winAmount: number;
  isAutoBet: boolean;
  isAutoCashout: boolean;
  autoCashoutValue: number;
  lastRoundId: string;
}

const loadingTexts = [
    "OUVERTURE DU PORTAIL...",
    "VÉRIFICATION DE L'ESSENCE...",
    "SYNCHRONISATION AU NOYAU...",
    "FLUX PRÊT.",
];

interface SimulatedPlayer {
    id: number | string;
    name: string;
    avatar: string;
    bet: number;
    status: PlayerStatus;
    cashoutMultiplier?: number;
}

interface ChatMessage {
    id: string;
    user: string;
    text: string;
    color: string;
    isUser?: boolean;
}

interface BetPanelProps {
  id: number;
  balance: number;
  gameState: GameState;
  betData: BetPanelData;
  onBet: (id: number, amount: number) => void;
  onCancel: (id: number) => void;
  onCashout: (id: number, cashoutMultiplier?: number) => void;
  onUpdate: (id: number, data: Partial<BetPanelData>) => void;
  multiplier: number;
  isProcessing: boolean;
}

const MIN_BET = 5;

const generateRandomName = (): string => {
    const beginnings = ["Art", "Neo", "Flux", "Zon", "Zen", "Void", "Lux", "Kry", "Eon", "Vex"];
    const middles = ["-", "_", "X", "0", "1", "V", "S"];
    const endings = ["99", "Pro", "Sage", "Elite", "Prime", "Alpha", "Omega"];
    return `${beginnings[Math.floor(Math.random() * beginnings.length)]}${middles[Math.floor(Math.random() * middles.length)]}${endings[Math.floor(Math.random() * endings.length)]}`;
}

const generateFakePlayers = (count: number): SimulatedPlayer[] => {
    const players = [];
    for (let i = 0; i < count; i++) {
        const name = generateRandomName();
        players.push({
            id: i,
            name: name,
            avatar: name.slice(0, 2).toUpperCase(),
            bet: 0,
            status: 'waiting',
        });
    }
    return players;
};

const fakeMessages = [
    { text: "L'ascension est magnifique ! ✨", color: "#60a5fa" },
    { text: "Retrait à 2.0x, prudence est sagesse. 🧘", color: "#4ade80" },
    { text: "On vise les étoiles aujourd'hui ! 🚀", color: "#f472b6" },
    { text: "Le flux est instable, attention... ⚠️", color: "#fbbf24" },
    { text: "TO THE MOON! 💎", color: "#22d3ee" }
];

interface Particle {
  x: number; y: number; size: number; opacity: number; vx: number; vy: number; life: number; maxLife: number; color: string;
}

interface Star { x: number; y: number; size: number; opacity: number; }

const JetCanvasAnimation: FC<{ multiplier: number; gameState: GameState }> = ({ multiplier, gameState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const starsRef = useRef<Star[]>([]);
    const animationFrameId = useRef<number>(undefined);
    const lastTime = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && starsRef.current.length === 0) {
            for (let i = 0; i < 100; i++) {
                starsRef.current.push({ 
                  x: Math.random() * canvas.width, 
                  y: Math.random() * canvas.height, 
                  size: Math.random() * 2, 
                  opacity: Math.random() 
                });
            }
        }
    }, []);

    const draw = useCallback((time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const deltaTime = (time - lastTime.current) / 16.67;
        lastTime.current = time;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#020617');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        starsRef.current.forEach(star => {
            const speed = (gameState === 'in_progress' ? multiplier * 0.5 : 0.2) * deltaTime;
            star.y += speed;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
            ctx.globalAlpha = star.opacity * (gameState === 'in_progress' ? 0.8 : 0.3);
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        const visualProgress = Math.min(multiplier, 20) / 20;
        const startX = 100;
        const startY = canvas.height - 100;
        const endX = canvas.width - 150;
        const endY = 100;

        const currentX = startX + (endX - startX) * visualProgress;
        const currentY = startY + (endY - startY) * Math.pow(visualProgress, 1.5);

        if (gameState === 'in_progress' || gameState === 'crashed') {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 10]);
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, currentX, currentY);
            ctx.stroke();
            ctx.setLineDash([]);

            if (gameState === 'in_progress') {
                for (let i = 0; i < 3; i++) {
                    const life = Math.random() * 40 + 20;
                    particlesRef.current.push({
                        x: currentX,
                        y: currentY,
                        size: Math.random() * 4 + 1,
                        opacity: 1,
                        vx: (Math.random() - 0.5) * 4 - (multiplier * 0.5),
                        vy: (Math.random() - 0.5) * 4 + 2,
                        life: life,
                        maxLife: life,
                        color: multiplier > 10 ? '#a855f7' : multiplier > 2 ? '#10b981' : '#3b82f6'
                    });
                }
            }
        }

        particlesRef.current = particlesRef.current.map(p => {
            p.life -= deltaTime;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.opacity = p.life / p.maxLife;
            return p;
        }).filter(p => p.life > 0);

        particlesRef.current.forEach(p => {
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        if (gameState === 'in_progress') {
            const glowSize = 20 + Math.sin(time / 100) * 5;
            const radial = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, glowSize);
            const mainColor = multiplier > 10 ? '168, 85, 247' : multiplier > 2 ? '16, 185, 129' : '59, 130, 246';
            radial.addColorStop(0, `rgba(${mainColor}, 1)`);
            radial.addColorStop(1, `rgba(${mainColor}, 0)`);
            
            ctx.globalAlpha = 1;
            ctx.fillStyle = radial;
            ctx.beginPath();
            ctx.arc(currentX, currentY, glowSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        if (gameState === 'crashed') {
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(currentX, currentY, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        animationFrameId.current = requestAnimationFrame(draw);
    }, [multiplier, gameState]);

    useEffect(() => {
        animationFrameId.current = requestAnimationFrame(draw);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [draw]);

    return <canvas ref={canvasRef} width={1200} height={600} className="absolute inset-0 w-full h-full object-cover opacity-60" />;
};

const BetPanel: FC<BetPanelProps> = ({ id, balance, gameState, betData, onBet, onCancel, onCashout, onUpdate, multiplier, isProcessing }) => {
  const { betState, betAmount, autoCashoutValue } = betData;
  const { toast } = useToast();

  const handleAction = () => {
    if (isProcessing) return;
    if (betState === 'IDLE') {
        if (gameState !== 'betting' && gameState !== 'waiting') {
            toast({ variant: 'destructive', title: "Attendez le prochain flux" });
            return;
        }
        if (betAmount < MIN_BET) return;
        if (betAmount > balance) {
            toast({ variant: 'destructive', title: "Lumière insuffisante" });
            return;
        }
        onBet(id, betAmount);
    } else if (betState === 'PENDING') {
        onCancel(id);
    } else if (betState === 'PLACED') {
        if (gameState !== 'in_progress') return;
        onCashout(id);
    }
  };

  const isLocked = betState === 'CASHED_OUT' || betState === 'LOST';

  return (
    <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[2rem] p-5 space-y-5 border border-primary/5 shadow-2xl relative overflow-hidden group">
        <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Poste de Flux #{id}</span>
            {betState === 'PLACED' && (
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full border border-primary/10">
                    <Zap className="h-3 w-3 text-primary animate-pulse" />
                    <span className="text-[9px] font-black text-primary uppercase">Actif</span>
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Mise (PTS)</Label>
                <div className="relative">
                    <Input 
                        type="number" 
                        value={betAmount} 
                        onChange={e => onUpdate(id, { betAmount: Number(e.target.value) })}
                        disabled={betState !== 'IDLE'}
                        className="h-12 bg-primary/5 border-none rounded-xl text-center font-black text-lg shadow-inner"
                    />
                    <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 opacity-20" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest opacity-30 ml-2">Retrait Auto</Label>
                <div className="relative">
                    <Input 
                        type="number" 
                        step="0.1"
                        value={autoCashoutValue} 
                        onChange={e => onUpdate(id, { autoCashoutValue: Number(e.target.value) })}
                        disabled={betState !== 'IDLE'}
                        className="h-12 bg-primary/5 border-none rounded-xl text-center font-black text-lg shadow-inner"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-20">X</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
            {[10, 50, 100, 500].map(v => (
                <button 
                    key={v}
                    disabled={betState !== 'IDLE'}
                    onClick={() => onUpdate(id, { betAmount: betAmount + v })}
                    className="h-8 rounded-lg bg-primary/5 text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 disabled:opacity-20 transition-all"
                >
                    +{v}
                </button>
            ))}
        </div>

        <div className="flex items-center justify-between px-2 py-1 bg-primary/5 rounded-2xl border border-primary/5">
            <div className="flex items-center gap-3">
                <Switch 
                    checked={betData.isAutoBet} 
                    onCheckedChange={checked => onUpdate(id, { isAutoBet: checked })} 
                />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Auto Pari</span>
            </div>
            <div className="flex items-center gap-3">
                <Switch 
                    checked={betData.isAutoCashout} 
                    onCheckedChange={checked => onUpdate(id, { isAutoCashout: checked })} 
                />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Auto Retrait</span>
            </div>
        </div>

        <Button 
            onClick={handleAction}
            disabled={isLocked || isProcessing || (betState === 'IDLE' && gameState === 'in_progress')}
            className={cn(
                "w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all duration-500",
                betState === 'IDLE' ? "bg-primary text-primary-foreground shadow-primary/20" :
                betState === 'PENDING' ? "bg-orange-500/10 text-orange-600 border border-orange-500/20 shadow-none" :
                betState === 'PLACED' ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/30 scale-[1.02]" :
                "opacity-40 grayscale"
            )}
        >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 
             betState === 'IDLE' ? "Invoquer" :
             betState === 'PENDING' ? "Annuler" :
             betState === 'PLACED' ? `Encaisser ${(betAmount * multiplier).toFixed(0)} F` :
             betState === 'CASHED_OUT' ? "Succès" : "Perdu"}
        </Button>
    </Card>
  );
};

export default function JetLumierePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const jetConfigRef = useMemo(() => (db ? doc(db, "appConfig", "jet") : null), [db]);
  
  const { data: profile } = useDoc(userDocRef);
  const { data: globalState } = useDoc(jetConfigRef);

  const [multiplier, setMultiplier] = useState(1.00);
  const [history, setHistory] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const [bet1Data, setBet1Data] = useState<BetPanelData>({ betState: 'IDLE', betAmount: 100, winAmount: 0, isAutoBet: false, isAutoCashout: false, autoCashoutValue: 2.00, lastRoundId: '' });
  const [bet2Data, setBet2Data] = useState<BetPanelData>({ betState: 'IDLE', betAmount: 100, winAmount: 0, isAutoBet: false, isAutoCashout: false, autoCashoutValue: 2.00, lastRoundId: '' });
  
  const [simulatedPlayers, setSimulatedPlayers] = useState<SimulatedPlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bet1DataRef = useRef(bet1Data);
  const bet2DataRef = useRef(bet2Data);
  const globalStateRef = useRef<any>(null);
  
  useEffect(() => { bet1DataRef.current = bet1Data; }, [bet1Data]);
  useEffect(() => { bet2DataRef.current = bet2Data; }, [bet2Data]);
  useEffect(() => { globalStateRef.current = globalState; }, [globalState]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
      const initHistory = async () => {
        const hist = await getJetHistory(10);
        setHistory(hist);
      };
      initHistory();

      const chatInterval = setInterval(() => {
          const randomMessage = fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
          const randomName = generateRandomName();
          const newMessage: ChatMessage = { id: `${Date.now()}-${Math.random()}`, user: randomName, ...randomMessage };
          setChatMessages(prev => [...prev.slice(-12), newMessage]);
      }, Math.random() * 6000 + 4000);
      return () => clearInterval(chatInterval);
  }, []);

  // --- MOTEUR DE SYNCHRONISATION UNIVERSEL ---
  useEffect(() => {
    if (!db || !jetConfigRef) return;

    // Initialisation si le document n'existe pas
    const initDoc = async () => {
        const snap = await getDoc(jetConfigRef);
        if (!snap.exists()) {
            await setDoc(jetConfigRef, {
                status: 'waiting',
                crashPoint: 1.5,
                startTime: new Date().toISOString(),
                roundId: `JET-INIT-${Date.now()}`,
                lastUpdate: serverTimestamp()
            });
        }
    };
    initDoc();

    if (!globalState) return;

    const status = globalState.status as GameState;
    const roundId = globalState.roundId;
    const startTimeStr = globalState.startTime;
    const startTime = (globalState.startTime instanceof Timestamp) 
        ? globalState.startTime.toDate().getTime() 
        : new Date(startTimeStr).getTime();
    const crashPoint = globalState.crashPoint;

    // Reset local bets if a new round starts
    if (roundId !== bet1DataRef.current.lastRoundId) {
        setBet1Data(prev => ({ ...prev, betState: 'IDLE', lastRoundId: roundId, winAmount: 0 }));
        setBet2Data(prev => ({ ...prev, betState: 'IDLE', lastRoundId: roundId, winAmount: 0 }));
        setSimulatedPlayers(generateFakePlayers(12));
    }

    let growthFrameId: number;

    if (status === 'in_progress') {
        const growthLoop = () => {
            const now = Date.now();
            const elapsedMs = now - startTime;
            
            // Formule déterministe partagée : m = 1.002 ^ (t / 10)
            const currentMultiplier = Math.pow(1.002, elapsedMs / 10);
            
            if (currentMultiplier >= crashPoint) {
                // Détection locale du crash synchrone
                setMultiplier(crashPoint);
                handleGlobalStateTransition('crashed');
            } else {
                setMultiplier(currentMultiplier);
                
                // Auto-Cashout Sync
                if (bet1DataRef.current.betState === 'PLACED' && bet1DataRef.current.isAutoCashout && currentMultiplier >= bet1DataRef.current.autoCashoutValue) {
                    handleCashout(1, bet1DataRef.current.autoCashoutValue);
                }
                if (bet2DataRef.current.betState === 'PLACED' && bet2DataRef.current.isAutoCashout && currentMultiplier >= bet2DataRef.current.autoCashoutValue) {
                    handleCashout(2, bet2DataRef.current.autoCashoutValue);
                }

                growthFrameId = requestAnimationFrame(growthLoop);
            }
        };
        growthFrameId = requestAnimationFrame(growthLoop);
    } else {
        setMultiplier(status === 'crashed' ? crashPoint : 1.00);
        
        // Timers de transition pour le "Leader"
        let timer: NodeJS.Timeout;
        if (status === 'crashed') {
            timer = setTimeout(() => handleGlobalStateTransition('waiting'), 4000);
        } else if (status === 'waiting') {
            timer = setTimeout(() => handleGlobalStateTransition('betting'), 3000);
        } else if (status === 'betting') {
            // Auto-pari logic
            if (bet1DataRef.current.isAutoBet && bet1DataRef.current.betState === 'IDLE' && (profile?.totalPoints || 0) >= bet1DataRef.current.betAmount) handleBet(1, bet1DataRef.current.betAmount);
            if (bet2DataRef.current.isAutoBet && bet2DataRef.current.betState === 'IDLE' && (profile?.totalPoints || 0) >= bet2DataRef.current.betAmount) handleBet(2, bet2DataRef.current.betAmount);

            timer = setTimeout(() => handleGlobalStateTransition('in_progress'), 8000);
        }
        return () => {
            if (timer) clearTimeout(timer);
            if (growthFrameId) cancelAnimationFrame(growthFrameId);
        };
    }

    return () => { if (growthFrameId) cancelAnimationFrame(growthFrameId); };
  }, [globalState, db, profile?.totalPoints]);

  const handleGlobalStateTransition = async (nextStatus: GameState) => {
    if (!db || !jetConfigRef || !globalStateRef.current) return;
    
    const currentStatus = globalStateRef.current.status;
    
    // Protection anti-race condition : on ne fait rien si le document a été mis à jour très récemment (par un autre leader)
    const lastUpdate = (globalStateRef.current.lastUpdate as Timestamp)?.toDate().getTime() || 0;
    if (Date.now() - lastUpdate < 1000) return;

    try {
        if (nextStatus === 'in_progress' && currentStatus === 'betting') {
            const nextRound = await triggerNextJetRound();
            await updateDoc(jetConfigRef, {
                status: 'in_progress',
                crashPoint: nextRound.crashPoint,
                startTime: serverTimestamp(),
                roundId: nextRound.id,
                lastUpdate: serverTimestamp()
            });
            // Validation locale immédiate des paris en attente
            setBet1Data(b => b.betState === 'PENDING' ? { ...b, betState: 'PLACED' } : b);
            setBet2Data(b => b.betState === 'PENDING' ? { ...b, betState: 'PLACED' } : b);
        } else if (nextStatus === 'crashed' && currentStatus === 'in_progress') {
            await updateDoc(jetConfigRef, { status: 'crashed', lastUpdate: serverTimestamp() });
            setBet1Data(b => b.betState === 'PLACED' ? {...b, betState: 'LOST'} : b);
            setBet2Data(b => b.betState === 'PLACED' ? {...b, betState: 'LOST'} : b);
            haptic.impact();
        } else if (nextStatus === 'waiting' && currentStatus === 'crashed') {
            await updateDoc(jetConfigRef, { status: 'waiting', lastUpdate: serverTimestamp() });
        } else if (nextStatus === 'betting' && currentStatus === 'waiting') {
            await updateDoc(jetConfigRef, { status: 'betting', lastUpdate: serverTimestamp() });
        }
    } catch (e) {
        // Ignorer les erreurs de permissions ou de conflits
    }
  };

  const handleBet = useCallback(async (id: number, amount: number) => {
    if (!userDocRef || isProcessing) return;
    const betSetter = id === 1 ? setBet1Data : setBet2Data;
    
    setIsProcessing(true);
    haptic.medium();

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-amount),
        updatedAt: serverTimestamp()
      });
      betSetter(prev => ({ ...prev, betState: 'PENDING', betAmount: amount }));
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur de mise" });
    } finally {
      setIsProcessing(false);
    }
  }, [userDocRef, isProcessing, toast]);

  const handleCancel = useCallback(async (id: number) => {
      if (!userDocRef || isProcessing) return;
      const betData = id === 1 ? bet1DataRef.current : bet2DataRef.current;
      const betSetter = id === 1 ? setBet1Data : setBet2Data;
      
      setIsProcessing(true);
      haptic.light();

      try {
        await updateDoc(userDocRef, {
          totalPoints: increment(betData.betAmount),
          updatedAt: serverTimestamp()
        });
        betSetter(prev => ({ ...prev, betState: 'IDLE' }));
      } finally {
        setIsProcessing(false);
      }
  }, [userDocRef, isProcessing]);

  const handleCashout = useCallback(async (id: number, cashoutMultiplier?: number) => {
      if (!userDocRef || isProcessing || !globalStateRef.current) return;
      const betData = id === 1 ? bet1DataRef.current : bet2DataRef.current;
      const betSetter = id === 1 ? setBet1Data : setBet2Data;
      
      if (betData.betState !== 'PLACED') return;

      setIsProcessing(true);
      haptic.success();

      const finalMultiplier = cashoutMultiplier || multiplier;
      const winAmount = Math.floor(betData.betAmount * finalMultiplier);

      try {
        await updateDoc(userDocRef, {
          totalPoints: increment(winAmount),
          updatedAt: serverTimestamp()
        });
        betSetter(prev => ({ ...prev, betState: 'CASHED_OUT', winAmount }));
        toast({ title: "Flux Récupéré !", description: `+${winAmount} PTS (x${finalMultiplier.toFixed(2)})` });
      } finally {
        setIsProcessing(false);
      }
  }, [multiplier, userDocRef, isProcessing, toast]);
  
  const handleUpdateBet = useCallback((id: number, data: Partial<BetPanelData>) => {
      const betSetter = id === 1 ? setBet1Data : setBet2Data;
      betSetter(prev => ({...prev, ...data}));
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMessage: ChatMessage = { id: `${Date.now()}-${user?.uid}`, user: profile?.username || 'Anonyme', text: chatInput, color: 'hsl(var(--primary))', isUser: true };
    setChatMessages(prev => [...prev.slice(-12), newMessage]);
    setChatInput('');
    haptic.light();
  };

  useEffect(() => {
    if (isLoading) {
        const textInterval = setInterval(() => { setLoadingTextIndex(prev => (prev < loadingTexts.length - 1 ? prev + 1 : prev)); }, 700);
        const readyTimer = setTimeout(() => setIsLoading(false), 3000);
        return () => { clearInterval(textInterval); clearTimeout(readyTimer); };
    }
  }, [isLoading]);

  if (isLoading || !user || !globalState) {
    return (
       <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#020617] p-8 text-center relative overflow-hidden">
        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 10, repeat: Infinity }} className="absolute inset-0 bg-primary/10 blur-[150px] rounded-full" />
        <div className="z-10 space-y-16">
          <div className="relative h-28 w-28 mx-auto">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-full" />
            <div className="absolute inset-4 flex items-center justify-center bg-card/40 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-primary/10">
              <Rocket className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.p key={loadingTextIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-[11px] font-black uppercase tracking-[0.6em] text-primary">{loadingTexts[loadingTextIndex]}</motion.p>
            </AnimatePresence>
            <div className="w-56 h-[1px] bg-primary/10 rounded-full mx-auto overflow-hidden">
              <motion.div initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ duration: 3, ease: "easeInOut" }} className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const gameState = globalState.status as GameState;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col pb-32 lg:pb-0">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/5 backdrop-blur-xl border-b border-primary/5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Oracle du Flux Universel</p>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-black tabular-nums tracking-tighter">{(profile?.totalPoints || 0).toLocaleString()} <span className="opacity-40 text-[9px]">PTS</span></span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[300px_1fr_320px] pt-24 px-4 gap-6 max-w-screen-2xl mx-auto w-full">
        {/* Sidebar Gauche: Esprits */}
        <aside className="hidden lg:flex flex-col bg-card/10 backdrop-blur-3xl rounded-[3rem] border border-primary/5 p-8 space-y-8 overflow-hidden shadow-2xl">
            <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3 w-3 text-primary opacity-40" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Dimension</p>
                </div>
                <h3 className="text-2xl font-black italic tracking-tighter">Les Esprits</h3>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                <PlayerList players={simulatedPlayers} profile={profile} />
            </div>
        </aside>

        {/* Centre: Arène de Vol */}
        <div className="flex flex-col gap-6">
            <main className="relative aspect-video lg:flex-1 min-h-[360px] bg-card/20 backdrop-blur-3xl rounded-[3.5rem] border border-primary/10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Historique des Flux */}
                <div className="absolute top-8 left-8 right-8 z-20 flex gap-2 overflow-x-auto no-scrollbar py-2">
                    <div className="h-10 w-10 shrink-0 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10 backdrop-blur-md">
                        <History className="h-4 w-4 opacity-40" />
                    </div>
                    {history.map((h, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ scale: 0, x: -20 }} 
                            animate={{ scale: 1, x: 0 }} 
                            className={cn(
                                "px-5 py-2 shrink-0 rounded-2xl text-[11px] font-black tabular-nums border backdrop-blur-md transition-all",
                                h >= 10 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                                h >= 2 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                'bg-primary/5 text-primary/60 border-primary/10'
                            )}
                        >
                            {h.toFixed(2)}x
                        </motion.div>
                    ))}
                </div>

                <div className="absolute inset-0 z-0">
                    <JetCanvasAnimation multiplier={multiplier} gameState={gameState} />
                </div>

                {/* Multiplicateur Central */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <AnimatePresence mode="wait">
                        {gameState === 'waiting' || gameState === 'betting' ? (
                            <motion.div 
                                key="waiting"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="text-center space-y-6"
                            >
                                <div className="relative inline-block">
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-[-20px] border border-dashed border-primary/20 rounded-full" />
                                    <p className="text-sm font-black uppercase tracking-[0.6em] text-primary/60 animate-pulse">
                                        {gameState === 'waiting' ? "Attente du Flux" : "Phase de Mise"}
                                    </p>
                                </div>
                                {gameState === 'betting' && (
                                    <motion.div initial={{ width: 0 }} animate={{ width: 240 }} className="h-1 bg-primary/10 rounded-full overflow-hidden mx-auto">
                                        <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-primary" />
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="multiplier"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={cn(
                                    "flex flex-col items-center justify-center transition-colors duration-500",
                                    gameState === 'crashed' ? "text-red-500" : 
                                    multiplier > 10 ? "text-purple-400" : 
                                    multiplier > 2 ? "text-green-400" : "text-white"
                                )}
                            >
                                <motion.span 
                                    style={{ textShadow: gameState === 'crashed' ? '0 0 40px rgba(239, 68, 68, 0.5)' : '0 0 60px currentColor' }}
                                    className="text-8xl sm:text-9xl font-black italic tracking-tighter tabular-nums"
                                >
                                    {multiplier.toFixed(2)}x
                                </motion.span>
                                {gameState === 'crashed' && (
                                    <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-xl font-black uppercase tracking-[0.4em] opacity-60">STASE</motion.p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BetPanel 
                    id={1} 
                    balance={profile?.totalPoints || 0} 
                    gameState={gameState} 
                    betData={bet1Data} 
                    onBet={handleBet} 
                    onCancel={handleCancel} 
                    onCashout={handleCashout} 
                    onUpdate={handleUpdateBet} 
                    multiplier={multiplier} 
                    isProcessing={isProcessing} 
                />
                <BetPanel 
                    id={2} 
                    balance={profile?.totalPoints || 0} 
                    gameState={gameState} 
                    betData={bet2Data} 
                    onBet={handleBet} 
                    onCancel={handleCancel} 
                    onCashout={handleCashout} 
                    onUpdate={handleUpdateBet} 
                    multiplier={multiplier} 
                    isProcessing={isProcessing} 
                />
            </div>

            <div className="lg:hidden">
                 <Card className="bg-card/10 backdrop-blur-3xl border-none rounded-[2.5rem] p-6 h-80 flex flex-col border border-primary/5 shadow-2xl">
                    <ChatPanel messages={chatMessages} profile={profile} chatInput={chatInput} setChatInput={setChatInput} handleSendMessage={handleSendMessage} chatEndRef={chatEndRef} />
                 </Card>
            </div>
        </div>

        {/* Sidebar Droite: Chat */}
        <aside className="hidden lg:flex flex-col bg-card/10 backdrop-blur-3xl rounded-[3rem] border border-primary/5 p-8 space-y-8 overflow-hidden shadow-2xl">
           <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-3 w-3 text-primary opacity-40" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Flux Universel</p>
                </div>
                <h3 className="text-2xl font-black italic tracking-tighter">Le Grand Chat</h3>
           </div>
           <div className="flex-1 overflow-hidden">
                <ChatPanel messages={chatMessages} profile={profile} chatInput={chatInput} setChatInput={setChatInput} handleSendMessage={handleSendMessage} chatEndRef={chatEndRef} />
           </div>
        </aside>
      </div>
    </div>
  );
}

function PlayerList({ players, profile }: { players: SimulatedPlayer[], profile: any }) {
  return (
    <div className="space-y-2">
      {players.map((p) => {
        const isMe = p.id === 'user-1' || p.id === 'user-2';
        return (
            <motion.div 
                key={p.id} 
                layout
                className={cn(
                    "flex items-center justify-between p-4 rounded-2xl text-[11px] font-bold transition-all duration-500", 
                    p.status === 'waiting' ? 'opacity-20 grayscale' : 'bg-primary/5 border border-primary/5',
                    isMe && 'ring-1 ring-primary/30 bg-primary/10 shadow-lg'
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center text-[10px] font-black border border-primary/10 relative overflow-hidden">
                        {p.name === profile?.username ? <EmojiOracle text="🧘" forceStatic /> : <span className="opacity-40">{p.avatar}</span>}
                    </div>
                    <span className="truncate w-24">@{p.name}</span>
                </div>
                <div className="text-right">
                    {p.status === 'cashed_out' ? (
                        <div className="flex flex-col items-end">
                            <span className="text-green-400 font-black">+{Math.floor(p.bet * (p.cashoutMultiplier || 0))}</span>
                            <span className="text-[8px] opacity-40 font-black">@{p.cashoutMultiplier?.toFixed(2)}x</span>
                        </div>
                    ) : p.status === 'lost' ? (
                        <span className="text-red-500/40 line-through">-{p.bet}</span>
                    ) : p.status === 'betting' ? (
                        <div className="flex items-center gap-1 text-primary">
                            <Flame className="h-3 w-3 animate-pulse" />
                            <span className="tabular-nums">{p.bet}</span>
                        </div>
                    ) : <span className="opacity-20">Attente</span>}
                </div>
            </motion.div>
        );
      })}
    </div>
  );
}

function ChatPanel({ messages, profile, chatInput, setChatInput, handleSendMessage, chatEndRef }: any) {
  return (
    <div className="flex flex-col h-full">
        <div className="flex-1 space-y-5 overflow-y-auto no-scrollbar pr-2">
            {messages.map((msg: any) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={msg.id} className="flex gap-4 items-start group">
                    <div className="h-9 w-9 shrink-0 rounded-[1rem] bg-primary/5 flex items-center justify-center text-[10px] font-black border border-primary/10 shadow-inner">
                      {msg.user.slice(0,1)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40" style={{color: msg.isUser ? 'hsl(var(--primary))' : msg.color}}>{msg.user}</span>
                        <p className="text-xs font-bold leading-relaxed opacity-80 mt-1"><EmojiOracle text={msg.text} /></p>
                    </div>
                </motion.div>
            ))}
            <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="mt-6 flex gap-2">
            <div className="relative flex-1">
                <Input 
                    placeholder="Invoquer un message..." 
                    className="bg-primary/5 border-none rounded-2xl h-14 text-sm font-bold pl-6 pr-4 focus-visible:ring-1 focus-visible:ring-primary/20" 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                />
            </div>
            <Button type="submit" size="icon" className="rounded-2xl h-14 w-14 shrink-0 shadow-2xl shadow-primary/20">
                <Send size={20}/>
            </Button>
        </form>
    </div>
  );
}
