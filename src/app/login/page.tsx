
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { useFirebaseApp, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, Phone, User as UserIcon, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    phoneNumber: "",
    acceptedTerms: false,
  });
  
  const router = useRouter();
  const db = useFirestore();
  const auth = getAuth(useFirebaseApp());
  const { toast } = useToast();

  const handleNextStep = async () => {
    if (step === 1) {
      if (!formData.username || formData.username.length < 3) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le nom d'utilisateur doit faire au moins 3 caractères.",
        });
        return;
      }
      
      setLoading(true);
      try {
        const q = query(collection(db, "users"), where("username", "==", formData.username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast({
            variant: "destructive",
            title: "Indisponible",
            description: "Ce nom d'utilisateur est déjà utilisé.",
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error checking username:", error);
      }
      setLoading(false);
    }

    if (step === 2 && !formData.phoneNumber) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez fournir un numéro de téléphone valide.",
      });
      return;
    }

    if (step === 3 && !formData.acceptedTerms) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez accepter les conditions d'utilisation.",
      });
      return;
    }

    setStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    setStep(prev => prev - 1);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        username: formData.username,
        phoneNumber: formData.phoneNumber,
        acceptedTerms: formData.acceptedTerms,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Succès !",
        description: "Votre compte Citation a été créé.",
      });
      
      router.push("/random");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: "Une erreur est survenue lors de la création de votre compte.",
      });
    } finally {
      setLoading(false);
    }
  };

  const stepsVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tighter uppercase"
          >
            Citation<span className="text-foreground/20">.</span>
          </motion.h1>
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                className={`h-1 w-8 rounded-full transition-colors duration-500 ${step >= s ? "bg-foreground" : "bg-foreground/10"}`} 
              />
            ))}
          </div>
        </div>

        <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" {...stepsVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" /> Identité
                  </CardTitle>
                  <CardDescription>Choisissez un nom d'utilisateur unique pour votre expérience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input 
                      id="username" 
                      placeholder="ex: socrate_99" 
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().trim()})}
                      className="bg-background/50"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleNextStep} className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : "Vérifier la disponibilité"}
                    {!loading && <ChevronRight className="ml-2 h-4 w-4" />}
                  </Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" {...stepsVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" /> Contact Wave
                  </CardTitle>
                  <CardDescription>Votre numéro de téléphone pour les interactions Wave.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="77 000 00 00" 
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      className="bg-background/50"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-4">
                  <Button variant="outline" onClick={handleBackStep} className="flex-1">
                    Retour
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1">
                    Suivant <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" {...stepsVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Légalité
                  </CardTitle>
                  <CardDescription>Veuillez accepter nos conditions d'utilisation pour continuer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg text-xs leading-relaxed max-h-40 overflow-y-auto">
                    En utilisant Citation, vous acceptez de respecter nos règles de conduite. Nous protégeons vos données personnelles et ne les partageons jamais avec des tiers. Citation est un espace de réflexion et de partage.
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={formData.acceptedTerms} 
                      onCheckedChange={(checked) => setFormData({...formData, acceptedTerms: !!checked})}
                    />
                    <Label htmlFor="terms" className="text-sm font-normal">
                      J'accepte les conditions d'utilisation
                    </Label>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-4">
                  <Button variant="outline" onClick={handleBackStep} className="flex-1">
                    Retour
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1">
                    Suivant <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" {...stepsVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Récapitulatif
                  </CardTitle>
                  <CardDescription>Vérifiez vos informations avant de commencer l'aventure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilisateur</span>
                      <span className="font-medium">@{formData.username}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Téléphone (Wave)</span>
                      <span className="font-medium">{formData.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Méthode</span>
                      <span className="font-medium text-xs bg-foreground/10 px-2 py-0.5 rounded">Invité</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-4">
                  <Button variant="outline" onClick={handleBackStep} className="flex-1" disabled={loading}>
                    Retour
                  </Button>
                  <Button onClick={handleRegister} className="flex-1" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    S'inscrire
                  </Button>
                </CardFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
