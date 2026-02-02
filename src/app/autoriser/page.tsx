"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Camera, Bell, MapPin, Fingerprint, ChevronRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth, useUser } from "@/firebase";

export default function AutoriserPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();

  const handleRequestCamera = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      toast({
        title: "Caméra autorisée",
        description: "Votre vue est désormais claire.",
      });
      setTimeout(() => setStep(2), 1500);
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
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          toast({
            title: "Notifications activées",
            description: "Vous resterez connecté à l'essentiel.",
          });
        }
      }
      setStep(3);
    } catch (error) {
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLocation = async () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        toast({ title: "Position partagée", description: "Votre environnement est pris en compte." });
        setStep(4);
        setLoading(false);
      },
      () => {
        setStep(4);
        setLoading(false);
      }
    );
  };

  const handleRequestPasskey = async () => {
    setLoading(true);
    try {
      // Vérifier si la biométrie est disponible
      const available = await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        throw new Error("La biométrie n'est pas disponible ou supportée sur cet appareil.");
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = user?.uid || "anonymous";
      const userEmail = user?.email || `${userId}@citation.app`;

      const createCredentialOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Citation App",
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from(userId, c => c.charCodeAt(0)),
          name: userEmail,
          displayName: user?.displayName || "Utilisateur Citation",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({
        publicKey: createCredentialOptions,
      });

      if (credential) {
        localStorage.setItem("citation_biometric_enabled", "true");
        toast({
          title: "Sceau biométrique activé",
          description: "Votre identité est désormais liée à cet appareil.",
        });
        router.push("/random");
      }
    } catch (error: any) {
      console.error('Biometric error:', error);
      toast({
        variant: 'destructive',
        title: "Échec de l'activation",
        description: error.message || "L'authentification a été annulée ou a échoué.",
      });
      // On redirige quand même pour ne pas bloquer l'utilisateur
      setTimeout(() => router.push("/random"), 2000);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Background Ambience */}
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
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2"
                    >
                      <Camera className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Perception Visuelle</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">L'accès à la caméra permet une immersion totale dans l'univers Citation.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="px-8 pb-4">
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black/40 border border-white/5 group shadow-inner">
                      <video ref={videoRef} className="w-full h-full object-cover scale-105 transition-transform duration-700 group-hover:scale-100" autoPlay muted playsInline />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 backdrop-blur-md">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-destructive">Signal perdu</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8 flex flex-col gap-3">
                    <Button onClick={handleRequestCamera} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all group">
                      {loading ? <Loader2 className="animate-spin" /> : "Ouvrir les yeux"}
                      <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(2)} className="w-full h-12 text-muted-foreground font-bold tracking-widest text-[10px] uppercase">Passer l'étape</Button>
                  </CardFooter>
                </>
              )}

              {step === 2 && (
                <>
                  <CardHeader className="text-center pt-12 space-y-4">
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2"
                    >
                      <Bell className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Résonance</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">Recevez une notification chaque matin pour nourrir votre réflexion quotidienne.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-12 px-10">
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <motion.div 
                          key={i} 
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-5 p-5 bg-primary/[0.03] rounded-3xl border border-primary/5"
                        >
                          <div className="h-10 w-10 rounded-2xl bg-primary/10" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2 w-20 bg-primary/20 rounded-full" />
                            <div className="h-2 w-full bg-primary/10 rounded-full" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8 flex flex-col gap-3">
                    <Button onClick={handleRequestNotifications} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/10">
                      {loading ? <Loader2 className="animate-spin" /> : "Être notifié"}
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(3)} className="w-full h-12 text-muted-foreground font-bold tracking-widest text-[10px] uppercase">Plus tard</Button>
                  </CardFooter>
                </>
              )}

              {step === 3 && (
                <>
                  <CardHeader className="text-center pt-12 space-y-4">
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2"
                    >
                      <MapPin className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Ancrage</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">Nous adaptons les thèmes philosophiques selon votre fuseau horaire.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-16 flex justify-center">
                    <div className="relative h-40 w-40">
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-2 border-primary/20" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="h-12 w-12 text-primary animate-bounce" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8 flex flex-col gap-3">
                    <Button onClick={handleRequestLocation} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/10">
                      {loading ? <Loader2 className="animate-spin" /> : "Partager ma position"}
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(4)} className="w-full h-12 text-muted-foreground font-bold tracking-widest text-[10px] uppercase">Rester anonyme</Button>
                  </CardFooter>
                </>
              )}

              {step === 4 && (
                <>
                  <CardHeader className="text-center pt-12 space-y-4">
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2"
                    >
                      <Fingerprint className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-black tracking-tight">Sceau Final</CardTitle>
                      <CardDescription className="text-base font-medium opacity-60 px-4">Sécurisez votre identité de plume avec votre empreinte numérique.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-12 px-8">
                    <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="h-12 w-12" /></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3">Sécurité Biométrique</p>
                      <p className="text-sm font-semibold leading-relaxed">Activez Face ID, Fingerprint ou Windows Hello pour une connexion instantanée et sécurisée.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-12 px-8 flex flex-col gap-3">
                    <Button onClick={handleRequestPasskey} disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg shadow-2xl shadow-primary/20 bg-primary text-primary-foreground">
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <Fingerprint className="mr-3 h-6 w-6" />}
                      {loading ? "Authentification..." : "Activer la Biométrie"}
                    </Button>
                    <Button variant="ghost" onClick={() => router.push("/random")} className="w-full h-12 text-muted-foreground font-bold tracking-widest text-[10px] uppercase">Finir plus tard</Button>
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