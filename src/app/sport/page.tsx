"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
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
  Clock, 
  History, 
  TrendingUp,
  Ticket,
  ChevronRight,
  Trash2,
  ShieldCheck,
  Globe,
  Trophy,
  Activity,
  X,
  Timer,
  BarChart3,
  ListOrdered,
  Users
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import { getDailyMatches, type GeneratedMatch } from "@/app/actions/sport";
import { format } from "date-fns";
import Image from "next/image";

interface BetSelection {
  matchId: string;
  matchName: string;
  outcome: string;
  outcomeLabel: string;
  odd: number;
}

export default function SportPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setTab] = useState("matches");
  const [matches, setMatches] = useState<GeneratedMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [betAmount, setBetInput] = useState("50");
  const [isProcessing, setIsProcessing] = useState(false);

  // Détails de match
  const [selectedMatch, setSelectedMatch] = useState<GeneratedMatch | null>(null);
  const [detailsTab, setDetailsTab] = useState("bet");

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const betsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "bets"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(15));
  }, [db, user?.uid]);
  const { data: userBets } = useCollection(betsQuery);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const daily = await getDailyMatches();
        setMatches(daily);
        // Mettre à jour le match sélectionné si ouvert
        if (selectedMatch) {
          const updated = daily.find(m => m.id === selectedMatch.id);
          if (updated) setSelectedMatch(updated);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingMatches(false);
      }
    };
    fetchMatches();
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, [selectedMatch?.id]);

  const totalOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    return parseFloat(selections.reduce((acc, sel) => acc * sel.odd, 1).toFixed(2));
  }, [selections]);

  const currentStake = Math.max(5, parseInt(betAmount) || 0);
  const potentialWin = Math.floor(currentStake * totalOdds);

  const toggleSelection = (match: GeneratedMatch, outcome: string, label: string, odd: number) => {
    if (match.status !== 'scheduled') return;
    haptic.light();
    
    setSelections(prev => {
      const existingIdx = prev.findIndex(s => s.matchId === match.id);
      if (existingIdx !== -1) {
        if (prev[existingIdx].outcome === outcome) return prev.filter(s => s.matchId !== match.id);
        const newSelections = [...prev];
        newSelections[existingIdx] = { matchId: match.id, matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`, outcome, outcomeLabel: label, odd };
        return newSelections;
      }
      return [...prev, { matchId: match.id, matchName: `${match.homeTeam.name} vs ${match.awayTeam.name}`, outcome, outcomeLabel: label, odd }];
    });
  };

  const handlePlaceBet = async () => {
    if (!userDocRef || !profile || selections.length === 0 || isProcessing) return;
    if (currentStake > (profile.totalPoints || 0)) { haptic.error(); toast({ variant: "destructive", title: "Lumière insuffisante" }); return; }
    setIsProcessing(true); haptic.medium();
    
    const betData = { 
      userId: user?.uid, 
      username: profile.username, 
      selections, 
      stake: currentStake, 
      totalOdds, 
      potentialWin, 
      status: "pending", 
      createdAt: serverTimestamp() 
    };

    try {
      await updateDoc(userDocRef, { totalPoints: increment(-currentStake), updatedAt: serverTimestamp() });
      await addDoc(collection(db!, "bets"), betData);
      haptic.success(); toast({ title: "Pacte Scellé !" });
      setSelections([]); setIsCouponOpen(false); setTab("history");
    } catch (e) { toast({ variant: "destructive", title: "Dissonance Système" }); } finally { setIsProcessing(false); }
  };

  const getFlagUrl = (code: string) => `https://www.drapeauxdespays.fr/data/flags/h80/${code}.png`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/10 backdrop-blur-xl border-b border-primary/5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Arènes du Monde</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/5 rounded-full border border-primary/5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{profile?.totalPoints?.toLocaleString() || 0} PTS</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      {/* Bouton de Coupon Fixe au Sommet */}
      <AnimatePresence>
        {selections.length > 0 && activeTab === "matches" && !isCouponOpen && (
          <div className="fixed top-24 left-0 right-0 z-[500] px-6 pointer-events-none flex justify-center">
            <motion.div 
              initial={{ y: -100, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -100, opacity: 0, scale: 0.8 }}
              className="w-full max-w-sm pointer-events-auto"
            >
              <button 
                onClick={() => { haptic.medium(); setIsCouponOpen(true); }}
                className="w-full flex items-center justify-between px-8 h-16 bg-primary text-primary-foreground rounded-full shadow-2xl border border-white/10 active:scale-95 transition-all overflow-hidden"
              >
                <div className="flex flex-col items-start leading-none">
                  <div className="flex items-center gap-2">
                    <Activity className="h-2.5 w-2.5 text-green-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Pacte Combiné</span>
                  </div>
                  <span className="text-sm font-black">{selections.length} Sélection{selections.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black italic tabular-nums">@{totalOdds.toFixed(2)}</span>
                  <ChevronRight className="h-5 w-5 opacity-60" />
                </div>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-6 pt-28 space-y-8 max-w-lg mx-auto w-full pb-48">
        <Tabs value={activeTab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 bg-primary/5 p-1 h-12 rounded-2xl mb-8">
            <TabsTrigger value="matches" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
              <Globe className="h-3.5 w-3.5" /> Nations
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
              <History className="h-3.5 w-3.5" /> Mes Paris
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6 m-0">
            {isLoadingMatches ? (
              <div className="py-24 flex flex-col items-center gap-4 opacity-40">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Invocation...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card 
                    key={match.id} 
                    onClick={() => { haptic.light(); setSelectedMatch(match); }}
                    className="border-none bg-card/20 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-primary/5 shadow-xl group cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3 w-3 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Coupe des Nations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.status === 'live' ? (
                          <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full">
                            <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-red-600 uppercase tabular-nums">{match.liveInfo?.display}</span>
                          </div>
                        ) : match.status === 'finished' ? (
                          <span className="text-[8px] font-black opacity-30 uppercase">Terminé</span>
                        ) : (
                          <span className="text-[9px] font-bold opacity-40">{format(new Date(match.startTime), 'HH:mm')}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center mb-8">
                      <div className="text-center space-y-3">
                        <div className="relative h-14 w-14 bg-primary/5 rounded-[1.2rem] mx-auto flex items-center justify-center overflow-hidden border border-primary/5">
                          <Image src={getFlagUrl(match.homeTeam.code)} alt="" fill className="object-cover" unoptimized />
                        </div>
                        <p className="text-[10px] font-black uppercase truncate">{match.homeTeam.name}</p>
                      </div>
                      <div className="text-center">
                        {match.status !== 'scheduled' ? (
                          <div className="text-3xl font-black italic tracking-tighter tabular-nums flex justify-center gap-2">
                            <span>{match.score.home}</span>
                            <span className="opacity-20">-</span>
                            <span>{match.score.away}</span>
                          </div>
                        ) : (
                          <div className="text-sm font-black opacity-10 uppercase italic">VS</div>
                        )}
                      </div>
                      <div className="text-center space-y-3">
                        <div className="relative h-14 w-14 bg-primary/5 rounded-[1.2rem] mx-auto flex items-center justify-center overflow-hidden border border-primary/5">
                          <Image src={getFlagUrl(match.awayTeam.code)} alt="" fill className="object-cover" unoptimized />
                        </div>
                        <p className="text-[10px] font-black uppercase truncate">{match.awayTeam.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2" onClick={e => e.stopPropagation()}>
                      {(['1', 'X', '2'] as const).map((outcome) => {
                        const isSelected = selections.find(s => s.matchId === match.id && s.outcome === outcome);
                        const odd = match.odds[outcome];
                        const label = outcome === '1' ? match.homeTeam.name : outcome === 'X' ? 'Match Nul' : match.awayTeam.name;
                        return (
                          <button
                            key={outcome}
                            disabled={match.status !== 'scheduled'}
                            onClick={() => toggleSelection(match, outcome, label, odd)}
                            className={cn(
                              "flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-500",
                              isSelected ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" : "bg-primary/5 border-primary/5"
                            )}
                          >
                            <span className="text-[8px] font-black uppercase mb-1 opacity-40">{outcome}</span>
                            <span className="text-sm font-black tabular-nums">{odd.toFixed(2)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 m-0">
            {userBets?.map((bet) => (
              <Card key={bet.id} className="border-none bg-card/20 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-primary/5 shadow-lg">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Combiné ({bet.selections.length})</p>
                    <p className="text-base font-black tabular-nums">{bet.stake} PTS</p>
                  </div>
                  <div className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-primary/5">
                    {bet.status === "pending" ? "En Stase" : "Réalisé"}
                  </div>
                </div>
                <div className="space-y-3 pb-6 border-b border-primary/5">
                  {bet.selections.map((sel: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-primary/5 p-3 rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold opacity-40 uppercase truncate">{sel.matchName}</p>
                        <p className="text-xs font-black text-primary truncate">{sel.outcomeLabel}</p>
                      </div>
                      <p className="text-xs font-black italic ml-4">@{parseFloat(sel.odd).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-6">
                  <p className="text-[10px] font-black uppercase opacity-30">Cote: @{bet.totalOdds?.toFixed(2)}</p>
                  <p className="text-xl font-black text-primary tabular-nums">+{bet.potentialWin} PTS</p>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogue de Détails du Match (Style 1xBet) */}
      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-[45px] border-primary/10 rounded-[3rem] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {selectedMatch && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-4 relative overflow-hidden bg-primary/5 border-b border-primary/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.05),transparent_70%)] pointer-events-none" />
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <button onClick={() => setSelectedMatch(null)} className="h-10 w-10 rounded-full bg-background/40 flex items-center justify-center"><X className="h-5 w-5" /></button>
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Arène de Match</p>
                    {selectedMatch.status === 'live' && <span className="text-[9px] font-black text-red-600 animate-pulse uppercase mt-1">{selectedMatch.liveInfo?.display}</span>}
                  </div>
                  <div className="w-10 h-10" />
                </div>

                <div className="grid grid-cols-3 gap-4 items-center relative z-10">
                  <div className="text-center space-y-3">
                    <div className="relative h-20 w-20 bg-background rounded-3xl mx-auto flex items-center justify-center shadow-xl border border-primary/5 overflow-hidden">
                      <Image src={getFlagUrl(selectedMatch.homeTeam.code)} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <p className="text-xs font-black uppercase leading-tight">{selectedMatch.homeTeam.name}</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-5xl font-black italic tracking-tighter tabular-nums flex justify-center gap-3">
                      <span>{selectedMatch.score.home}</span>
                      <span className="opacity-10">-</span>
                      <span>{selectedMatch.score.away}</span>
                    </div>
                    <div className="h-1 w-12 bg-primary/10 mx-auto rounded-full" />
                  </div>
                  <div className="text-center space-y-3">
                    <div className="relative h-20 w-20 bg-background rounded-3xl mx-auto flex items-center justify-center shadow-xl border border-primary/5 overflow-hidden">
                      <Image src={getFlagUrl(selectedMatch.awayTeam.code)} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <p className="text-xs font-black uppercase leading-tight">{selectedMatch.awayTeam.name}</p>
                  </div>
                </div>
              </div>

              <div className="bg-background/20 p-1 flex border-b border-primary/5">
                {[
                  { id: 'bet', label: 'Parier', icon: Zap },
                  { id: 'timeline', label: 'Détails', icon: ListOrdered },
                  { id: 'stats', label: 'Stats', icon: BarChart3 },
                  { id: 'ranking', label: 'Position', icon: Trophy }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => { haptic.light(); setDetailsTab(tab.id); }}
                    className={cn(
                      "flex-1 py-3 flex flex-col items-center gap-1.5 transition-all",
                      detailsTab === tab.id ? "text-primary opacity-100" : "opacity-30"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  {detailsTab === 'bet' && (
                    <div className="space-y-8">
                      {selectedMatch.markets.map(market => (
                        <div key={market.id} className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">{market.name}</p>
                          <div className={cn("grid gap-2", market.options.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                            {market.options.map(opt => {
                              const isSelected = selections.find(s => s.matchId === selectedMatch.id && s.outcome === opt.type);
                              return (
                                <button
                                  key={opt.type}
                                  disabled={selectedMatch.status !== 'scheduled'}
                                  onClick={() => toggleSelection(selectedMatch, opt.type, opt.label, opt.odd)}
                                  className={cn(
                                    "flex flex-col items-center justify-center py-4 rounded-[1.5rem] border transition-all",
                                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-primary/5 border-primary/5"
                                  )}
                                >
                                  <span className="text-[9px] font-bold uppercase mb-1 opacity-40">{opt.label}</span>
                                  <span className="text-sm font-black">{opt.odd.toFixed(2)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailsTab === 'timeline' && (
                    <div className="space-y-6 py-4">
                      {selectedMatch.events.length === 0 ? (
                        <div className="py-20 text-center opacity-20">
                          <Activity className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Aucun événement capté</p>
                        </div>
                      ) : (
                        selectedMatch.events.map((event, idx) => (
                          <div key={idx} className={cn("flex items-center gap-4", event.team === 'away' && "flex-row-reverse text-right")}>
                            <div className="text-sm font-black tabular-nums w-8 opacity-40">{event.minute}'</div>
                            <div className={cn(
                              "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/5",
                              event.type === 'goal' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                            )}>
                              {event.type === 'goal' ? <Zap className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-black uppercase tracking-tight">{event.player}</p>
                              <p className="text-[8px] font-bold opacity-40 uppercase">{event.type === 'goal' ? "But Magistral" : "Action Défensive"}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailsTab === 'stats' && (
                    <div className="space-y-10 py-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end px-2">
                          <div className="flex flex-col items-start"><p className="text-[10px] font-black uppercase opacity-40">Domination</p><p className="text-lg font-black">{selectedMatch.stats.possession.home}%</p></div>
                          <div className="flex flex-col items-end"><p className="text-[10px] font-black uppercase opacity-40">Possession</p><p className="text-lg font-black">{selectedMatch.stats.possession.away}%</p></div>
                        </div>
                        <Progress value={selectedMatch.stats.possession.home} className="h-2 rounded-full bg-primary/10" />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="p-6 bg-primary/5 rounded-[2rem] text-center space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Tirs Totaux</p>
                          <div className="flex items-center justify-center gap-4">
                            <span className="text-2xl font-black">{selectedMatch.stats.shots.home}</span>
                            <BarChart3 className="h-4 w-4 opacity-20" />
                            <span className="text-2xl font-black">{selectedMatch.stats.shots.away}</span>
                          </div>
                        </div>
                        <div className="p-6 bg-primary/5 rounded-[2rem] text-center space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Corners</p>
                          <div className="flex items-center justify-center gap-4">
                            <span className="text-2xl font-black">{selectedMatch.stats.corners.home}</span>
                            <Activity className="h-4 w-4 opacity-20" />
                            <span className="text-2xl font-black">{selectedMatch.stats.corners.away}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailsTab === 'ranking' && (
                    <div className="space-y-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Top de la Journée</p>
                      <div className="space-y-2">
                        {matches.slice(0, 5).map((m, i) => (
                          <div key={m.id} className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/5">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black opacity-20">#{i+1}</span>
                              <p className="text-xs font-black uppercase">{m.homeTeam.name}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-[10px] font-bold opacity-40 tabular-nums">{m.score.home}-{m.score.away}</div>
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue de Coupon */}
      <Dialog open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-[45px] border-primary/10 rounded-[3rem] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-8 flex flex-col h-full gap-8">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Scellage du Flux</p>
                  <DialogTitle className="text-2xl font-black tracking-tight italic uppercase">Votre Coupon</DialogTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { haptic.light(); setSelections([]); setIsCouponOpen(false); }} className="rounded-2xl h-12 w-12 text-destructive hover:bg-destructive/10"><Trash2 className="h-5 w-5" /></Button>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4 px-1">
                {selections.map((sel) => (
                  <motion.div key={sel.matchId} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative p-5 bg-primary/5 rounded-[2rem] border border-primary/5 overflow-hidden group">
                    <button 
                      onClick={() => setSelections(prev => prev.filter(s => s.matchId !== sel.matchId))}
                      className="absolute top-4 right-4 h-6 w-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">{sel.matchName}</p>
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold uppercase opacity-30">Votre choix</p>
                        <p className="font-black text-primary text-base truncate max-w-[180px]">{sel.outcomeLabel}</p>
                      </div>
                      <p className="text-2xl font-black tabular-nums italic">@{sel.odd.toFixed(2)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
            <div className="space-y-6 pt-4 border-t border-primary/5">
              <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</Label>
                  <span className="text-[9px] font-black uppercase opacity-20">Dispo: {profile?.totalPoints?.toLocaleString()} PTS</span>
                </div>
                <div className="relative">
                  <Input type="number" value={betAmount} onChange={(e) => setBetInput(e.target.value)} className="h-16 text-3xl font-black text-center rounded-2xl bg-primary/5 border-none shadow-inner" autoFocus />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20"><Zap className="h-6 w-6 text-primary" /></div>
                </div>
              </div>
              <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/5 flex justify-between items-center shadow-inner">
                <div className="flex flex-col"><p className="text-[9px] font-black uppercase opacity-30">Multiplicateur</p><p className="text-2xl font-black italic text-primary tabular-nums">@{totalOdds.toFixed(2)}</p></div>
                <div className="text-right"><p className="text-[9px] font-black uppercase opacity-30">Gain de Lumière</p><p className="text-3xl font-black tabular-nums tracking-tighter">+{potentialWin} <span className="text-xs opacity-20">PTS</span></p></div>
              </div>
              <Button onClick={handlePlaceBet} disabled={isProcessing || selections.length === 0 || currentStake > (profile?.totalPoints || 0)} className="w-full h-20 rounded-[2.2rem] font-black text-sm uppercase shadow-2xl bg-primary text-primary-foreground gap-4 active:scale-95">
                {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />} Sceller le Pacte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
