
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
  Globe,
  ShoppingCart,
  ArrowUpRight,
  Edit3
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import { getDailyMatches } from "@/app/actions/sport";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Image from "next/image";

interface BetPlacement {
  matchId: string;
  matchName: string;
  outcome: "1" | "X" | "2";
  outcomeLabel: string;
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
  const [betToPlace, setBetToPlace] = useState<BetPlacement | null>(null);
  const [betAmount, setBetInput] = useState("100");
  const [isProcessing, setIsProcessing] = useState(false);

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
              const matchRef = doc(db, "matches", match.fixture.id.toString());
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
    return query(collection(db, "bets"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(15));
  }, [db, user?.uid]);
  const { data: userBets } = useCollection(betsQuery);

  const currentStake = Math.max(5, parseInt(betAmount) || 0);
  const potentialWin = betToPlace ? Math.floor(currentStake * betToPlace.odd) : 0;

  const handleOpenBetDialog = (match: any, outcome: "1" | "X" | "2") => {
    haptic.light();
    const odd = parseFloat(match.odds[outcome]);
    const outcomeLabel = outcome === "1" ? match.teams.home.name : outcome === "X" ? "Nul" : match.teams.away.name;
    
    setBetToPlace({
      matchId: match.fixture.id.toString(),
      matchName: `${match.teams.home.name} vs ${match.teams.away.name}`,
      outcome,
      outcomeLabel,
      odd
    });
  };

  const handlePlaceBet = async () => {
    if (!userDocRef || !profile || !betToPlace || isProcessing) return;

    if (currentStake > (profile.totalPoints || 0)) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante", description: "Engagez moins de points pour valider ce pari." });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    const betData = {
      userId: user?.uid,
      username: profile.username,
      selections: [{ 
        matchId: betToPlace.matchId, 
        matchName: betToPlace.matchName, 
        outcome: betToPlace.outcome, 
        odd: betToPlace.odd 
      }],
      stake: currentStake,
      totalOdds: betToPlace.odd,
      potentialWin,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-currentStake),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db!, "bets"), betData);

      haptic.success();
      toast({ title: "Pacte Scellé !", description: `Votre intuition sur ${betToPlace.matchName} a été enregistrée.` });
      setBetToPlace(null);
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
            <span className="text-xs font-black tabular-nums">{profile?.totalPoints?.toLocaleString() || 0} PTS</span>
          </div>
        </div>
        <div className="w-10 h-10" />
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
                <Card key={match.fixture.id} className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-primary/5 shadow-xl transition-all hover:bg-card/60">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border",
                          match.isReal ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-primary/5 text-primary/40 border-primary/5"
                        )}>
                          {match.isReal ? "Cotes API" : "Cotes Oracle"}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{match.league.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-40">
                        <Clock className="h-2.5 w-2.5" />
                        <span className="text-[8px] font-black uppercase">{match.displayTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-center">
                      <div className="flex-1 space-y-2">
                        <div className="relative h-12 w-12 bg-primary/5 rounded-xl mx-auto flex items-center justify-center overflow-hidden border border-primary/5 shadow-inner">
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
                        <div className="relative h-12 w-12 bg-primary/5 rounded-xl mx-auto flex items-center justify-center overflow-hidden border border-primary/5 shadow-inner">
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
                        const odd = parseFloat(match.odds[outcome as keyof typeof match.odds]);
                        return (
                          <button
                            key={outcome}
                            onClick={() => handleOpenBetDialog(match, outcome as any)}
                            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-transparent bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:shadow-xl transition-all duration-300 active:scale-95 group"
                          >
                            <span className="text-[8px] font-black uppercase opacity-40 mb-1 group-hover:text-primary-foreground/60">{outcome === "1" ? "Dom" : outcome === "X" ? "Nul" : "Ext"}</span>
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
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Pari Simple</p>
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
                        <div className="flex flex-col">
                          <p className="text-[9px] font-bold opacity-60 truncate w-40">{sel.matchName}</p>
                          <p className="text-[10px] font-black text-primary uppercase">Flux: {sel.outcome === '1' ? 'Domicile' : sel.outcome === 'X' ? 'Nul' : 'Extérieur'}</p>
                        </div>
                        <p className="text-lg font-black text-primary">@{parseFloat(sel.odd).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-[10px] font-black uppercase opacity-30">Gain Potentiel</p>
                    <p className="text-xl font-black text-primary tabular-nums">+{bet.potentialWin} <span className="text-[10px] opacity-40">PTS</span></p>
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

      {/* Portail de Mise Instantané */}
      <Dialog open={!!betToPlace} onOpenChange={(open) => !open && setBetToPlace(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-[45px] border-primary/10 rounded-[3rem] p-8 shadow-2xl overflow-hidden">
          {betToPlace && (
            <div className="space-y-8">
              <DialogHeader>
                <div className="space-y-1 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Scellage de l'Intuition</p>
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase italic">{betToPlace.matchName}</DialogTitle>
                </div>
              </DialogHeader>

              <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/5 flex items-center justify-between relative overflow-hidden group">
                <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 skew-x-12 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">Votre Prédiction</p>
                  <p className="font-black text-lg text-primary truncate uppercase">{betToPlace.outcomeLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">Cote du Flux</p>
                  <p className="text-3xl font-black tabular-nums italic">x{betToPlace.odd.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Offrande de Lumière</Label>
                  <span className="text-[9px] font-black uppercase opacity-20">Dispo: {profile?.totalPoints?.toLocaleString()} PTS</span>
                </div>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={betAmount} 
                    onChange={(e) => setBetInput(e.target.value)} 
                    className="h-20 text-4xl font-black text-center rounded-[2rem] bg-primary/5 border-none shadow-inner"
                    autoFocus
                  />
                  <Edit3 className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 opacity-20" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-background/50 rounded-[2rem] border border-primary/5 text-center shadow-inner">
                  <p className="text-[9px] font-black uppercase opacity-30 mb-1">Gain Estimé</p>
                  <p className="text-2xl font-black tabular-nums">+{potentialWin} <span className="text-[10px] opacity-30">PTS</span></p>
                </div>
                <div className="p-5 bg-background/50 rounded-[2rem] border border-primary/5 text-center shadow-inner">
                  <p className="text-[9px] font-black uppercase opacity-30 mb-1">Solde Après</p>
                  <p className="text-2xl font-black tabular-nums text-muted-foreground">{(profile?.totalPoints || 0) - currentStake}</p>
                </div>
              </div>

              <DialogFooter className="pt-2 flex flex-col gap-3">
                <Button 
                  onClick={handlePlaceBet}
                  disabled={isProcessing || currentStake > (profile?.totalPoints || 0) || currentStake < 5}
                  className="w-full h-20 rounded-[2.2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 bg-primary text-primary-foreground gap-4 active:scale-95 transition-all"
                >
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <>
                      <ShieldCheck className="h-6 w-6" />
                      Invoquer le Pari
                    </>
                  )}
                </Button>
                <button 
                  onClick={() => setBetToPlace(null)}
                  className="w-full py-2 text-[9px] font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-100 transition-opacity"
                >
                  Refermer le Portail
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="p-10 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden mt-8 max-w-lg mx-auto w-full">
        <p className="text-[11px] leading-relaxed font-medium opacity-40 italic">
          "Les cotes réelles sont les murmures de la réalité. Écoutez le monde, prédisez le flux, récoltez la Lumière."
        </p>
      </div>
    </div>
  );
}
