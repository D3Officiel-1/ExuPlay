"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
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
import { Logo } from "@/components/Logo";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, User as UserIcon, ShieldCheck, Sparkles, XCircle, CheckCircle, Users } from "lucide-react";
import placeholderImages from "@/app/lib/placeholder-images.json";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  
  const [formData, setFormData] = useState({
    username: "",
    gender: "",
    countryCode: "+225",
    phoneNumber: "",
    acceptedTerms: false,
  });
  
  const router = useRouter();
  const db = useFirestore();
  const auth = getAuth(useFirebaseApp());
  const { toast } = useToast();

  const waveIcon = placeholderImages.placeholderImages.find(img => img.id === "wave-icon")?.imageUrl;
  const civFlag = placeholderImages.placeholderImages.find(img => img.id === "flag-civ")?.imageUrl;

  useEffect(() => {
    if (step !== 1) return;
    
    const checkUsername = async () => {
      const name = formData.username.trim().toLowerCase();
      
      if (name.length < 3) {
        setUsernameStatus(name.length > 0 ? 'invalid' : 'idle');
        return;
      }

      setCheckingUsername(true);
      try {
        const q = query(collection(db, "users"), where("username", "==", name));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username, db, step]);

  const isValidPhoneNumber = (num: string) => {
    if (num.length !== 10) return false;
    const validPrefixes = ["01", "05", "07"];
    return validPrefixes.some(prefix => num.startsWith(prefix));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (usernameStatus !== 'available') {
        toast({
          variant: "destructive",
          title: "Action requise",
          description: usernameStatus === 'taken' 
            ? "Ce nom d'utilisateur est déjà utilisé." 
            : "Veuillez choisir un nom valide (min. 3 caractères).",
        });
        return;
      }
    }

    if (step === 2) {
      if (!formData.gender) {
        toast({
          variant: "destructive",
          title: "Action requise",
          description: "Veuillez sélectionner votre genre.",
        });
        return;
      }
    }

    if (step === 3) {
      if (!isValidPhoneNumber(formData.phoneNumber)) {
        toast({
          variant: "destructive",
          title: "Numéro invalide",
          description: "Le numéro doit comporter 10 chiffres et commencer par 01, 05 ou 07.",
        });
        return;
      }
    }

    if (step === 4 && !formData.acceptedTerms) {
      toast({
        variant: "destructive",
        title: "Action requise",
        description: "Vous devez accepter les conditions pour rejoindre l'expérience.",
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

      const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;

      await setDoc(doc(db, "users", user.uid), {
        username: formData.username.toLowerCase().trim(),
        gender: formData.gender,
        phoneNumber: fullPhoneNumber,
        acceptedTerms: formData.acceptedTerms,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Bienvenue dans Citation",
        description: "Votre profil a été créé avec succès.",
      });
      
      router.push("/autoriser");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Échec de l'inscription",
        description: "Une erreur inattendue est survenue. Veuillez réessayer.",
      });
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      filter: "blur(10px)",
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
        filter: { duration: 0.4 }
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      filter: "blur(10px)",
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
        filter: { duration: 0.4 }
      }
    })
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 sm:px-6 py-8 sm:py-12 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg z-10"
      >
        <div className="flex flex-col items-center mb-6 sm:mb-10">
          <Logo className="mb-2 sm:mb-4 scale-75" />
          <p className="text-muted-foreground text-[8px] sm:text-[10px] font-bold tracking-[0.4em] uppercase opacity-40">
            L'excellence de la pensée
          </p>
        </div>

        <div className="flex justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <motion.div
              key={s}
              initial={false}
              animate={{
                width: step === s ? 32 : 8,
                backgroundColor: step >= s ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.1)"
              }}
              className="h-1.5 rounded-full transition-colors duration-500"
            />
          ))}
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" custom={step}>
            <motion.div
              key={step}
              custom={step}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(255,255,255,0.05)] bg-card/40 backdrop-blur-2xl">
                {step === 1 && (
                  <>
                    <CardHeader className="pt-6 sm:pt-8 px-5 sm:px-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-primary">
                        <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Identité numérique</span>
                      </div>
                      <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Comment devons-nous vous appeler ?</CardTitle>
                      <CardDescription className="text-sm sm:text-base">Choisissez un pseudonyme unique qui signera vos futures contributions.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="username" className="text-[10px] uppercase tracking-widest opacity-70">Nom d'utilisateur</Label>
                          <div className="relative">
                            <Input 
                              id="username" 
                              placeholder="ex: aristote_moderne" 
                              value={formData.username}
                              onChange={(e) => setFormData({...formData, username: e.target.value.replace(/\s/g, '').toLowerCase()})}
                              className="h-12 sm:h-14 bg-background/50 border-primary/10 focus:border-primary transition-all text-base sm:text-lg pl-4 sm:pl-5 pr-10 sm:pr-12"
                            />
                            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                              {checkingUsername ? (
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  {usernameStatus === 'available' && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
                                  {usernameStatus === 'taken' && <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />}
                                  {usernameStatus === 'invalid' && <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-300" />}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 min-h-[16px]">
                          <AnimatePresence mode="wait">
                            {usernameStatus === 'available' && (
                              <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[9px] sm:text-[10px] font-bold text-green-500 uppercase tracking-widest">
                                Ce nom est libre pour vous
                              </motion.span>
                            )}
                            {usernameStatus === 'taken' && (
                              <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[9px] sm:text-[10px] font-bold text-red-500 uppercase tracking-widest">
                                Déjà réservé par un autre esprit
                              </motion.span>
                            )}
                            {usernameStatus === 'invalid' && (
                              <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[9px] sm:text-[10px] font-bold text-red-300 uppercase tracking-widest">
                                Minimum 3 caractères
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="px-5 sm:px-8 pb-6 sm:pb-8">
                      <Button 
                        onClick={handleNextStep} 
                        className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold rounded-xl" 
                        disabled={usernameStatus !== 'available' || checkingUsername}
                      >
                        Continuer
                        <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </CardFooter>
                  </>
                )}

                {step === 2 && (
                  <>
                    <CardHeader className="pt-6 sm:pt-8 px-5 sm:px-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-primary">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Nature de l'esprit</span>
                      </div>
                      <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Quel est votre genre ?</CardTitle>
                      <CardDescription className="text-sm sm:text-base">Cette information nous aide à personnaliser votre expérience.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8">
                      <RadioGroup 
                        value={formData.gender} 
                        onValueChange={(val) => setFormData({...formData, gender: val})}
                        className="grid grid-cols-1 gap-3 sm:gap-4"
                      >
                        {[
                          { id: "masculin", label: "Homme" },
                          { id: "féminin", label: "Femme" },
                          { id: "non-binaire", label: "Non-binaire / Autre" }
                        ].map((option) => (
                          <div key={option.id}>
                            <RadioGroupItem
                              value={option.id}
                              id={option.id}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={option.id}
                              className="flex flex-1 items-center justify-between rounded-xl border-2 border-muted bg-background/50 p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                            >
                              <span className="text-sm sm:text-base font-bold">{option.label}</span>
                              <div className="h-2 w-2 rounded-full bg-primary opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity" />
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                    <CardFooter className="px-5 sm:px-8 pb-6 sm:pb-8 flex gap-3 sm:gap-4">
                      <Button variant="ghost" onClick={handleBackStep} className="h-12 sm:h-14 flex-1 font-bold rounded-xl text-sm sm:text-base">
                        <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Retour
                      </Button>
                      <Button 
                        onClick={handleNextStep} 
                        className="h-12 sm:h-14 flex-1 font-bold rounded-xl text-sm sm:text-base"
                        disabled={!formData.gender}
                      >
                        Suivant <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </CardFooter>
                  </>
                )}

                {step === 3 && (
                  <>
                    <CardHeader className="pt-6 sm:pt-8 px-5 sm:px-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-primary">
                        <div className="relative h-5 w-5 sm:h-6 sm:w-6 rounded-full overflow-hidden border border-primary/20">
                          {waveIcon && <Image 
                            src={waveIcon} 
                            alt="Wave Icon"
                            fill
                            className="object-cover"
                          />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Contact Wave</span>
                      </div>
                      <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Liez votre compte Wave</CardTitle>
                      <CardDescription className="text-sm sm:text-base">Numéro ivoirien valide à 10 chiffres (01, 05 ou 07).</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8">
                      <div className="space-y-3 sm:space-y-4">
                        <Label htmlFor="phone" className="text-[10px] uppercase tracking-widest opacity-70">Numéro de téléphone</Label>
                        <div className="flex gap-2 sm:gap-3">
                          <div className="relative w-[90px] sm:w-[120px]">
                            <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-6 sm:w-8 rounded overflow-hidden shadow-sm">
                              {civFlag && <Image src={civFlag} alt="CIV Flag" fill className="object-cover" />}
                            </div>
                            <Input 
                              readOnly
                              value={formData.countryCode}
                              className="h-12 sm:h-14 bg-muted/50 border-primary/10 text-sm sm:text-lg pl-10 sm:pl-14 pr-1 sm:pr-2 font-bold cursor-not-allowed opacity-80"
                            />
                          </div>
                          <div className="flex-1">
                            <Input 
                              id="phone" 
                              type="tel"
                              placeholder="07..." 
                              value={formData.phoneNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setFormData({...formData, phoneNumber: val});
                              }}
                              className="h-12 sm:h-14 bg-background/50 border-primary/10 focus:border-primary transition-all text-base sm:text-lg pl-4 sm:pl-5"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {formData.phoneNumber.length > 0 && !isValidPhoneNumber(formData.phoneNumber) && (
                            <p className="text-[8px] sm:text-[10px] text-red-400 font-bold uppercase tracking-widest">
                              Format invalide
                            </p>
                          )}
                          {isValidPhoneNumber(formData.phoneNumber) && (
                            <p className="text-[8px] sm:text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Numéro valide
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="px-5 sm:px-8 pb-6 sm:pb-8 flex gap-3 sm:gap-4">
                      <Button variant="ghost" onClick={handleBackStep} className="h-12 sm:h-14 flex-1 font-bold rounded-xl text-sm sm:text-base">
                        <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Retour
                      </Button>
                      <Button 
                        onClick={handleNextStep} 
                        className="h-12 sm:h-14 flex-1 font-bold rounded-xl text-sm sm:text-base"
                        disabled={!isValidPhoneNumber(formData.phoneNumber)}
                      >
                        Suivant <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </CardFooter>
                  </>
                )}

                {step === 4 && (
                  <>
                    <CardHeader className="pt-6 sm:pt-8 px-5 sm:px-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-primary">
                        <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Légalité & Éthique</span>
                      </div>
                      <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Engagement de l'esprit</CardTitle>
                      <CardDescription className="text-sm sm:text-base">Respectez notre charte éthique.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8 space-y-4 sm:space-y-6">
                      <div className="p-3 sm:p-5 bg-muted/40 rounded-2xl text-xs sm:text-sm leading-relaxed max-h-32 sm:max-h-48 overflow-y-auto border border-primary/5">
                        <p className="mb-2 sm:mb-4"><strong>Article 1 :</strong> Espace de respect mutuel.</p>
                        <p className="mb-2 sm:mb-4"><strong>Article 2 :</strong> Données cryptées.</p>
                        <p><strong>Article 3 :</strong> Tout abus entraînera une suspension.</p>
                      </div>
                      <div className="flex items-center space-x-3 p-3 sm:p-4 bg-primary/5 rounded-xl border border-primary/10 transition-all hover:bg-primary/10 cursor-pointer" onClick={() => setFormData({...formData, acceptedTerms: !formData.acceptedTerms})}>
                        <Checkbox 
                          id="terms" 
                          checked={formData.acceptedTerms} 
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Label htmlFor="terms" className="text-xs sm:text-sm font-medium cursor-pointer">
                          J'accepte les conditions d'utilisation
                        </Label>
                      </div>
                    </CardContent>
                    <CardFooter className="px-5 sm:px-8 pb-6 sm:pb-8 flex gap-3 sm:gap-4">
                      <Button variant="ghost" onClick={handleBackStep} className="h-12 sm:h-14 flex-1 font-bold rounded-xl text-sm sm:text-base">
                        <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Retour
                      </Button>
                      <Button onClick={handleNextStep} className="h-12 sm:h-14 flex-1 font-bold rounded-xl text-sm sm:text-base" disabled={!formData.acceptedTerms}>
                        Accepter <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </CardFooter>
                  </>
                )}

                {step === 5 && (
                  <>
                    <CardHeader className="pt-6 sm:pt-8 px-5 sm:px-8">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-primary">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Confirmation</span>
                      </div>
                      <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Prêt pour l'aventure ?</CardTitle>
                      <CardDescription className="text-sm sm:text-base">Vérifiez vos informations.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8">
                      <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 bg-muted/30 rounded-2xl border border-primary/5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40">Nom de plume</span>
                          <span className="text-lg sm:text-xl font-bold">@{formData.username}</span>
                        </div>
                        <div className="h-px bg-primary/5 w-full" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40">Genre</span>
                          <span className="text-lg sm:text-xl font-bold capitalize">{formData.gender}</span>
                        </div>
                        <div className="h-px bg-primary/5 w-full" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40">Liaison Wave</span>
                          <span className="text-lg sm:text-xl font-bold">{formData.countryCode} {formData.phoneNumber}</span>
                        </div>
                        <div className="h-px bg-primary/5 w-full" />
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">Status : Prêt</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="px-5 sm:px-8 pb-6 sm:pb-8 flex gap-3 sm:gap-4">
                      <Button variant="ghost" onClick={handleBackStep} className="h-12 sm:h-14 flex-1 font-bold rounded-xl text-sm sm:text-base" disabled={loading}>
                        Modifier
                      </Button>
                      <Button onClick={handleRegister} className="h-12 sm:h-14 flex-1 font-bold rounded-xl shadow-lg shadow-primary/20 text-sm sm:text-base" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mr-2" /> : "S'inscrire"}
                        {!loading && <Sparkles className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />}
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1, duration: 1 }}
        className="mt-8 sm:mt-12 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-center"
      >
        Mise à jour v2.0 • L'art de la pensée
      </motion.p>
    </div>
  );
}
