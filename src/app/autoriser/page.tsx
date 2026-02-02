
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Camera, Bell, MapPin, Fingerprint, ChevronRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth, useUser, useFirestore, useFirebaseApp } from "@/firebase";
import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc, serverTimestamp, getDoc, DocumentData } from "firebase/firestore";

const VAPID_KEY = "BObUKqFfm64Lm6SdchRcx9JQinmdU826lgSXhTvGkjMlLEmMxF9ijrABI5YSJTAqXmzLpbFNgGDhjdbjlnt2c5k";

export default function AutoriserPage() {
  const [step, setStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const app = useFirebaseApp();

  const determineNextStep = (data: DocumentData | undefined) => {
    if (!data) return 1;
    if (!data.cameraAuthorized) return 1;
    if (!data.notificationsEnabled) return 2;
    if (!data.locationAuthorized) return 3;
    const isBiometricDone = data.biometricEnabled === true || localStorage.getItem("citation_biometric_enabled") === "true";
    if (!isBiometricDone) return 4;
    return 5;
  };

  useEffect(() => {
    const detectStartStep = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        const nextStep = determineNextStep(data);
        
        if (nextStep === 5) {
          router.push("/random");
        } else {
          setStep(nextStep);
        }
      } catch (error) {
        console.error("Error detecting permissions:", error);
        setStep(1);
      } finally {
        setInitializing(false);
      }
    };
    detectStartStep();
  }, [user, db, router]);

  const refreshUserDataAndStep = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const nextStep = determineNextStep(userDoc.data());
    if (nextStep === 5) {
      router.push("/random");
    } else {
      setStep(nextStep);
    }
  };

  const handleRequestCamera = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          cameraAuthorized: true,
          updatedAt: serverTimestamp()
        });
      }

      toast({
        title: "Caméra autorisée",
        description: "Votre vue est désormais claire.",
      });
      setTimeout(() => refreshUserDataAndStep(), 1500);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Accès refusé',
        description: 'Veuillez activer la caméra dans les réglages.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNotifications = async () => {
    setLoading(true);
    try {
      if (!('Notification' in window)) {
        throw new Error("Les notifications ne sont pas supportées.");
      }

      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        try {
          const messaging = getMessaging(app);
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          
          if (user) {
            await updateDoc(doc(db, "users", user.uid), {
              fcmToken: token || null,
              notificationsEnabled: true,
              updatedAt: serverTimestamp()
            });
          }
        } catch (fcmError) {
          console.error("FCM Token error:", fcmError);
          if (user) await updateDoc(doc(db, "users", user.uid), { notificationsEnabled: true });
        }
        toast({ title: "Notifications activées", description: "Le lien est établi." });
      } else {
        if (user) await updateDoc(doc(db, "users", user.uid), { notificationsEnabled: true });
      }
      refreshUserDataAndStep();
    } catch (error: any) {
      console.error("Notification error:", error);
      refreshUserDataAndStep();
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLocation = async () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async () => {
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            locationAuthorized: true,
            updatedAt: serverTimestamp()
          });
        }
        toast({ title: "Position partagée", description: "Ancrage réussi." });
        refreshUserDataAndStep();
        setLoading(false);
      },
      async () => {
        toast({ variant: "destructive", title: "Localisation refusée", description: "Certaines fonctions seront limitées." });
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            locationAuthorized: true,
            updatedAt: serverTimestamp()
          });
        }
        refreshUserDataAndStep();
        setLoading(false);
      }
    );
  };

  const handleRequestPasskey = async () => {
    setLoading(true);
    try {
      const available = await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        toast({ title: "Non supporté", description: "Votre appareil ne supporte pas la biométrie Web." });
        router.push("/random");
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = user?.uid || "anonymous";
      const userEmail = user?.email || `${userId}@citation.app`;

      const createCredentialOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "Citation", id: window.location.hostname },
        user: {
          id: Uint8Array.from(userId, c => c.charCodeAt(0)),
          name: userEmail,
          displayName: user?.displayName || "Plume Citation",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({ publicKey: createCredentialOptions });

      if (credential) {
        localStorage.setItem("citation_biometric_enabled", "true");
        if (user) {
          await updateDoc(doc(db, "users", user.uid), { 
            biometricEnabled: true,
            updatedAt: serverTimestamp() 
          });
        }
        toast({ title: "Sceau biométrique activé", description: "Identité sécurisée avec succès." });
        router.push("/random");
      }
    } catch (error: any) {
      console.error('Biometric creation error:', error);
      toast({ title: "Étape ignorée", description: "La biométrie pourra être activée plus tard dans vos réglages." });
      router.push("/random");
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
    center: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    },
    exit: { 
      opacity: 0, 
      y: -30, 
      scale: 0.95, 
      filter: "blur(15px)",
      transition: { duration: 0.4, ease: "easeIn" }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03),transparent_50%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg z-10"
      >
        <div className="flex justify-center mb-16">
          <Logo className="scale-75" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-card/40 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
              {step === 1 && (
                <>
                  <CardHeader className="text-center pt-12 space-y-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2">
                      <Camera className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Perception</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">L'accès à la caméra est requis pour l'expérience immersive.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-8 pb-4">
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black/40 border border-white/5 group shadow-inner">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8">
                    <Button onClick={handleRequestCamera} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg">
                      {loading ? <Loader2 className="animate-spin" /> : "Ouvrir les yeux"}
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </CardFooter>
                </>
              )}

              {step === 2 && (
                <>
                  <CardHeader className="text-center pt-12 space-y-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2">
                      <Bell className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Résonance</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">Recevez une pensée choisie chaque matin pour nourrir votre esprit.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-12 px-10">
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-5 p-5 bg-primary/[0.03] rounded-3xl border border-primary/5">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2 w-20 bg-primary/20 rounded-full" />
                            <div className="h-2 w-full bg-primary/10 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8">
                    <Button onClick={handleRequestNotifications} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg">
                      {loading ? <Loader2 className="animate-spin" /> : "Être notifié"}
                    </Button>
                  </CardFooter>
                </>
              )}

              {step === 3 && (
                <>
                  <CardHeader className="text-center pt-12 space-y-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2">
                      <MapPin className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Ancrage</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">Nous adaptons les thèmes philosophiques selon votre environnement.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-16 flex justify-center">
                    <div className="relative h-40 w-40">
                      <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 rounded-full border-2 border-primary/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="h-12 w-12 text-primary animate-bounce" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8">
                    <Button onClick={handleRequestLocation} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg">
                      {loading ? <Loader2 className="animate-spin" /> : "Partager ma position"}
                    </Button>
                  </CardFooter>
                </>
              )}

              {step === 4 && (
                <>
                  <CardHeader className="text-center pt-12 space-y-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2">
                      <Fingerprint className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Sceau Final</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">Sécurisez votre identité avec votre biométrie (Passkey).</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-12 px-8">
                    <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 text-center relative overflow-hidden">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3">Passkey WebAuthn</p>
                      <p className="text-sm font-semibold leading-relaxed">Utilisez Face ID, votre empreinte ou le code de votre appareil pour un accès instantané et sécurisé.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8 flex flex-col gap-3">
                    <Button onClick={handleRequestPasskey} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg bg-primary text-primary-foreground">
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <Fingerprint className="mr-3 h-6 w-6" />}
                      Créer ma Passkey
                    </Button>
                    <Button variant="ghost" onClick={() => router.push("/random")} className="w-full h-12 text-muted-foreground font-bold tracking-widest text-[10px] uppercase">Passer cette étape</Button>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex justify-center gap-3">
          {[1, 2, 3, 4].map(i => (
            <motion.div 
              key={i} 
              animate={{ 
                width: step === i ? 40 : 10,
                backgroundColor: step === i ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.1)"
              }}
              className="h-1.5 rounded-full transition-all duration-500" 
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
