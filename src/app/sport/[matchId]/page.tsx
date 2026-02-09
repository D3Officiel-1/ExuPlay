"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSport } from "../SportContext";
import { getMatchById, type GeneratedMatch } from "@/app/actions/sport";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Zap, 
  Loader2, 
  Activity, 
  Trophy, 
  BarChart3, 
  ListOrdered, 
  ShieldCheck, 
  X,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import Image from "next/image";

/**
 * @fileOverview Oracle des Détails de Match.
 * Une page dédiée offrant une vue profonde et vivante sur une rencontre spécifique.
 * Synchronisation en temps réel des événements (buts, cartons) et du score.
 */

export default function MatchDetailsPage() {
  const { matchId } = useParams() as { matchId: string };
  const router = useRouter();
  const { selections, toggleSelection } = useSport();
  
  const [match, setMatch] = useState<GeneratedMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsTab, setDetailsTab] = useState("bet");

  useEffect(() => {
    const fetchMatch = async () => {
      const data = await getMatchById(matchId);
      if (data) {
        setMatch(data);
      }
      setLoading(false);
    };
    
    fetchMatch();
    // Synchronisation sacrée toutes les 10 secondes pour capter les mutations de l'instant
    const interval = setInterval(fetchMatch, 10000);
    return () => clearInterval(interval);
  }, [matchId]);

  const getFlagUrl = (code: string) => `https://www.drapeauxdespays.fr/data/flags/h80/${code}.png`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center space-y-6">
        <X className="h-16 w-16 opacity-10" />
        <h2 className="text-2xl font-black italic">Match Introuvable</h2>
        <Button onClick={() => router.push("/sport")} className="rounded-2xl px-8 h-14">Retour à l'Arène</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/10 backdrop-blur-xl border-b border-primary/5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/sport")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Arène de Match</p>
          {match.status === 'live' ? (
            <span className="text-[9px] font-black text-red-600 animate-pulse uppercase mt-1">{match.liveInfo?.display}</span>
          ) : match.status === 'finished' ? (
            <span className="text-[9px] font-black opacity-40 uppercase mt-1">Terminé</span>
          ) : (
            <span className="text-[9px] font-black opacity-40 uppercase mt-1">À Venir</span>
          )}
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 flex flex-col pt-24">
        {/* En-tête Score Score Score */}
        <div className="p-8 pb-10 relative overflow-hidden bg-primary/5 border-b border-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.05),transparent_70%)] pointer-events-none" />
          
          <div className="grid grid-cols-3 gap-4 items-center relative z-10 max-w-lg mx-auto">
            <div className="text-center space-y-3">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative h-24 w-24 bg-background rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl border border-primary/5 overflow-hidden"
              >
                <Image src={getFlagUrl(match.homeTeam.code)} alt="" fill className="object-cover" unoptimized />
              </motion.div>
              <p className="text-sm font-black uppercase leading-tight tracking-tight">{match.homeTeam.name}</p>
            </div>

            <div className="text-center space-y-2">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`${match.score.home}-${match.score.away}`}
                  initial={{ y: 20, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  className="text-6xl font-black italic tracking-tighter tabular-nums flex justify-center gap-3"
                >
                  {match.status !== 'scheduled' ? (
                    <>
                      <span>{match.score.home}</span>
                      <span className="opacity-10">-</span>
                      <span>{match.score.away}</span>
                    </>
                  ) : (
                    <span className="text-2xl opacity-20 not-italic uppercase">VS</span>
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="h-1 w-12 bg-primary/10 mx-auto rounded-full" />
            </div>

            <div className="text-center space-y-3">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative h-24 w-24 bg-background rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl border border-primary/5 overflow-hidden"
              >
                <Image src={getFlagUrl(match.awayTeam.code)} alt="" fill className="object-cover" unoptimized />
              </motion.div>
              <p className="text-sm font-black uppercase leading-tight tracking-tight">{match.awayTeam.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Onglets */}
        <div className="bg-background/40 backdrop-blur-md sticky top-20 z-40 border-b border-primary/5 overflow-x-auto no-scrollbar">
          <div className="flex max-w-lg mx-auto p-1">
            {[
              { id: 'bet', label: 'Parier', icon: Zap },
              { id: 'timeline', label: 'Détails', icon: ListOrdered },
              { id: 'stats', label: 'Stats', icon: BarChart3 }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => { haptic.light(); setDetailsTab(tab.id); }}
                className={cn(
                  "flex-1 py-4 flex flex-col items-center gap-1.5 transition-all min-w-[100px] relative",
                  detailsTab === tab.id ? "text-primary opacity-100" : "opacity-30"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                {detailsTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-auto w-full pb-32">
          <AnimatePresence mode="wait">
            {detailsTab === 'bet' && (
              <motion.div 
                key="bet"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-8"
              >
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Vainqueur du Match</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1', 'X', '2'] as const).map((outcome) => {
                      const isSelected = selections.find(s => s.matchId === match.id && s.outcome === outcome);
                      const odd = match.odds[outcome];
                      const label = outcome === '1' ? match.homeTeam.name : outcome === 'X' ? 'Match Nul' : match.awayTeam.name;
                      return (
                        <button
                          key={outcome}
                          disabled={match.status !== 'scheduled'}
                          onClick={() => toggleSelection(match.id, `${match.homeTeam.name} vs ${match.awayTeam.name}`, outcome, label, odd, match.status)}
                          className={cn(
                            "flex flex-col items-center justify-center py-5 rounded-[2rem] border transition-all duration-500",
                            isSelected ? "bg-primary text-primary-foreground border-primary shadow-xl scale-105" : "bg-primary/5 border-primary/5"
                          )}
                        >
                          <span className="text-[9px] font-black uppercase mb-1 opacity-40">{outcome}</span>
                          <span className="text-base font-black tabular-nums">{odd.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {match.markets.map(market => (
                  <div key={market.id} className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">{market.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {market.options.map(opt => {
                        const isSelected = selections.find(s => s.matchId === match.id && s.outcome === opt.type);
                        return (
                          <button
                            key={opt.type}
                            disabled={match.status !== 'scheduled'}
                            onClick={() => toggleSelection(match.id, `${match.homeTeam.name} vs ${match.awayTeam.name}`, opt.type, opt.label, opt.odd, match.status)}
                            className={cn(
                              "flex flex-col items-center justify-center py-4 rounded-[1.5rem] border transition-all",
                              isSelected ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-primary/5 border-primary/5"
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
              </motion.div>
            )}

            {detailsTab === 'timeline' && (
              <motion.div 
                key="timeline"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-6"
              >
                {match.events.length === 0 ? (
                  <div className="py-24 text-center opacity-20 space-y-4">
                    <Activity className="h-16 w-16 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Le destin est en cours d'écriture</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {match.events.map((event, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex items-center gap-6", event.team === 'away' && "flex-row-reverse text-right")}
                      >
                        <div className="text-lg font-black tabular-nums w-10 opacity-20 italic">{event.minute}'</div>
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border border-primary/5 shadow-xl transition-all duration-500",
                          event.type === 'goal' ? "bg-green-500/10 text-green-600 scale-110" : 
                          event.type === 'yellow_card' ? "bg-yellow-500/10 text-yellow-600" :
                          "bg-red-500/10 text-red-600"
                        )}>
                          {event.type === 'goal' ? <Zap className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black uppercase tracking-tight">{event.player}</p>
                          <p className="text-[9px] font-bold opacity-40 uppercase">
                            {event.type === 'goal' ? "But Magistral" : 
                             event.type === 'yellow_card' ? "Avertissement" : "Exclusion"}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {detailsTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-12"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-2">
                    <div className="flex flex-col items-start"><p className="text-[10px] font-black uppercase opacity-40">Domination</p><p className="text-2xl font-black italic">{match.stats.possession.home}%</p></div>
                    <div className="flex flex-col items-end"><p className="text-[10px] font-black uppercase opacity-40">Possession</p><p className="text-2xl font-black italic">{match.stats.possession.away}%</p></div>
                  </div>
                  <div className="h-3 bg-primary/5 rounded-full overflow-hidden border border-primary/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${match.stats.possession.home}%` }}
                      className="h-full bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-8 bg-primary/5 rounded-[2.5rem] text-center space-y-3 shadow-inner border border-primary/5">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Tirs Totaux</p>
                    <div className="flex items-center justify-center gap-6">
                      <span className="text-3xl font-black italic tabular-nums">{match.stats.shots.home}</span>
                      <BarChart3 className="h-5 w-5 opacity-20" />
                      <span className="text-3xl font-black italic tabular-nums">{match.stats.shots.away}</span>
                    </div>
                  </div>
                  <div className="p-8 bg-primary/5 rounded-[2.5rem] text-center space-y-3 shadow-inner border border-primary/5">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Corners</p>
                    <div className="flex items-center justify-center gap-6">
                      <span className="text-3xl font-black italic tabular-nums">{match.stats.corners.home}</span>
                      <Activity className="h-5 w-5 opacity-20" />
                      <span className="text-3xl font-black italic tabular-nums">{match.stats.corners.away}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
