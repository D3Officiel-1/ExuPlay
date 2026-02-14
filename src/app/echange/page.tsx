
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, collection, addDoc, increment, updateDoc, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Zap, 
  ArrowRightLeft, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Percent,
  Lock,
  Fingerprint,
  History,
  TrendingUp,
  Banknote,
  Clock,
  ShieldCheck,
  Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { verifyPasskey } from "@/lib/passkey";
import { haptic } from "@/lib/haptics";
import { PendingExchangesDialog } from "@/components/PendingExchangesDialog";
import Image from "next/image";
import placeholderImages from "@/app/lib/placeholder-images.json";
import { cn } from "@/lib/utils";

export default function EchangePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const appConfigRef = useMemo(() => {
    if (!db) return null;
    return doc(db, "appConfig", "status");
  }, [db]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);
  const { data: appStatus, loading: configLoading } = useDoc(appConfigRef);

  // --- LOGIQUE DES MÉTRIQUES PERSONNELLES ---
  const userExchangesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "exchanges"), where("userId", "==", user.uid));
  }, [db, user?.uid]);

  const { data: userExchanges } = useCollection(userExchangesQuery);

  const userMetrics = useMemo(() => {
    if (!userExchanges) return { pendingPoints: 0, completedAmount: 0, pendingCount: 0 };
    return {
      pendingPoints: userExchanges.filter(e => e.status === 'pending').reduce((acc, e) => acc + (e.points || 0), 0),
      completedAmount: userExchanges.filter(e => e.status === 'completed').reduce((acc, e) => acc + (e.amount || 0), 0),
      pendingCount: userExchanges.filter(e => e.status === 'pending').length
    };
  }, [userExchanges]);
  
  const waveIcon = placeholderImages.placeholderImages.find(img => img.id === "wave-icon")?.imageUrl;

  const totalPoints = profile?.totalPoints || 0;
  const bonusBalance = profile?.bonusBalance || 0;
  
  // LOGIQUE DE RETRAIT : On ne peut retirer que les points qui ne sont pas dans le solde bonus
  const withdrawablePoints = Math.max(0, totalPoints - bonusBalance);
  
  const conversionRate = appStatus?.pointConversionRate ?? 0.5; 
  const feeRate = (appStatus?.exchangeFeePercent ?? 1) / 100;
  
  const grossMoneyValue = Math.floor(withdrawablePoints * conversionRate);
  const exchangeFees = Math.ceil(grossMoneyValue * feeRate);
  const netMoneyValue = Math.max(0, grossMoneyValue - exchangeFees);
  
  const minWithdrawable = 100; 
  const isExchangeGloballyEnabled = appStatus?.exchangeEnabled === true;

  const handleExchange = async () => {
    if (!isExchangeGloballyEnabled) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Système suspendu",
        description: "Les conversions sont temporairement fermées par l'administrateur."
      });
      return;
    }

    if (withdrawablePoints < minWithdrawable) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Vous devez avoir au moins ${minWithdrawable} points retirable pour initier un échange.`
      });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    if (profile?.biometricEnabled && profile?.passkeyId) {
      try {
        const success = await verifyPasskey(profile.passkeyId);
        if (!success) {
          setIsProcessing(false);
          haptic.error();
          return;
        }
        haptic.success();
      } catch (error: any) {
        setIsProcessing(false);
        haptic.error();
        if (error.name !== 'AbortError') {
          toast({
            variant: "destructive",
            title: "Sceau invalide",
            description: "L'identité de l'esprit n'a pas pu être confirmée."
          });
        }
        return;
      }
    }
    
    if (userDocRef && db && user) {
      const exchangeData = {
        userId: user.uid,
        username: profile?.username || "Anonyme",
        phoneNumber: profile?.phoneNumber || "Non lié",
        points: withdrawablePoints,
        amount: netMoneyValue,
        status: "pending",
        requestedAt: serverTimestamp()
      };

      updateDoc(userDocRef, {
        totalPoints: increment(-withdrawablePoints),
        updatedAt: serverTimestamp()
      }).then(() => {
        addDoc(collection(db, "exchanges"), exchangeData)
          .then(() => {
            setIsSuccess(true);
            haptic.success();
            toast({
              title: "Demande envoyée",
              description: "Votre lumière a été mise en séquestre pour conversion."
            });
          })
          .catch(async (error) => {
            updateDoc(userDocRef, {
              totalPoints: increment(withdrawablePoints)
            });
            const permissionError = new FirestorePermissionError({
              path: 'exchanges',
              operation: 'create',
              requestResourceData: exchangeData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setIsProcessing(false);
          });
      }).catch(async (error) => {
        setIsProcessing(false);
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: { totalPoints: `decrement ${withdrawablePoints}` },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    }
  };

  if (profileLoading || configLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="rounded-full h-10 w-10 hover:bg-primary/5"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Finance</p>
              <h1 className="text-3xl font-black tracking-tight">Conversion</h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => { haptic.light(); setShowHistory(true); }}
            className="rounded-full h-12 w-12 bg-primary/5 relative group"
          >
            <History className="h-5 w-5 transition-transform group-hover:rotate-[-30deg]" />
            {userMetrics.pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-black border-2 border-background animate-bounce">
                {userMetrics.pendingCount}
              </span>
            )}
          </Button>
        </div>

        {/* Métriques de Prospérité Personnelle */}
        {!isSuccess && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none bg-primary/5 rounded-[2rem] p-5 space-y-2 shadow-inner">
              <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <Clock className="h-4 w-4 text-primary opacity-40" />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">En attente</p>
                <p className="text-lg font-black tabular-nums">{userMetrics.pendingPoints.toLocaleString()} <span className="text-[10px] opacity-30">PTS</span></p>
              </div>
            </Card>
            <Card className="border-none bg-primary/5 rounded-[2rem] p-5 space-y-2 shadow-inner">
              <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <TrendingUp className="h-4 w-4 text-primary opacity-40" />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Total Reçu</p>
                <p className="text-lg font-black tabular-nums">{userMetrics.completedAmount.toLocaleString()} <span className="text-[10px] opacity-30">CFA</span></p>
              </div>
            </Card>
          </div>
        )}

        {!isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden relative">
              <div className="absolute inset-0 pointer-events-none opacity-5">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary-rgb),0.5),transparent_70%)]" />
              </div>

              <CardHeader className="text-center pt-10 pb-6 relative z-10">
                <div className="flex justify-center gap-8 mb-4">
                  <div className="text-center space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-30">Solde Total</p>
                    <p className="text-2xl font-black tabular-nums">{totalPoints.toLocaleString()}</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Bonus Restant</p>
                    <p className="text-2xl font-black tabular-nums text-primary/40">{bonusBalance.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mx-auto w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-4 relative">
                  <Zap className="h-10 w-10 text-primary" />
                  <motion.div 
                    animate={{ opacity: [0, 1, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/10 rounded-[2rem] blur-xl"
                  />
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-[0.3em] opacity-40">Lumière Retirable</CardTitle>
                <div className="mt-2">
                  <span className="text-5xl font-black tracking-tighter tabular-nums">{withdrawablePoints.toLocaleString()}</span>
                  <span className="text-xs font-bold opacity-30 ml-2">PTS</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-20 mt-2">Taux actuel : 1 PTS = {conversionRate} FCFA</p>
              </CardHeader>
              
              <CardContent className="px-8 pb-10 space-y-6 relative z-10">
                <div className="space-y-3 py-4 border-y border-primary/5">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase opacity-30">Valeur brute</p>
                    <p className="text-sm font-bold tabular-nums">{grossMoneyValue.toLocaleString()} FCFA</p>
                  </div>
                  <div className="flex justify-between items-center px-2 text-destructive">
                    <p className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1.5">
                      <Percent className="h-2.5 w-2.5" />
                      Frais de traitement ({appStatus?.exchangeFeePercent ?? 1}%)
                    </p>
                    <p className="text-sm font-black tabular-nums">-{exchangeFees.toLocaleString()} FCFA</p>
                  </div>
                  <div className="h-px bg-primary/5 w-full my-1" />
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase tracking-wider">Montant Harmonisé</p>
                    <p className="text-2xl font-black text-primary tabular-nums">{netMoneyValue.toLocaleString()} <span className="text-xs opacity-40">FCFA</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/5 shadow-inner">
                    <div className="relative h-10 w-10 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                      {waveIcon && <Image src={waveIcon} alt="Wave" fill className="object-cover p-1" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] font-black uppercase opacity-40">Compte de réception</p>
                      <p className="text-sm font-bold truncate">{profile?.phoneNumber || "Non lié"}</p>
                    </div>
                    <Smartphone className="h-4 w-4 opacity-20" />
                  </div>

                  <div className="space-y-2">
                    {bonusBalance > 0 && (
                      <div className="flex gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 items-center">
                        <Gift className="h-4 w-4 text-primary shrink-0 opacity-40" />
                        <p className="text-[9px] leading-relaxed font-bold opacity-40 uppercase">
                          Le solde bonus ({bonusBalance} PTS) est réservé aux arènes et sera libéré au fil de vos jeux.
                        </p>
                      </div>
                    )}

                    {!isExchangeGloballyEnabled && (
                      <div className="flex gap-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 items-center">
                        <Lock className="h-4 w-4 text-red-500 shrink-0" />
                        <p className="text-[10px] leading-relaxed font-black text-red-600 uppercase">
                          Le portail des flux est scellé par l'administration.
                        </p>
                      </div>
                    )}

                    {profile?.biometricEnabled && (
                      <div className="flex gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 items-center">
                        <Fingerprint className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-[10px] leading-relaxed font-black opacity-60 uppercase">
                          Validation par Sceau Biométrique requise.
                        </p>
                      </div>
                    )}

                    {withdrawablePoints < minWithdrawable && (
                      <div className="flex gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 items-start">
                        <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-orange-600/80 uppercase">
                            Prospérité Retirable Insuffisante.
                          </p>
                          <p className="text-[8px] font-medium opacity-40 uppercase">Seuil requis : {minWithdrawable} PTS</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="px-8 pb-10 relative z-10">
                <Button 
                  onClick={handleExchange}
                  disabled={isProcessing || withdrawablePoints < minWithdrawable || !isExchangeGloballyEnabled}
                  className={cn(
                    "w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl transition-all duration-500",
                    isExchangeGloballyEnabled && withdrawablePoints >= minWithdrawable ? "shadow-primary/20" : "opacity-50"
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {profile?.biometricEnabled ? <ShieldCheck className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                      Invoquer le Transfert
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <div className="flex items-center gap-4 px-2 opacity-30">
              <div className="h-px flex-1 bg-primary/10" />
              <p className="text-[8px] font-black uppercase tracking-[0.3em]">Protocole de Flux v2.1</p>
              <div className="h-px flex-1 bg-primary/10" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-10 py-10"
          >
            <div className="relative inline-block">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" 
              />
              <div className="relative h-28 w-28 bg-card rounded-[3rem] flex items-center justify-center border border-green-500/20 shadow-2xl mx-auto">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tighter italic uppercase">Demande Émise</h2>
              <p className="text-sm font-medium opacity-40 px-8 leading-relaxed">
                Votre Lumière a été mise en stase. Le transfert de <span className="text-primary font-black">{netMoneyValue.toLocaleString()} FCFA</span> sera matérialisé sur votre compte Wave après arbitrage des Sages (sous 24h).
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={() => router.push("/home")}
              className="h-16 px-10 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] border-primary/10 hover:bg-primary/5"
            >
              Retour à l'éveil
            </Button>
          </motion.div>
        )}

        <PendingExchangesDialog 
          open={showHistory} 
          onOpenChange={setShowHistory} 
        />
      </main>
    </div>
  );
}
