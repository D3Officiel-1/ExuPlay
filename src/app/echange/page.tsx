
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection, addDoc, query, where, orderBy, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  X,
  Trash2,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { verifyPasskey } from "@/lib/passkey";
import { haptic } from "@/lib/haptics";
import Image from "next/image";
import placeholderImages from "@/app/lib/placeholder-images.json";

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
  
  const pendingExchangesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "exchanges"),
      where("userId", "==", user.uid),
      where("status", "==", "pending"),
      orderBy("requestedAt", "desc")
    );
  }, [db, user?.uid]);

  const { data: pendingExchanges, loading: exchangesLoading } = useCollection(pendingExchangesQuery);

  const waveIcon = placeholderImages.placeholderImages.find(img => img.id === "wave-icon")?.imageUrl;

  const points = profile?.totalPoints || 0;
  const conversionRate = 1; // 1 point = 1 FCFA
  const grossMoneyValue = points * conversionRate;
  
  const feeRate = 0.01;
  const exchangeFees = Math.ceil(grossMoneyValue * feeRate);
  const netMoneyValue = Math.max(0, grossMoneyValue - exchangeFees);
  
  const minPoints = 1000;
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

    if (points < minPoints) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Vous devez accumuler au moins ${minPoints} points pour initier un échange.`
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
    
    if (userDocRef && db) {
      const exchangeData = {
        userId: user!.uid,
        username: profile?.username || "Anonyme",
        phoneNumber: profile?.phoneNumber || "Non lié",
        points: points,
        amount: netMoneyValue,
        status: "pending",
        requestedAt: serverTimestamp()
      };

      addDoc(collection(db, "exchanges"), exchangeData)
        .then(() => {
          setIsSuccess(true);
          haptic.success();
          toast({
            title: "Demande envoyée",
            description: "Votre demande est en cours d'harmonisation."
          });
        })
        .catch(async (error) => {
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
    }
  };

  const handleCancelExchange = (id: string) => {
    if (!db) return;
    haptic.medium();
    deleteDoc(doc(db, "exchanges", id))
      .then(() => {
        haptic.success();
        toast({
          title: "Demande annulée",
          description: "La conversion a été révoquée."
        });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: `exchanges/${id}`,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
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
            className="rounded-full h-12 w-12 bg-primary/5 relative"
          >
            <History className="h-5 w-5" />
            {pendingExchanges && pendingExchanges.length > 0 && (
              <span className="absolute top-2 right-2 h-4 w-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[8px] font-black">
                {pendingExchanges.length}
              </span>
            )}
          </Button>
        </div>

        {!isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="text-center pt-10 pb-6">
                <div className="mx-auto w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-4 relative">
                  <Zap className="h-10 w-10 text-primary" />
                  <motion.div 
                    animate={{ opacity: [0, 1, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/10 rounded-[2rem] blur-xl"
                  />
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-[0.3em] opacity-40">Votre Lumière</CardTitle>
                <div className="mt-2">
                  <span className="text-5xl font-black tracking-tighter">{points.toLocaleString()}</span>
                  <span className="text-xs font-bold opacity-30 ml-2">PTS</span>
                </div>
              </CardHeader>
              
              <CardContent className="px-8 pb-10 space-y-6">
                <div className="space-y-3 py-4 border-y border-primary/5">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase opacity-30">Valeur brute</p>
                    <p className="text-sm font-bold">{grossMoneyValue.toLocaleString()} FCFA</p>
                  </div>
                  <div className="flex justify-between items-center px-2 text-destructive">
                    <p className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1.5">
                      <Percent className="h-2.5 w-2.5" />
                      Frais de traitement (1%)
                    </p>
                    <p className="text-sm font-black">-{exchangeFees.toLocaleString()} FCFA</p>
                  </div>
                  <div className="h-px bg-primary/5 w-full my-1" />
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black uppercase tracking-wider">Montant Harmonisé</p>
                    <p className="text-2xl font-black text-primary">{netMoneyValue.toLocaleString()} <span className="text-xs opacity-40">FCFA</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/5">
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
                    {!isExchangeGloballyEnabled && (
                      <div className="flex gap-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 items-center">
                        <Lock className="h-4 w-4 text-red-500 shrink-0" />
                        <p className="text-[10px] leading-relaxed font-black text-red-600 uppercase">
                          Système fermé par le Maître.
                        </p>
                      </div>
                    )}

                    {profile?.biometricEnabled && (
                      <div className="flex gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 items-center">
                        <Fingerprint className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-[10px] leading-relaxed font-black opacity-60 uppercase">
                          Validation par Sceau requise.
                        </p>
                      </div>
                    )}

                    {points < minPoints && (
                      <div className="flex gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 items-start">
                        <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-orange-600/80 uppercase">
                          Seuil minimum de {minPoints} points requis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="px-8 pb-10">
                <Button 
                  onClick={handleExchange}
                  disabled={isProcessing || points < minPoints || !isExchangeGloballyEnabled}
                  className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {profile?.biometricEnabled ? <Fingerprint className="h-5 w-5" /> : <ArrowRightLeft className="h-5 w-5" />}
                      Convertir en Liquidité
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <p className="text-[10px] text-center font-bold opacity-20 uppercase tracking-[0.2em] px-10 leading-relaxed">
              Les échanges sont traités sous 24h. Les points sont débités de votre solde uniquement après validation.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 py-10"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative h-24 w-24 bg-card rounded-[2.5rem] flex items-center justify-center border border-green-500/20 shadow-2xl mx-auto">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">Demande Envoyée</h2>
              <p className="text-sm font-medium opacity-40 px-6">
                Votre lumière a été soumise pour conversion. Le transfert de {netMoneyValue.toLocaleString()} FCFA sera effectif après validation du Maître.
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={() => router.push("/home")}
              className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest"
            >
              Retour à l'éveil
            </Button>
          </motion.div>
        )}

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-background/80 backdrop-blur-2xl flex flex-col p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Historique</p>
                  <h2 className="text-2xl font-black tracking-tight">Demandes en cours</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowHistory(false)}
                  className="rounded-full h-12 w-12 bg-primary/5"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {exchangesLoading ? (
                  <div className="flex justify-center p-20">
                    <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                  </div>
                ) : !pendingExchanges || pendingExchanges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 space-y-4">
                    <Zap className="h-12 w-12" />
                    <p className="text-xs font-black uppercase tracking-widest">Aucune demande active</p>
                  </div>
                ) : (
                  pendingExchanges.map((ex) => (
                    <motion.div
                      key={ex.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group"
                    >
                      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-xl rounded-[2rem] overflow-hidden border border-primary/5">
                        <CardContent className="p-6 flex items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-primary opacity-40" />
                              <span className="text-base font-black tabular-nums">{ex.amount?.toLocaleString()} FCFA</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-40">
                              <Clock className="h-3 w-3" />
                              <p className="text-[9px] font-bold uppercase tracking-widest">
                                {ex.requestedAt && typeof ex.requestedAt.toDate === 'function' ? ex.requestedAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '---'}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelExchange(ex.id)}
                            className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/10 group-hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-8 p-6 bg-primary/5 rounded-[2.5rem] border border-primary/5">
                <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
                  "Une demande annulée libère immédiatement votre Lumière pour d'autres usages."
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
