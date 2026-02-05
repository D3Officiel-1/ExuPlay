
"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  Clock,
  Calendar,
  Percent,
  Lock,
  Fingerprint
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
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  // Check if current time is Friday between 18h and 20h
  useEffect(() => {
    const checkWindow = () => {
      const now = new Date();
      const day = now.getDay(); // 5 = Friday
      const hours = now.getHours();
      setIsWindowOpen(day === 5 && hours >= 18 && hours < 20);
    };
    checkWindow();
    const interval = setInterval(checkWindow, 60000);
    return () => clearInterval(interval);
  }, []);

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
  
  const waveIcon = placeholderImages.placeholderImages.find(img => img.id === "wave-icon")?.imageUrl;

  const points = profile?.totalPoints || 0;
  const conversionRate = 1; // 1 point = 1 FCFA
  const grossMoneyValue = points * conversionRate;
  
  // Calcul des frais de 1%
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

    if (!isWindowOpen) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Fenêtre fermée",
        description: "Les échanges ne sont autorisés que le vendredi de 18h à 20h."
      });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    // Étape de sécurité : Vérification du Sceau si activé
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
    
    if (userDocRef) {
      updateDoc(userDocRef, {
        totalPoints: 0,
        lastExchangeAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).then(() => {
        setIsSuccess(true);
        haptic.success();
        toast({
          title: "Échange réussi",
          description: "Votre demande a été transmise au réseau Wave."
        });
      }).catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: { totalPoints: 0 },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }).finally(() => {
        setIsProcessing(false);
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
                        <p className="text-[10px] leading-relaxed font-bold text-orange-600/80 uppercase">
                          Seuil minimum de {minPoints} points requis.
                        </p>
                      </div>
                    )}

                    <div className={`flex gap-3 p-4 rounded-2xl border items-start ${isWindowOpen ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                      {isWindowOpen ? <Clock className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> : <Calendar className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                      <div className="space-y-1">
                        <p className={`text-[10px] leading-relaxed font-black uppercase ${isWindowOpen ? 'text-green-600' : 'text-red-600'}`}>
                          Fenêtre de transfert : Vendredi 18h - 20h
                        </p>
                        {!isWindowOpen && (
                          <p className="text-[9px] font-bold opacity-60 uppercase">Actuellement fermé</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="px-8 pb-10">
                <Button 
                  onClick={handleExchange}
                  disabled={isProcessing || points < minPoints || !isWindowOpen || !isExchangeGloballyEnabled}
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
              Les échanges sont traités sous 24h. Le taux est fixe à 1 point pour 1 FCFA (hors frais de service).
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
                Votre lumière a été convertie. Le transfert de {netMoneyValue.toLocaleString()} FCFA vers votre compte Wave est en cours d'harmonisation.
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
      </main>
    </div>
  );
}
