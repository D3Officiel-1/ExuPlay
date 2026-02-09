
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  increment, 
  serverTimestamp, 
  query, 
  where, 
  orderBy,
  limit
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  Zap, 
  Loader2, 
  Trophy, 
  Clock, 
  Plus, 
  X, 
  CheckCircle2, 
  ShieldCheck,
  TrendingUp,
  History,
  Ticket,
  ChevronRight,
  AlertCircle,
  Dices,
  RefreshCw,
  Globe
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import { getDailyMatches } from "@/app/actions/sport";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Image from "next/image";

interface SelectedBet {
  matchId: string;
  matchName: string;
  outcome: "1" | "X" | "2";
  odd: number;
}

export default function SportPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setTab] = useState("matches");
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [selectedBets, setSelectedBets] = useState<SelectedBet[]>([]);
  const [betInput, setBetInput] = useState("100");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  useEffect(() => {
    async function loadAndSync() {
      setIsLoadingMatches(true);
      try {
        const data = await getDailyMatches();
        if (data && data.length > 0) {
          setMatches(data);
          
          if (db) {
            data.forEach((match: any) => {
              // L'ID unique de l'API est utilisé comme ancre Firestore
              const matchRef = doc(db, "matches", match.fixture.id.toString());
              
              // On enregistre l'objet COMPLET tel que demandé
              setDoc(matchRef, {
                ...match,
                updatedAt: serverTimestamp()
              }, { merge: true })
              .catch(async (error) => {
                const permissionError = new FirestorePermissionError({
                  path: matchRef.path,
                  operation: 'write',
                  requestResourceData: match,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
              });
            });
          }
        }
      } catch (e) {
        console.error("Dissonance lors de la synchronisation des arènes");
      } finally {
        setIsLoadingMatches(false);
      }
    }
    loadAndSync();
  }, [db]);

  const betsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "bets"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(10));
  }, [db, user?.uid]);
  const { data: userBets } = useCollection(betsQuery);

  const currentBetAmount = Math.max(5, parseInt(betInput) || 0);
  const totalOdds = useMemo(() => selectedBets.reduce((acc, b) => acc * b.odd, 1), [selectedBets]);
  const potentialWin = Math.floor(currentBetAmount * totalOdds);

  const toggleBet = (match: any, outcome: "1" | "X" | "2") => {
    haptic.light();
    const odd = parseFloat(match.odds[outcome]);
    const matchName = `${match.teams.home.name} vs ${match.teams.away.name}`;
    const mId = match.fixture.id.toString();
    
    setSelectedBets(prev => {
      const exists = prev.find(b => b.matchId === mId);
      if (exists) {
        if (exists.outcome === outcome) {
          return prev.filter(b => b.matchId !== mId);
        }
        return prev.map(b => b.matchId === mId ? { ...b, outcome, odd } : b);
      }
      return [...prev, { matchId: mId, matchName, outcome, odd }];
    });
    
    if (!showCoupon && selectedBets.length === 0) setShowCoupon(true);
  };

  const handlePlaceBet = async () => {
    if (!userDocRef || !profile || selectedBets.length === 0 || isProcessing) return;

    if (currentBetAmount > (profile.totalPoints || 0)) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante", description: "Accumulez plus de points pour valider ce coupon." });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    const betData = {
      userId: user?.uid,
      username: profile.username,
      selections: selectedBets,
      stake: currentBetAmount,
      totalOdds: parseFloat(totalOdds.toFixed(2)),
      potentialWin,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-currentBetAmount),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db!, "bets"), betData);

      haptic.success();
      setSelectedBets([]);
      setShowCoupon(false);
      toast({ title: "Coupon Scellé !", description: "Votre intuition a été enregistrée dans les annales." });
      setTab("history");
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance Système" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Arènes Sportives</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/5 rounded-full border border-primary/5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{profile?.totalPoints?.toLocaleString()} PTS</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowCoupon(true)} className="rounded-full bg-primary/5 relative">
          <Ticket className="h-5 w-5 text-primary" />
          {selectedBets.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[8px] font-black border border-background">
              {selectedBets.length}
            </span>
          )}
        </Button>
      </header>

      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 bg-primary/5 p-1 h-12 rounded-2xl mb-8">
            <TabsTrigger value="matches" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> Événements
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
              <History className="h-3.5 w-3.5" /> Mes Paris
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6 m-0">
            {isLoadingMatches ? (
              <div className="py-32 flex flex-col items-center justify-center gap-6 text-center">
                <div className="relative">
                  <RefreshCw className="h-12 w-12 text-primary animate-spin opacity-20" />
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Interrogation des Arènes Mondiales...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="py-32 text-center space-y-4 opacity-20">
                <AlertCircle className="h-16 w-16 mx-auto" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Silence dans les stades</p>
                <p className="text-[10px] font-medium px-12">Aucun flux sportif n'a été détecté pour cette période.</p>
              </div>
            ) : (
              matches.map((match) => (
                <Card key={match.fixture.id} className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-primary/5 shadow-xl">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <div className="flex items-center gap-2 opacity-40">
                        <Globe className="h-2.5 w-2.5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">{match.league.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-40">
                        <Clock className="h-2.5 w-2.5" />
                        <span className="text-[8px] font-black uppercase">{match.displayTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-center">
                      <div className="flex-1 space-y-2">
                        <div className="relative h-12 w-12 bg-primary/5 rounded-xl mx-auto flex items-center justify-center overflow-hidden">
                          {match.teams.home.logo ? (
                            <Image src={match.teams.home.logo} alt="" fill className="object-contain p-2" />
                          ) : (
                            <EmojiOracle text="⚽" forceStatic />
                          )}
                        </div>
                        <p className="text-[10px] font-black uppercase leading-tight h-8 line-clamp-2">{match.teams.home.name}</p>
                      </div>
                      <div className="text-[10px] font-black opacity-20 italic">VS</div>
                      <div className="flex-1 space-y-2">
                        <div className="relative h-12 w-12 bg-primary/5 rounded-xl mx-auto flex items-center justify-center overflow-hidden">
                          {match.teams.away.logo ? (
                            <Image src={match.teams.away.logo} alt="" fill className="object-contain p-2" />
                          ) : (
                            <EmojiOracle text="⚽" forceStatic />
                          )}
                        </div>
                        <p className="text-[10px] font-black uppercase leading-tight h-8 line-clamp-2">{match.teams.away.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {["1", "X", "2"].map((outcome) => {
                        const isSelected = selectedBets.some(b => b.matchId === match.fixture.id.toString() && b.outcome === outcome);
                        const odd = parseFloat(match.odds[outcome as keyof typeof match.odds]);
                        return (
                          <button
                            key={outcome}
                            onClick={() => toggleBet(match, outcome as any)}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300",
                              isSelected 
                                ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                                : "bg-primary/5 border-transparent hover:border-primary/10"
                            )}
                          >
                            <span className="text-[8px] font-black uppercase opacity-40 mb-1">{outcome === "1" ? "Dom" : outcome === "X" ? "Nul" : "Ext"}</span>
                            <span className="text-sm font-black tabular-nums">{odd.toFixed(2)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 m-0">
            {userBets && userBets.length > 0 ? (
              userBets.map((bet) => (
                <Card key={bet.id} className="border-none bg-card/20 backdrop-blur-3xl rounded-[2rem] p-5 border border-primary/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-3 w-3 text-primary opacity-40" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Combiné x{bet.selections.length}</p>
                      </div>
                      <p className="text-sm font-black tabular-nums">{bet.stake} <span className="text-[10px] opacity-30">PTS</span></p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                      bet.status === "pending" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"
                    )}>
                      {bet.status === "pending" ? "En cours" : "Gagné"}
                    </div>
                  </div>
                  <div className="space-y-2 pb-4 border-b border-primary/5">
                    {bet.selections.map((sel: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <p className="text-[9px] font-bold opacity-60 truncate w-40">{sel.matchName}</p>
                        <p className="text-[9px] font-black text-primary">({sel.outcome}) @{parseFloat(sel.odd).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-[10px] font-black uppercase opacity-30">Gain Potentiel</p>
                    <p className="text-base font-black text-primary tabular-nums">+{bet.potentialWin} <span className="text-[10px] opacity-40">PTS</span></p>
                  </div>
                </Card>
              ))
            ) : (
              <div className="py-20 text-center opacity-20 space-y-4">
                <Ticket className="h-16 w-16 mx-auto" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Aucun coupon dans les archives</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AnimatePresence>
        {showCoupon && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCoupon(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-card/95 backdrop-blur-[45px] rounded-t-[3rem] border-t border-primary/10 shadow-[0_-20px_80px_rgba(0,0,0,0.4)] max-h-[85vh] flex flex-col"
            >
              <div className="p-8 space-y-8 overflow-y-auto no-scrollbar flex-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Mon Coupon</p>
                    <h3 className="text-2xl font-black italic tracking-tight">Le Pacte de Flux</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowCoupon(false)} className="rounded-full h-10 w-10 bg-primary/5">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {selectedBets.length > 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {selectedBets.map((bet) => (
                        <div key={bet.matchId} className="p-4 bg-primary/5 rounded-2xl border border-primary/5 flex items-center justify-between group">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[10px] font-black uppercase opacity-40 mb-1">{bet.matchName}</p>
                            <p className="font-bold text-sm">Résultat: <span className="text-primary font-black uppercase">{bet.outcome === "1" ? "Victoire Domicile" : bet.outcome === "X" ? "Match Nul" : "Victoire Extérieur"}</span></p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-black tabular-nums">@{bet.odd.toFixed(2)}</span>
                            <button onClick={() => setSelectedBets(prev => prev.filter(b => b.matchId !== bet.matchId))} className="text-destructive opacity-20 hover:opacity-100 transition-opacity">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-background border border-primary/5 rounded-[2rem] space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Cote Totale</p>
                        <p className="text-2xl font-black text-primary">x{totalOdds.toFixed(2)}</p>
                      </div>
                      <div className="p-5 bg-background border border-primary/5 rounded-[2rem] space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Gain Potentiel</p>
                        <p className="text-2xl font-black tabular-nums">{potentialWin.toLocaleString()} <span className="text-xs opacity-30">PTS</span></p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Mise de Lumière</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={betInput} 
                          onChange={(e) => setBetInput(e.target.value)} 
                          className="h-16 text-3xl font-black text-center rounded-[2.2rem] bg-primary/5 border-none shadow-inner"
                        />
                        <Zap className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-primary opacity-20" />
                      </div>
                    </div>

                    <Button 
                      onClick={handlePlaceBet}
                      disabled={isProcessing}
                      className="w-full h-20 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 gap-3"
                    >
                      {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                        <>
                          <ShieldCheck className="h-6 w-6" />
                          Sceller le Pari
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-6">
                    <div className="h-20 w-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto">
                      <Dices className="h-10 w-10 text-primary opacity-20" />
                    </div>
                    <p className="text-sm font-medium opacity-40 px-10 leading-relaxed italic">"Votre coupon est vierge. Sélectionnez des flux sportifs pour initier la transmutation."</p>
                    <Button onClick={() => setShowCoupon(false)} className="rounded-full px-8 h-12">Retour aux Arènes</Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="p-10 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden mt-8 max-w-lg mx-auto w-full">
        <p className="text-[11px] leading-relaxed font-medium opacity-40 italic">
          "Le sport est la danse physique du destin. Prédisez le rythme, récoltez la Lumière."
        </p>
      </div>
    </div>
  );
}
