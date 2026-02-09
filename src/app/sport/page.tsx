
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy,
  limit
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  Zap, 
  Loader2, 
  History, 
  Globe,
  Trophy,
  Lock
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useSport } from "./SportContext";
import { getDailyMatches, type GeneratedMatch } from "@/app/actions/sport";
import { format } from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Liste des Rencontres de l'Arène.
 * Affiche les matchs générés dynamiquement et permet la navigation vers les détails.
 * Les positions sont générées en temps réel selon le statut (Live > Scheduled > Finished).
 */

export default function SportListPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { selections, toggleSelection } = useSport();

  const [activeTab, setTab] = useState("matches");
  const [matches, setMatches] = useState<GeneratedMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

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
        
        // Oracle du Tri Dynamique en Temps Réel
        const sortedMatches = [...daily].sort((a, b) => {
          // Ordre des statuts : Live (0), Scheduled (1), Finished (2)
          const statusOrder: Record<string, number> = { live: 0, scheduled: 1, finished: 2 };
          const orderA = statusOrder[a.status];
          const orderB = statusOrder[b.status];

          if (orderA !== orderB) return orderA - orderB;

          // Si même statut, on affine :
          if (a.status === 'live') {
            // Plus avancé en minutes d'abord
            return (b.liveInfo?.minute || 0) - (a.liveInfo?.minute || 0);
          }
          if (a.status === 'scheduled') {
            // Plus proche dans le futur d'abord
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          }
          if (a.status === 'finished') {
            // Plus récemment terminé d'abord
            const endA = a.endTime ? new Date(a.endTime).getTime() : 0;
            const endB = b.endTime ? new Date(b.endTime).getTime() : 0;
            return endB - endA;
          }
          return 0;
        });

        setMatches(sortedMatches);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingMatches(false);
      }
    };
    
    fetchMatches();
    // Rafraîchissement sacré toutes les 10 secondes pour capter les mutations de l'arène
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const getFlagUrl = (code: string) => `https://www.drapeauxdespays.fr/data/flags/h80/${code}.png`;

  return (
    <div className="flex flex-col min-h-screen">
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
                    onClick={() => { haptic.light(); router.push(`/sport/${match.id}`); }}
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
                          <span className="text-[8px] font-black opacity-30 uppercase">Terminé à {match.endTime ? format(new Date(match.endTime), 'HH:mm') : format(new Date(match.startTime), 'HH:mm')}</span>
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
                        const isLocked = match.status !== 'scheduled';

                        return (
                          <button
                            key={outcome}
                            disabled={isLocked}
                            onClick={() => toggleSelection(match.id, `${match.homeTeam.name} vs ${match.awayTeam.name}`, outcome, label, odd, match.status)}
                            className={cn(
                              "flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-500 min-h-[64px]",
                              isSelected ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" : "bg-primary/5 border-primary/5",
                              isLocked && "opacity-50"
                            )}
                          >
                            <span className="text-[8px] font-black uppercase mb-1 opacity-40">{outcome}</span>
                            {isLocked ? (
                              <Lock className="h-3.5 w-3.5 opacity-40" />
                            ) : (
                              <span className="text-sm font-black tabular-nums">{odd.toFixed(2)}</span>
                            )}
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
            {userBets?.length === 0 ? (
              <div className="py-32 text-center opacity-20 space-y-4">
                <History className="h-16 w-16 mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest">Aucun pacte scellé</p>
              </div>
            ) : userBets?.map((bet) => (
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
    </div>
  );
}
