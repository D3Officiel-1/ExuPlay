"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Camera, ChevronRight, Loader2, Fingerprint, Sparkles, ShieldCheck } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc, serverTimestamp, getDoc, DocumentData } from "firebase/firestore";
import { createPasskey } from "@/lib/passkey";
import { haptic } from "@/lib/haptics";

export default function AutoriserPage() {
  const [step, setStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();

  const determineNextStep = (data: DocumentData | undefined) => {
    if (!data) return 1;
    if (!data.cameraAuthorized) return 1;
    if (!data.biometricEnabled) return 2;
    return 3; // Étape finale pour redirection
  };

  useEffect(() => {
    const detectStartStep = async () => {
      if (authLoading) return;
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        const nextStep = determineNextStep(data);
        
        if (nextStep === 3) {
          router.push("/home");
        } else {
          setStep(nextStep);
        }
      } catch (error) {
        setStep(1);
      } finally {
        setInitializing(false);
      }
    };
    detectStartStep();
  }, [user, authLoading, db, router]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleRequestCamera = async () => {
    setLoading(true);
    haptic.medium();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          cameraAuthorized: true,
          updatedAt: serverTimestamp()
        });
      }

      haptic.success();
      toast({ title: "Perception activée", description: "Vos yeux sont désormais ouverts sur l'éveil." });
      
      setTimeout(() => {
        setStep(2);
        setLoading(false);
      }, 1500);
    } catch (error) {
      setLoading(false);
      toast({ variant: 'destructive', title: 'Accès refusé', description: 'Veuillez activer la caméra pour continuer.' });
    }
  };

  const handleForgeSceau = async () => {
    setLoading(true);
    haptic.medium();
    try {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const username = userDoc.data()?.username || "Esprit";

      const passkeyId = await createPasskey(username);
      
      await updateDoc(doc(db, "users", user.uid), {
        biometricEnabled: true,
        passkeyId: passkeyId,
        updatedAt: serverTimestamp()
      });

      haptic.success();
      toast({ title: "Sceau forgé", description: "Votre essence est désormais protégée." });
      
      setTimeout(() => router.push("/home"), 1500);
    } catch (error: any) {
      console.error(error);
      if (error.name !== 'AbortError') {
        toast({ 
          variant: "destructive", 
          title: "Forge échouée", 
          description: "Impossible de créer votre Sceau. Vérifiez vos paramètres système." 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (initializing || step === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin opacity-20" />
      </div>
    );
  }

  const stepVariants = {
    enter: { opacity: 0, y: 30, scale: 0.95, filter: "blur(15px)" },
    center: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -30, scale: 0.95, filter: "blur(15px)", transition: { duration: 0.4, ease: "easeIn" } }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03),transparent_50%)]" />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg z-10">
        <div className="flex justify-center mb-10">
          <Logo className="scale-75" />
        </div>

        <div className="mb-12 flex justify-center gap-2">
          {[1, 2].map((s) => (
            <motion.div 
              key={s}
              animate={{ 
                width: step === s ? 40 : 8, 
                backgroundColor: step >= s ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.1)" 
              }}
              className="h-1.5 rounded-full transition-all duration-500" 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step-camera" variants={stepVariants} initial="enter" animate="center" exit="exit">
              <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="text-center pt-12 space-y-4">
                  <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-3xl font-black tracking-tight">Perception</CardTitle>
                    <CardDescription className="text-base font-medium opacity-60">L'accès à la caméra est requis pour l'immersion.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-4">
                  <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black/40 border border-white/5 shadow-inner">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  </div>
                </CardContent>
                <CardFooter className="pb-12 px-8">
                  <Button onClick={handleRequestCamera} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg">
                    {loading ? <Loader2 className="animate-spin" /> : "Ouvrir les yeux"}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step-biometry" variants={stepVariants} initial="enter" animate="center" exit="exit">
              <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="text-center pt-12 space-y-4">
                  <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2 relative">
                    <Fingerprint className="h-10 w-10 text-primary" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1"
                    >
                      <Sparkles className="h-5 w-5 text-primary" />
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-3xl font-black tracking-tight">Forge du Sceau</CardTitle>
                    <CardDescription className="text-base font-medium opacity-60">Sécurisez votre essence avec votre empreinte ou votre visage.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-10 pb-8 text-center">
                  <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
                    <p className="text-xs leading-relaxed font-medium opacity-60 italic">
                      "Le Sceau protège vos points de Lumière et garantit l'intégrité de vos futures conversions."
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pb-12 px-8 flex flex-col gap-4">
                  <Button onClick={handleForgeSceau} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg gap-3">
                    {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                    {loading ? "Forging..." : "Forger mon Sceau"}
                  </Button>
                  <button 
                    onClick={() => router.push("/home")}
                    className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity"
                  >
                    Plus tard
                  </button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}