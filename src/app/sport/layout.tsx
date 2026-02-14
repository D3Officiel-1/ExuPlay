
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
  Loader2,
  Info,
  Plus,
  Share2,
  Download,
  Copy,
  Check
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { 
  doc, 
  addDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { SportBetResolver } from "@/components/SportBetResolver";
import { FloatingCouponButton } from "@/components/FloatingCouponButton";

function CouponOverlay() {
  const { selections, setSelections, isCouponOpen, setIsCouponOpen, betAmount, setBetAmount } = useSport();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const totalOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    const sum = selections.reduce((acc, sel) => acc + Number(sel.odd), 0);
    return Math.round(sum * 100) / 100;
  }, [selections]);

  const currentStake = Math.max(5, parseInt(betAmount) || 0);
  const potentialWin = Math.floor(currentStake * totalOdds);

  const handlePlaceBet = async () => {
    if (!userDocRef || !profile || selections.length === 0 || isProcessing || !db) return;
    if (currentStake > (profile.totalPoints || 0)) { 
      haptic.error(); 
      toast({ variant: "destructive", title: "Lumière insuffisante" }); 
      return; 
    }
    setIsProcessing(true); 
    haptic.medium();
    
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const bonusReduction = Math.min(currentStake, profile.bonusBalance || 0);

    const betData = { 
      userId: user?.uid, 
      username: profile.username, 
      selections, 
      stake: currentStake, 
      totalOdds, 
      potentialWin, 
      shareCode,
      status: "pending", 
      createdAt: serverTimestamp() 
    };

    try {
      await updateDoc(userDocRef, { 
        totalPoints: increment(-currentStake), 
        bonusBalance: increment(-bonusReduction),
        updatedAt: serverTimestamp() 
      });
      
      await addDoc(collection(db, "bets"), betData);
      
      await addDoc(collection(db, "sharedCoupons"), {
        code: shareCode,
        selections,
        createdAt: serverTimestamp()
      });

      haptic.success(); 
      toast({ title: "Pacte Scellé !", description: `Code de partage : ${shareCode}` });
      setSelections([]); 
      setIsCouponOpen(false);
    } catch (e) { 
      toast({ variant: "destructive", title: "Dissonance Système" }); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleImportCoupon = async () => {
    const code = importCode.trim().toUpperCase();
    if (code.length !== 6 || isImporting || !db) return;
    setIsImporting(true);
    haptic.medium();

    try {
      const q = query(collection(db, "sharedCoupons"), where("code", "==", code), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setSelections(data.selections);
        setIsCouponOpen(true);
        setImportCode("");
        toast({ title: "Coupon Invoqué !" });
      } else {
        haptic.error();
        toast({ variant: "destructive", title: "Code inconnu" });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance lors de l'import" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <FloatingCouponButton 
        selectionsCount={selections.length}
        totalOdds={totalOdds}
        isCouponOpen={isCouponOpen}
        onOpen={() => setIsCouponOpen(true)}
      />

      <Dialog open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-[45px] border-primary/10 rounded-[3rem] p-0 shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh]">
          <div className="p-8 pb-4 shrink-0 bg-card/50 border-b border-primary/5">
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

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-8 py-6">
            <div className="space-y-6">
              {selections.length === 0 && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2 px-2">
                    <Download className="h-3 w-3 text-primary opacity-40" />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Invoquer un Coupon</span>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="CODE6X" 
                      value={importCode} 
                      onChange={e => setImportCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="h-14 rounded-2xl bg-primary/5 border-none text-center font-black text-xl tracking-widest"
                    />
                    <Button 
                      onClick={handleImportCoupon} 
                      disabled={importCode.length !== 6 || isImporting}
                      className="h-14 w-14 rounded-2xl shrink-0 shadow-xl"
                    >
                      {isImporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-6 w-6" />}
                    </Button>
                  </div>
                </div>
              )}

              {selections.length > 0 && (
                <div className="space-y-4">
                  {selections.map((sel, idx) => (
                    <React.Fragment key={sel.matchId}>
                      <motion.div 
                        layout 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="relative p-5 bg-primary/5 rounded-[2rem] border border-primary/5 overflow-hidden group"
                      >
                        <button 
                          onClick={() => { setSelections(prev => prev.filter(s => s.matchId !== sel.matchId)); }}
                          className="absolute top-4 right-4 h-6 w-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">{sel.matchName}</p>
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <p className="text-[8px] font-bold uppercase opacity-30">Prédiction</p>
                            <p className="font-black text-primary text-base truncate max-w-[180px]">{sel.outcomeLabel}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-bold uppercase opacity-30">Cote</p>
                            <p className="text-2xl font-black tabular-nums italic">{sel.odd.toFixed(2)}</p>
                          </div>
                        </div>
                      </motion.div>
                      {idx < selections.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            <Plus className="h-4 w-4 text-primary opacity-40" />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-8 pt-6 border-t border-primary/5 shrink-0 bg-card shadow-[0_-10px_40px_rgba(0,0,0,0.1)] space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[8px] font-black uppercase opacity-30">Cote Totale (Somme)</p>
                  <div className="h-3 w-3 bg-primary/10 rounded-full flex items-center justify-center">
                    <Plus className="h-2 w-2 text-primary opacity-40" />
                  </div>
                </div>
                <p className="text-2xl font-black italic text-primary tabular-nums">Σ {totalOdds.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase opacity-30">Gain Potential</p>
                <p className="text-2xl font-black tabular-nums text-primary">+{potentialWin} <span className="text-[10px] opacity-40 italic">PTS</span></p>
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[9px] font-black uppercase opacity-40">Mise</Label>
                  <span className="text-[8px] font-black opacity-20 tabular-nums">Solde: {profile?.totalPoints?.toLocaleString()}</span>
                </div>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={betAmount} 
                    onChange={(e) => setBetAmount(e.target.value)} 
                    className="h-14 text-xl font-black pl-10 rounded-2xl bg-primary/5 border-none shadow-inner" 
                    autoFocus 
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handlePlaceBet} 
                disabled={isProcessing || selections.length === 0 || currentStake > (profile?.totalPoints || 0)} 
                className="h-14 px-8 rounded-2xl font-black text-xs uppercase shadow-xl bg-primary text-primary-foreground gap-2 shrink-0 active:scale-95 transition-all"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} 
                Sceller le Pacte
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
        <SportBetResolver />
        <CouponOverlay />
        {children}
      </div>
    </SportProvider>
  );
}
