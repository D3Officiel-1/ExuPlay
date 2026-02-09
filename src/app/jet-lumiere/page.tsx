
'use client';

import { useState, useEffect, useCallback, FC, useRef, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Minus, Plus, History, Send, Rocket, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import Image from 'next/image';
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from '@/lib/haptics';
import { EmojiOracle } from '@/components/EmojiOracle';

type GameState = 'IDLE' | 'WAITING' | 'BETTING' | 'IN_PROGRESS' | 'CRASHED';
type BetState = 'IDLE' | 'PENDING' | 'PLACED' | 'CASHED_OUT' | 'LOST';
type GameLevel = "Facile" | "Moyen" | "Difficile" | "Expert";
type PlayerStatus = 'waiting' | 'betting' | 'cashed_out' | 'lost';

interface BetPanelData {
  betState: BetState;
  betAmount: number;
  winAmount: number;
  isAutoBet: boolean;
  isAutoCashout: boolean;
  autoCashoutValue: number;
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
}

const BETTING_TIME = 8000; 

const generateCrashPoint = (): number => {
  const r = Math.random();
  if (r < 0.6) return 1 + r * 2;       
  if (r < 0.9) return 2.2 + (r - 0.6) * 9.33; 
  return 5 + (r - 0.9) * 45; 
};

const generateRandomName = (): string => {
    const beginnings = ["Art", "S4a", "Bq", "Scar", "T10", "Khus", "Ид", "Sho", "Eno", "Mk", "Dee", "Ali", "Vik", "Pat", "Sсh"];
    const middles = ["ur", "sti", "CP", "pi", "Nb", "b", "m", "ck", "511", "pak", "sher", "toria", "i", "astliv"];
    const endings = ["", "ik", "ov", "er", "man", "88", "pro", "GG", "x7"];
    const beginning = beginnings[Math.floor(Math.random() * beginnings.length)];
    const middle = middles[Math.floor(Math.random() * middles.length)];
    const ending = endings[Math.floor(Math.random() * endings.length)];
    return `${beginning}${middle}${ending}`;
}

const generateFakePlayers = (count: number): SimulatedPlayer[] => {
    const players = [];
    for (let i = 0; i < count; i++) {
        const name = generateRandomName();
        players.push({
            id: i,
            name: `${name.slice(0, 5)}...`,
            avatar: name.slice(0, 2).toUpperCase(),
            bet: 0,
            status: 'waiting',
        });
    }
    return players;
};

const fakeMessages = [
    { text: "Let's goooo! 🚀", color: "#60a5fa" },
    { text: "Big win incoming! 💰", color: "#4ade80" },
    { text: "Suerte a todos! 🍀", color: "#4ade80" },
    { text: "Fly high! ✨", color: "#22d3ee" },
    { text: "Easy money! 😎", color: "#4ade80" }
];

const initialHistory = [2.10, 1.06, 2.76, 2.10, 2.12, 2.71, 18.73, 13.40, 5.58, 1.65, 4.25];

interface Particle {
  x: number; y: number; size: number; opacity: number; vx: number; vy: number; life: number; maxLife: number; color: [number, number, number];
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
            for (let i = 0; i < 150; i++) {
                starsRef.current.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.5 + 0.2 });
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
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "#0a0f1e");
        gradient.addColorStop(1, "#1a203c");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        starsRef.current.forEach(star => {
            star.y += 0.1 * deltaTime;
            if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
            ctx.globalAlpha = star.opacity;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        ctx.globalAlpha = 1;
        const visualMultiplier = Math.min(multiplier, 30);
        const progress = (visualMultiplier - 1) / (30 - 1);
        const curvePower = 0.6;
        const x = 50 + Math.pow(progress, curvePower) * (canvas.width - 150);
        const y = canvas.height - 50 - Math.pow(progress, curvePower) * (canvas.height - 100);
        particlesRef.current = particlesRef.current.map(p => {
            p.life -= deltaTime; p.x += p.vx * deltaTime; p.y += p.vy * deltaTime;
            p.opacity = (p.life / p.maxLife) * 0.8;
            return p;
        }).filter(p => p.life > 0);
        if (gameState === 'IN_PROGRESS') {
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                const life = Math.random() * 60 + 30;
                particlesRef.current.push({
                    x: x, y: y, size: Math.random() * 3 + 1, opacity: 1,
                    vx: Math.cos(angle) * speed * (Math.random() - 0.5) * 2,
                    vy: Math.sin(angle) * speed * (Math.random() - 0.5) * 2 - 1,
                    life: life, maxLife: life, color: Math.random() > 0.5 ? [255, 100, 255] : [0, 255, 255]
                });
            }
        }
        ctx.globalCompositeOperation = 'lighter';
        particlesRef.current.forEach(p => {
            const [r, g, b] = p.color; ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
        if (gameState === 'IN_PROGRESS') {
            const coreSize = 8 + Math.sin(time / 150) * 2;
            const glowSize = coreSize * 3;
            const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, coreSize);
            coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            coreGradient.addColorStop(0.8, 'rgba(0, 255, 255, 1)');
            coreGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = coreGradient; ctx.beginPath(); ctx.arc(x, y, coreSize, 0, Math.PI * 2); ctx.fill();
            const glowGradient = ctx.createRadialGradient(x, y, coreSize, x, y, glowSize);
            glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
            glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = glowGradient; ctx.beginPath(); ctx.arc(x, y, glowSize, 0, Math.PI * 2); ctx.fill();
        }
        animationFrameId.current = requestAnimationFrame(draw);
    }, [multiplier, gameState]);

    useEffect(() => {
        animationFrameId.current = requestAnimationFrame(draw);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [draw]);

    return <canvas ref={canvasRef} width={800} height={400} className="absolute inset-0 w-full h-full" />;
};

const BetPanel: FC<BetPanelProps> = ({ id, balance, gameState, betData, onBet, onCancel, onCashout, onUpdate, multiplier }) => {
  const { betState, betAmount, autoCashoutValue, isAutoBet, isAutoCashout } = betData;
  const { toast } = useToast();

  const handleBetClick = () => {
    if (gameState !== 'BETTING' || betState !== 'IDLE') return;
    if (betAmount > balance) { toast({ variant: 'destructive', title: 'Solde insuffisant' }); return; }
    onBet(id, betAmount);
  };
  
  const handleCancelClick = () => { if ((gameState === 'BETTING' || gameState === 'WAITING') && betState === 'PENDING') onCancel(id); };

  const handleCashoutClick = () => { if (gameState === 'IN_PROGRESS' && betState === 'PLACED') onCashout(id); }

  const getButtonContent = () => {
    switch(betState) {
        case 'PENDING': return `ANNULER`;
        case 'PLACED': return `RETIRER ${(betAmount * multiplier).toLocaleString('fr-FR', {maximumFractionDigits: 0})} F`;
        case 'CASHED_OUT': return 'GAGNÉ';
        case 'LOST': return 'PERDU';
        default: return 'PARI';
    }
  };

  const getButtonClass = () => {
      switch(betState) {
        case 'PENDING': return 'bg-gray-500 hover:bg-gray-600';
        case 'PLACED': return 'bg-red-600 hover:bg-red-700';
        case 'CASHED_OUT': return 'bg-green-500 hover:bg-green-500 cursor-not-allowed';
        case 'LOST': return 'bg-gray-700 hover:bg-gray-700 cursor-not-allowed';
        default: return 'bg-purple-600 hover:bg-purple-700';
      }
  }

  const mainButtonClick = () => {
      if(betState === 'IDLE') handleBetClick();
      else if(betState === 'PENDING') handleCancelClick();
      else if(betState === 'PLACED') handleCashoutClick();
  }
  
  const quickSetBet = (amount: number) => onUpdate(id, { betAmount: amount });

  const isIdle = betState === 'IDLE';

  return (
    <div className="bg-[#242c48] rounded-2xl p-4 md:p-6 space-y-4 text-white shadow-xl">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise</Label>
            <div className="relative">
                <Input type="number" value={betAmount} onChange={e => onUpdate(id, { betAmount: Number(e.target.value) })} className="bg-[#10142a] border-primary/10 rounded-xl text-center font-bold h-12" disabled={!isIdle} />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <button onClick={() => onUpdate(id, { betAmount: betAmount + 10 })} disabled={!isIdle} className="px-2 text-primary opacity-40 hover:opacity-100"><Plus size={14} /></button>
                <button onClick={() => onUpdate(id, { betAmount: Math.max(10, betAmount - 10) })} disabled={!isIdle} className="px-2 text-primary opacity-40 hover:opacity-100"><Minus size={14} /></button>
                </div>
            </div>
            </div>
            <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Auto.</Label>
            <div className="relative">
                <Input type="number" step="0.1" value={autoCashoutValue} onChange={e => onUpdate(id, { autoCashoutValue: Number(e.target.value) })} className="bg-[#10142a] border-primary/10 rounded-xl text-center font-bold h-12" disabled={!isIdle} />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <button onClick={() => onUpdate(id, { autoCashoutValue: autoCashoutValue + 0.1 })} disabled={!isIdle} className="px-2 text-primary opacity-40 hover:opacity-100"><Plus size={14} /></button>
                <button onClick={() => onUpdate(id, { autoCashoutValue: Math.max(1.01, autoCashoutValue - 0.1) })} disabled={!isIdle} className="px-2 text-primary opacity-40 hover:opacity-100"><Minus size={14} /></button>
                </div>
            </div>
            </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
            {[50, 100, 200, 500].map(val => (
            <Button key={val} size="sm" className="bg-[#303a5c] hover:bg-[#414e7a] text-[10px] font-black rounded-lg h-8" onClick={() => quickSetBet(val)} disabled={!isIdle}>+{val}</Button>
            ))}
        </div>
        <div className="flex items-center justify-around gap-4 pt-1">
            <div className="flex items-center gap-2">
                <Switch checked={betData.isAutoBet} onCheckedChange={(checked) => onUpdate(id, { isAutoBet: checked })} />
                <Label className="text-[10px] font-black uppercase opacity-40">Auto Pari</Label>
            </div>
            <div className="flex items-center gap-2">
                <Switch checked={betData.isAutoCashout} onCheckedChange={(checked) => onUpdate(id, { isAutoCashout: checked })} />
                <Label className="text-[10px] font-black uppercase opacity-40">Auto Retrait</Label>
            </div>
        </div>
        <Button className={cn("w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all", getButtonClass())} onClick={mainButtonClick} disabled={(betState === 'IDLE' && gameState !== 'BETTING') || betState === 'CASHED_OUT' || betState === 'LOST'}>{getButtonContent()}</Button>
    </div>
  );
};

const MultiplierDisplay: FC<{ multiplier: number; gameState: GameState; crashPoint: number }> = ({ multiplier, gameState, crashPoint }) => {
    let colorClass = "text-white";
    let content;
    if (gameState === 'CRASHED') { colorClass = "text-red-500"; content = `STASE À ${crashPoint.toFixed(2)}x`; } 
    else if (multiplier > 10) { colorClass = "text-purple-400"; content = `${multiplier.toFixed(2)}x`; } 
    else if (multiplier > 2) { colorClass = "text-green-400"; content = `${multiplier.toFixed(2)}x`; } 
    else { content = `${multiplier.toFixed(2)}x`; }

    if (gameState === 'WAITING' || gameState === 'IDLE') {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Attente du Flux</p>
                <div className="h-1 w-20 bg-primary/10 rounded-full mt-4 overflow-hidden relative">
                    <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-primary/40" />
                </div>
            </div>
        );
    }
    
    if (gameState === 'BETTING') {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <p className="text-xl font-black uppercase tracking-widest text-white/50 italic">Invoquez vos mises !</p>
            </div>
        );
    }

    return (
        <div className={cn("absolute inset-0 flex items-center justify-center font-black transition-colors duration-300 z-10", colorClass)}
             style={{
                fontSize: gameState === 'CRASHED' ? 'clamp(1.5rem, 8vw, 3rem)' : 'clamp(3rem, 15vw, 7rem)',
                textShadow: `0 0 40px ${colorClass === 'text-white' ? 'rgba(255,255,255,0.2)' : 'currentColor'}`
            }}
        >
            {content}
        </div>
    );
};

export default function SimulationPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<number[]>(initialHistory);
  const [gameLevel, setGameLevel] = useState<GameLevel | null>(null);
  const [isLevelSelectorOpen, setIsLevelSelectorOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const [bet1Data, setBet1Data] = useState<BetPanelData>({ betState: 'IDLE', betAmount: 100, winAmount: 0, isAutoBet: false, isAutoCashout: false, autoCashoutValue: 2.00 });
  const [bet2Data, setBet2Data] = useState<BetPanelData>({ betState: 'IDLE', betAmount: 100, winAmount: 0, isAutoBet: false, isAutoCashout: false, autoCashoutValue: 2.00 });
  
  const [simulatedPlayers, setSimulatedPlayers] = useState<SimulatedPlayer[]>([]);
  const [totalBetsCount, setTotalBetsCount] = useState(0);
  const [totalBetAmount, setTotalBetAmount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bet1DataRef = useRef(bet1Data);
  const bet2DataRef = useRef(bet2Data);
  useEffect(() => { bet1DataRef.current = bet1Data; }, [bet1Data]);
  useEffect(() => { bet2DataRef.current = bet2Data; }, [bet2Data]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    useEffect(() => {
        const chatInterval = setInterval(() => {
            const randomMessage = fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
            const randomName = generateRandomName();
            const newMessage: ChatMessage = { id: `${Date.now()}-${Math.random()}`, user: randomName, ...randomMessage };
            setChatMessages(prev => [...prev.slice(-10), newMessage]);
        }, Math.random() * 5000 + 3000);
        return () => clearInterval(chatInterval);
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim() === '' || !profile) return;
        const newMessage: ChatMessage = { id: `${Date.now()}-${Math.random()}`, user: profile.username, text: chatInput, color: '#f472b6', isUser: true };
        setChatMessages(prev => [...prev.slice(-10), newMessage]); setChatInput('');
    };

  const handleBet = useCallback((id: number, amount: number) => {
    const betSetter = id === 1 ? setBet1Data : setBet2Data;
    setBalance(bal => {
      if (amount > bal) { toast({ variant: 'destructive', title: 'Solde insuffisant' }); return bal; }
      betSetter(prev => ({ ...prev, betState: 'PENDING', betAmount: amount, winAmount: 0 }));
      if (profile?.username) {
        setSimulatedPlayers(players => {
            const userPlayer: SimulatedPlayer = { id: `user-${id}`, name: profile.username, avatar: profile.username.slice(0, 2).toUpperCase(), bet: amount, status: 'betting' };
            return [userPlayer, ...players.filter(p => p.id !== `user-${id}`)];
        });
      }
      return bal - amount;
    });
  }, [toast, profile]);

  const handleCancel = useCallback((id: number) => {
      const betSetter = id === 1 ? setBet1Data : setBet2Data;
      betSetter(prev => { setBalance(bal => bal + prev.betAmount); setSimulatedPlayers(players => players.filter(p => p.id !== `user-${id}`)); return { ...prev, betState: 'IDLE' }; });
  }, []);

  const handleCashout = useCallback((id: number, cashoutMultiplier?: number) => {
      const betRef = id === 1 ? bet1DataRef : bet2DataRef;
      const betSetter = id === 1 ? setBet1Data : setBet2Data;
      if (betRef.current.betState !== 'PLACED') return;
      const finalMultiplier = cashoutMultiplier || multiplier;
      const winAmount = betRef.current.betAmount * finalMultiplier;
      setBalance(bal => bal + winAmount);
      haptic.success();
      toast({ title: "Flux Récupéré !", description: `+${winAmount.toLocaleString('fr-FR')} PTS à x${finalMultiplier.toFixed(2)}` });
      betSetter(prev => ({ ...prev, betState: 'CASHED_OUT', winAmount }));
  }, [multiplier, toast]);
  
  const handleUpdateBet = useCallback((id: number, data: Partial<BetPanelData>) => {
      const betSetter = id === 1 ? setBet1Data : setBet2Data;
      betSetter(prev => ({...prev, ...data}));
  }, []);

  useEffect(() => {
    const updatePlayerFromBet = (betId: number, betData: BetPanelData) => {
        if (!profile?.username) return;
        const playerId = `user-${betId}`;
        setSimulatedPlayers(players => {
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex === -1) return players;
            const updatedPlayers = [...players];
            const player = updatedPlayers[playerIndex];
            if (betData.betState === 'CASHED_OUT') { player.status = 'cashed_out'; player.cashoutMultiplier = betData.winAmount / betData.betAmount; } 
            else if (betData.betState === 'LOST') { player.status = 'lost'; } 
            else if (betData.betState === 'PLACED') { player.status = 'betting'; player.bet = betData.betAmount; }
            return updatedPlayers;
        });
    };
    updatePlayerFromBet(1, bet1Data); updatePlayerFromBet(2, bet2Data);
  }, [bet1Data, bet2Data, profile]);

  const gameLoop = useCallback(() => {
    setGameState('WAITING'); setMultiplier(1.00); setSimulatedPlayers(generateFakePlayers(15)); setTotalBetsCount(0); setTotalBetAmount(0);
    if (bet1DataRef.current.isAutoBet && balance < bet1DataRef.current.betAmount) { setBet1Data(b => ({ ...b, isAutoBet: false })); }
    if (bet2DataRef.current.isAutoBet && balance < bet2DataRef.current.betAmount) { setBet2Data(b => ({ ...b, isAutoBet: false })); }
    const waitTimer = setTimeout(() => {
        setGameState('BETTING');
        let bettingInterval = setInterval(() => {
          setSimulatedPlayers(players => {
            const playersToBet = players.filter(p => p.status === 'waiting');
            if (playersToBet.length === 0) { clearInterval(bettingInterval); return players; }
            const playerToUpdate = playersToBet[Math.floor(Math.random() * playersToBet.length)];
            const betAmount = Math.floor(Math.random() * 500) + 10;
            setTotalBetsCount(c => c + 1); setTotalBetAmount(a => a + betAmount);
            return players.map(p => p.id === playerToUpdate.id ? { ...p, status: 'betting', bet: betAmount } : p);
          });
        }, 400);
        if (bet1DataRef.current.isAutoBet && balance >= bet1DataRef.current.betAmount) handleBet(1, bet1DataRef.current.betAmount);
        if (bet2DataRef.current.isAutoBet && balance >= bet2DataRef.current.betAmount) handleBet(2, bet2DataRef.current.betAmount);
        const bettingTimer = setTimeout(() => {
            clearInterval(bettingInterval);
            const newCrashPoint = generateCrashPoint(); setCrashPoint(newCrashPoint); setGameState('IN_PROGRESS');
            setBet1Data(b => b.betState === 'PENDING' ? { ...b, betState: 'PLACED' } : b);
            setBet2Data(b => b.betState === 'PENDING' ? { ...b, betState: 'PLACED' } : b);
            let currentMultiplier = 1.00;
            const animate = () => {
                const baseSpeed = 0.015; const acceleration = 0.0001;
                currentMultiplier += baseSpeed + (acceleration * Math.pow(currentMultiplier, 2));
                setMultiplier(currentMultiplier);
                setSimulatedPlayers(players => players.map(p => {
                    if (p.status === 'betting' && typeof p.id === 'number' && Math.random() < 0.01) { setTotalBetsCount(c => c - 1); return { ...p, status: 'cashed_out', cashoutMultiplier: currentMultiplier }; }
                    return p;
                }));
                if (bet1DataRef.current.betState === 'PLACED' && bet1DataRef.current.isAutoCashout && currentMultiplier >= bet1DataRef.current.autoCashoutValue) handleCashout(1, bet1DataRef.current.autoCashoutValue);
                if (bet2DataRef.current.betState === 'PLACED' && bet2DataRef.current.isAutoCashout && currentMultiplier >= bet2DataRef.current.autoCashoutValue) handleCashout(2, bet2DataRef.current.autoCashoutValue);
                if (currentMultiplier >= newCrashPoint) {
                    setGameState('CRASHED'); setHistory(h => [newCrashPoint, ...h.slice(0, 14)]); haptic.error();
                    setBet1Data(b => b.betState === 'PLACED' ? {...b, betState: 'LOST'} : b);
                    setBet2Data(b => b.betState === 'PLACED' ? {...b, betState: 'LOST'} : b);
                    setSimulatedPlayers(players => players.map(p => p.status === 'betting' ? {...p, status: 'lost'} : p));
                    setTimeout(() => { setBet1Data(b => ({ ...b, betState: 'IDLE', winAmount: 0 })); setBet2Data(b => ({ ...b, betState: 'IDLE', winAmount: 0 })); gameLoop(); }, 4000);
                } else { requestAnimationFrame(animate); }
            };
            requestAnimationFrame(animate);
        }, BETTING_TIME);
    }, 5000);
    return () => clearTimeout(waitTimer);
  }, [handleBet, handleCashout, balance]);

  useEffect(() => { if (gameLevel !== null && gameState === 'IDLE') setTimeout(gameLoop, 1000); }, [gameLevel, gameState, gameLoop]);

  useEffect(() => {
    if (isLoading) {
        const textInterval = setInterval(() => { setLoadingTextIndex(prev => (prev < loadingTexts.length - 1 ? prev + 1 : prev)); }, 600);
        const readyTimer = setTimeout(() => setIsLoading(false), 3000);
        return () => { clearInterval(textInterval); clearTimeout(readyTimer); };
    }
  }, [isLoading]);

  const selectLevel = (level: GameLevel) => {
    setGameLevel(level);
    switch(level) {
        case 'Facile': setBalance(10000); break;
        case 'Moyen': setBalance(5000); break;
        case 'Difficile': setBalance(1000); break;
        case 'Expert': setBalance(500); break;
    }
    setIsLevelSelectorOpen(false);
  }

  if (isLoading || !user) {
    return (
       <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-8 text-center relative overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 8, repeat: Infinity }} className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full" />
        <div className="z-10 space-y-12">
          <div className="relative h-24 w-24 mx-auto">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-full" />
            <div className="absolute inset-4 flex items-center justify-center bg-card rounded-3xl shadow-2xl border border-primary/5">
              <Rocket className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.p key={loadingTextIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/60">{loadingTexts[loadingTextIndex]}</motion.p>
            </AnimatePresence>
            <div className="w-48 h-[2px] bg-primary/5 rounded-full mx-auto overflow-hidden">
              <motion.div initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ duration: 3, ease: "easeInOut" }} className="h-full bg-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <Dialog open={isLevelSelectorOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-3xl border-primary/10 text-white rounded-[2.5rem] p-8 max-w-sm sm:max-w-md">
            <DialogHeader className="text-center">
                <DialogTitle className="text-2xl font-black italic">Capacité de Flux</DialogTitle>
                <DialogDescription className="text-sm font-medium opacity-40">Déterminez l'intensité de votre point de départ.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-6">
                {[
                  { l: 'Facile', e: '😀', p: '10,000 PTS' },
                  { l: 'Moyen', e: '🙂', p: '5,000 PTS' },
                  { l: 'Difficile', e: '😎', p: '1,000 PTS' },
                  { l: 'Expert', e: '😈', p: '500 PTS' }
                ].map((item) => (
                  <Button key={item.l} variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-primary/5 border-primary/5 hover:bg-primary/10 rounded-[2rem] transition-all group" onClick={() => selectLevel(item.l as GameLevel)}>
                    <span className="text-2xl group-hover:scale-125 transition-transform">{item.e}</span>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase">{item.l}</p>
                      <p className="text-[8px] font-bold opacity-40">{item.p}</p>
                    </div>
                  </Button>
                ))}
            </div>
        </DialogContent>
    </Dialog>

    <div className="min-h-screen bg-background text-white flex flex-col pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Oracle du Flux</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/5 rounded-full border border-primary/5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{balance.toLocaleString()} PTS</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[280px_1fr_300px] pt-24 px-4 gap-6 max-w-7xl mx-auto w-full">
        <aside className="hidden lg:flex flex-col bg-card/20 backdrop-blur-2xl rounded-[2.5rem] border border-primary/5 p-6 space-y-6 overflow-hidden">
            <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Dimension Sociale</p><h3 className="text-xl font-black italic">Les Esprits</h3></div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2"><PlayerList simulatedPlayers={simulatedPlayers} profile={profile} /></div>
        </aside>

        <div className="flex flex-col gap-6">
            <main className="flex-1 min-h-[400px] relative bg-card/40 backdrop-blur-3xl rounded-[3.5rem] border border-primary/10 shadow-2xl overflow-hidden">
                <div className="absolute top-6 left-6 right-6 z-20 flex gap-2 overflow-x-auto no-scrollbar py-2">
                    <div className="h-10 w-10 shrink-0 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/5"><History size={16} className="opacity-40" /></div>
                    {history.map((h, i) => (
                        <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("px-4 py-2 shrink-0 rounded-xl text-xs font-black tabular-nums bg-background/40 backdrop-blur-md border border-primary/5", h >= 10 ? 'text-purple-400 border-purple-500/20' : h >= 2 ? 'text-green-400 border-green-500/20' : 'text-primary/60')}>
                            {h.toFixed(2)}x
                        </motion.div>
                    ))}
                </div>
                <div className="absolute inset-0 z-0"><JetCanvasAnimation multiplier={multiplier} gameState={gameState} /></div>
                <MultiplierDisplay multiplier={multiplier} gameState={gameState} crashPoint={crashPoint}/>
            </main>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BetPanel id={1} balance={balance} gameState={gameState} betData={bet1Data} onBet={handleBet} onCancel={handleCancel} onCashout={handleCashout} onUpdate={handleUpdateBet} multiplier={multiplier} />
                <BetPanel id={2} balance={balance} gameState={gameState} betData={bet2Data} onBet={handleBet} onCancel={handleCancel} onCashout={handleCashout} onUpdate={handleUpdateBet} multiplier={multiplier} />
            </div>
            <div className="lg:hidden space-y-6">
                 <Card className="bg-card/20 backdrop-blur-2xl border-none rounded-[2.5rem] p-6 h-80 flex flex-col">
                    <ChatPanel chatMessages={chatMessages} profile={profile} chatInput={chatInput} setChatInput={setChatInput} handleSendMessage={handleSendMessage} chatEndRef={chatEndRef} />
                 </Card>
            </div>
        </div>

        <aside className="hidden lg:flex flex-col bg-card/20 backdrop-blur-2xl rounded-[2.5rem] border border-primary/5 p-6 space-y-6 overflow-hidden">
           <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Flux Universel</p><h3 className="text-xl font-black italic">Le Grand Chat</h3></div>
           <div className="flex-1 overflow-hidden"><ChatPanel chatMessages={chatMessages} profile={profile} chatInput={chatInput} setChatInput={setChatInput} handleSendMessage={handleSendMessage} chatEndRef={chatEndRef} /></div>
        </aside>
      </div>
    </div>
    </>
  );
}

function PlayerList({ simulatedPlayers, profile }: { simulatedPlayers: SimulatedPlayer[], profile: any }) {
  return (
    <div className="space-y-2">
      {simulatedPlayers.map((player) => (
        <div key={player.id} className={cn(
          "flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all duration-500", 
          player.status === 'waiting' ? 'opacity-30 grayscale' : 'bg-primary/5 border border-primary/5',
          player.id === 'user-1' || player.id === 'user-2' ? 'ring-1 ring-primary shadow-lg bg-primary/10' : ''
        )}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center text-[10px] font-black border border-primary/10 overflow-hidden relative">
              {player.name === profile?.username ? <EmojiOracle text="🧘" forceStatic /> : <span className="opacity-40">{player.avatar}</span>}
            </div>
            <span className="truncate w-24">@{player.name}</span>
          </div>
          <div className="text-right">
            {player.status === 'cashed_out' ? (
              <div className="flex flex-col items-end">
                <span className="text-green-400 font-black">+{Math.floor(player.bet * (player.cashoutMultiplier || 0))}</span>
                <span className="text-[8px] opacity-40">@{player.cashoutMultiplier?.toFixed(2)}x</span>
              </div>
            ) : player.status === 'lost' ? (
              <span className="text-red-500/40 line-through">-{player.bet}</span>
            ) : player.status === 'betting' ? (
              <div className="flex items-center gap-1 text-primary"><Zap size={10} className="animate-pulse" /><span>{player.bet}</span></div>
            ) : <span className="opacity-20">Attente</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatPanel({ chatMessages, profile, chatInput, setChatInput, handleSendMessage, chatEndRef }: any) {
  return (
    <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1">
            {chatMessages.map((msg: any) => (
                <div key={msg.id} className="flex gap-3 items-start group">
                    <div className="h-8 w-8 shrink-0 rounded-xl bg-primary/5 flex items-center justify-center text-[10px] font-black border border-primary/10">
                      {msg.user.slice(0,1)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{color: msg.isUser ? 'hsl(var(--primary))' : msg.color}}>{msg.user}</span>
                        <p className="text-sm font-medium leading-relaxed opacity-80 mt-0.5"><EmojiOracle text={msg.text} /></p>
                    </div>
                </div>
            ))}
            <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="mt-6 flex gap-2">
            <Input placeholder="Diffusez votre pensée..." className="bg-primary/5 border-none rounded-2xl h-12 text-sm font-bold pl-6" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <Button type="submit" size="icon" className="rounded-2xl h-12 w-12 shrink-0 shadow-xl shadow-primary/10"><Send size={18}/></Button>
        </form>
    </div>
  );
}
