
"use client";

import React, { useMemo, useState } from "react";
import { SportProvider, useSport } from "./SportContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  ChevronRight, 
  Activity, 
  Trash2, 
  X, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, addDoc, updateDoc, increment, serverTimestamp, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

/**
 * @fileOverview Oracle du Sceau Global.
 * Gère le bouton de coupon fixe au sommet et l'état des sélections pour toutes les pages sportives.
 * Le coupon est désormais strictement confiné pour éviter tout débordement de la liste de sélections.
 */

function CouponOverlay() {
  const { selections, setSelections, isCouponOpen, setIsCouponOpen, betAmount, setBetAmount } = useSport();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const totalOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    return parseFloat(selections.reduce((acc, sel) => acc * sel.odd, 1).toFixed(2));
  }, [selections]);

  const currentStake = Math.max(5, parseInt(betAmount) || 0);
  const potentialWin = Math.floor(currentStake * totalOdds);

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
      setSelections([]); setIsCouponOpen(false);
    } catch (e) { toast({ variant: "destructive", title: "Dissonance Système" }); } finally { setIsProcessing(false); }
  };

  return (
    <>
      <AnimatePresence>
        {selections.length > 0 && !isCouponOpen && (
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

      <Dialog open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-[45px] border-primary/10 rounded-[3rem] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header Fixe */}
            <div className="p-8 pb-4 shrink-0">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Scellage du Flux</p>
                    <DialogTitle className="text-2xl font-black tracking-tight italic uppercase">Votre Coupon</DialogTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { haptic.light(); setSelections([]); setIsCouponOpen(false); }} 
                    className="rounded-2xl h-12 w-12 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </DialogHeader>
            </div>

            {/* Zone de Sélection Scrollable (Cœur du Confinement) */}
            <div className="flex-1 min-h-0 px-8">
              <ScrollArea className="h-full w-full">
                <div className="space-y-4 py-2 pr-4">
                  {selections.map((sel) => (
                    <motion.div 
                      key={sel.matchId} 
                      layout 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      className="relative p-5 bg-primary/5 rounded-[2rem] border border-primary/5 overflow-hidden group"
                    >
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
            </div>

            {/* Footer de Mise Fixe */}
            <div className="p-8 pt-6 border-t border-primary/5 shrink-0 bg-card/50 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</Label>
                  <span className="text-[9px] font-black uppercase opacity-20">Dispo: {profile?.totalPoints?.toLocaleString()} PTS</span>
                </div>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={betAmount} 
                    onChange={(e) => setBetAmount(e.target.value)} 
                    className="h-16 text-3xl font-black text-center rounded-2xl bg-primary/5 border-none shadow-inner" 
                    autoFocus 
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/5 flex justify-between items-center shadow-inner">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase opacity-30">Multiplicateur</p>
                  <p className="text-2xl font-black italic text-primary tabular-nums">@{totalOdds.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase opacity-30">Gain de Lumière</p>
                  <p className="text-3xl font-black tabular-nums tracking-tighter">
                    +{potentialWin} <span className="text-xs opacity-20">PTS</span>
                  </p>
                </div>
              </div>

              <Button 
                onClick={handlePlaceBet} 
                disabled={isProcessing || selections.length === 0 || currentStake > (profile?.totalPoints || 0)} 
                className="w-full h-20 rounded-[2.2rem] font-black text-sm uppercase shadow-2xl bg-primary text-primary-foreground gap-4 active:scale-95"
              >
                {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />} Sceller le Pacte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SportLayout({ children }: { children: React.ReactNode }) {
  return (
    <SportProvider>
      <div className="min-h-screen bg-background">
        <CouponOverlay />
        {children}
      </div>
    </SportProvider>
  );
}
