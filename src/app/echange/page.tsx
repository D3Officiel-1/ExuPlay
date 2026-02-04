
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Zap, 
  Wallet, 
  ArrowRightLeft, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Image from "next/image";
import placeholderImages from "@/app/lib/placeholder-images.json";

export default function EchangePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);
  
  const waveIcon = placeholderImages.placeholderImages.find(img => img.id === "wave-icon")?.imageUrl;

  const points = profile?.totalPoints || 0;
  const conversionRate = 5; // 1 point = 5 FCFA (exemple)
  const moneyValue = points * conversionRate;

  const handleExchange = async () => {
    if (points < 500) {
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: "Vous devez accumuler au moins 500 points pour initier un échange."
      });
      return;
    }

    setIsProcessing(true);
    
    if (userDocRef) {
      // Dans un vrai système, on créerait une demande de retrait ici
      updateDoc(userDocRef, {
        totalPoints: 0, // On remet à zéro pour l'exemple
        lastExchangeAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).then(() => {
        setIsSuccess(true);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
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
                <div className="flex items-center justify-center gap-4 py-4 border-y border-primary/5">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase opacity-30 mb-1">Valeur estimée</p>
                    <p className="text-2xl font-black">{moneyValue.toLocaleString()} <span className="text-sm opacity-40">FCFA</span></p>
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

                  {points < 500 && (
                    <div className="flex gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 items-start">
                      <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] leading-relaxed font-bold text-orange-600/80 uppercase">
                        Seuil minimum de 500 points requis pour la conversion.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="px-8 pb-10">
                <Button 
                  onClick={handleExchange}
                  disabled={isProcessing || points < 500}
                  className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ArrowRightLeft className="h-5 w-5" />
                      Convertir en Liquidité
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <p className="text-[10px] text-center font-bold opacity-20 uppercase tracking-[0.2em] px-10 leading-relaxed">
              Les échanges sont traités sous 24h. Le taux de conversion peut varier selon l'activité du réseau.
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
                Votre lumière a été convertie. Le transfert vers votre compte Wave est en cours d'harmonisation.
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

      <BottomNav />
    </div>
  );
}
