"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Camera, Bell, MapPin, Fingerprint, ChevronRight, CheckCircle, Loader2 } from "lucide-react";

export default function AutoriserPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { toast } = useToast();

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
        description: 'Veuillez activer la caméra dans les réglages de votre navigateur.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNotifications = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast({
          title: "Notifications activées",
          description: "Vous resterez connecté à l'essentiel.",
        });
        setStep(3);
      } else {
        throw new Error("Permission denied");
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Action requise',
        description: "Les notifications sont nécessaires pour l'expérience complète.",
      });
      setStep(3); // On passe quand même pour la démo
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLocation = async () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast({
          title: "Localisation partagée",
          description: "Votre position dans l'univers est connue.",
        });
        setStep(4);
        setLoading(false);
      },
      (error) => {
        toast({
          variant: 'destructive',
          title: 'Localisation refusée',
          description: "La personnalisation géographique sera limitée.",
        });
        setStep(4);
        setLoading(false);
      }
    );
  };

  const handleRequestPasskey = async () => {
    setLoading(true);
    // Simulation d'une création de Passkey (WebAuthn)
    // En production, cela nécessite un challenge serveur
    try {
      // Simulation d'un délai pour l'interaction utilisateur
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Clé biométrique créée",
        description: "Votre accès est désormais unique et sécurisé.",
      });
      router.push("/random");
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur biométrique',
        description: "Impossible de créer la clé pour le moment.",
      });
      router.push("/random");
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    enter: { opacity: 0, y: 20, filter: "blur(10px)" },
    center: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -20, filter: "blur(10px)" }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg z-10"
      >
        <div className="flex justify-center mb-12">
          <Logo className="scale-75" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-3xl overflow-hidden">
              {step === 1 && (
                <>
                  <CardHeader className="text-center pt-10">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Ouvrez les yeux</CardTitle>
                    <CardDescription className="text-base px-4">L'accès à la caméra permet une immersion visuelle et la capture d'instants de pensée.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex flex-col items-center">
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/20 border border-primary/5">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 backdrop-blur-sm p-4 text-center">
                          <p className="text-xs font-bold uppercase tracking-widest text-destructive">Caméra désactivée</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pb-10 px-8 flex flex-col gap-4">
                    <Button onClick={handleRequestCamera} disabled={loading} className="w-full h-14 rounded-2xl font-bold text-lg group">
                      {loading ? <Loader2 className="animate-spin" /> : "Autoriser la vue"}
                      <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(2)} className="w-full text-muted-foreground font-medium">Plus tard</Button>
                  </CardFooter>
                </>
              )}

              {step === 2 && (
                <>
                  <CardHeader className="text-center pt-10">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Bell className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Restez connecté</CardTitle>
                    <CardDescription className="text-base px-4">Recevez une notification chaque matin pour nourrir votre réflexion quotidienne.</CardDescription>
                  </CardHeader>
                  <CardContent className="py-8">
                    <div className="flex flex-col gap-3">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/5 animate-pulse">
                          <div className="h-8 w-8 rounded-full bg-primary/20" />
                          <div className="flex-1 space-y-2">
                            <div className="h-2 w-24 bg-primary/20 rounded" />
                            <div className="h-2 w-full bg-primary/10 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pb-10 px-8 flex flex-col gap-4">
                    <Button onClick={handleRequestNotifications} disabled={loading} className="w-full h-14 rounded-2xl font-bold text-lg">
                      {loading ? <Loader2 className="animate-spin" /> : "Activer les notifications"}
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(3)} className="w-full text-muted-foreground font-medium">Ignorer</Button>
                  </CardFooter>
                </>
              )}

              {step === 3 && (
                <>
                  <CardHeader className="text-center pt-10">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <MapPin className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Position Géosophique</CardTitle>
                    <CardDescription className="text-base px-4">Nous adaptons les thèmes philosophiques selon votre environnement et fuseau horaire.</CardDescription>
                  </CardHeader>
                  <CardContent className="py-10 flex justify-center">
                    <div className="relative h-40 w-40">
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                      <div className="absolute inset-4 rounded-full border border-primary/40 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="h-10 w-10 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-10 px-8 flex flex-col gap-4">
                    <Button onClick={handleRequestLocation} disabled={loading} className="w-full h-14 rounded-2xl font-bold text-lg">
                      {loading ? <Loader2 className="animate-spin" /> : "Partager ma position"}
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(4)} className="w-full text-muted-foreground font-medium">Rester anonyme</Button>
                  </CardFooter>
                </>
              )}

              {step === 4 && (
                <>
                  <CardHeader className="text-center pt-10">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Fingerprint className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Sceau Biométrique</CardTitle>
                    <CardDescription className="text-base px-4">Sécurisez votre compte et vos favoris avec FaceID ou votre empreinte digitale.</CardDescription>
                  </CardHeader>
                  <CardContent className="py-12">
                    <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 text-center">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-2">Technologie Passkey</p>
                      <p className="text-sm font-medium">Remplacez vos mots de passe par une sécurité invisible et infaillible.</p>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-10 px-8 flex flex-col gap-4">
                    <Button onClick={handleRequestPasskey} disabled={loading} className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20">
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <Fingerprint className="mr-2 h-5 w-5" />}
                      {loading ? "Création..." : "Créer ma Passkey"}
                    </Button>
                    <Button variant="ghost" onClick={() => router.push("/random")} className="w-full text-muted-foreground font-medium">Plus tard</Button>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex justify-center gap-1.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-primary' : 'w-2 bg-primary/20'}`} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
