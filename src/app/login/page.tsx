
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  limit
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { useFirebaseApp, useFirestore, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Loader2, User as UserIcon, ShieldCheck, XCircle, CheckCircle, Users, Gift, Sparkles, Mars, Venus } from "lucide-react";
import placeholderImages from "@/app/lib/placeholder-images.json";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

const generateReferralCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

function LoginContent() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [hasReferral, setHasReferral] = useState(false);
  const [isMagicReferral, setIsMagicReferral] = useState(false);
  const [checkingReferral, setCheckingReferral] = useState(false);
  const [referralStatus, setReferralStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  
  const [formData, setFormData] = useState({
    username: "",
    gender: "",
    countryCode: "+225",
    phoneNumber: "",
    acceptedTerms: false,
    referredBy: "",
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const auth = getAuth(useFirebaseApp());
  const { user, isLoading: isAuthLoading } = useUser();
  const { toast } = useToast();

  const waveIcon = placeholderImages.placeholderImages.find(img => img.id === "wave-icon")?.imageUrl;
  const civFlag = placeholderImages.placeholderImages.find(img => img.id === "flag-civ")?.imageUrl;

  // Détection du lien magique
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && refCode.length === 6) {
      setFormData(prev => ({ ...prev, referredBy: refCode.toUpperCase() }));
      setHasReferral(true);
      setIsMagicReferral(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

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
        const q = query(collection(db, "users"), where("username", "==", name), limit(1));
        const querySnapshot = await getDocs(q);
        setUsernameStatus(querySnapshot.empty ? 'available' : 'taken');
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setCheckingUsername(false);
      }
    };
    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username, db, step]);

  useEffect(() => {
    const code = formData.referredBy.trim().toUpperCase();
    if (code.length !== 6) {
      setReferralStatus('idle');
      return;
    }
    const checkReferral = async () => {
      setCheckingReferral(true);
      try {
        const q = query(collection(db, "users"), where("referralCode", "==", code), limit(1));
        const querySnapshot = await getDocs(q);
        const isValid = !querySnapshot.empty;
        setReferralStatus(isValid ? 'valid' : 'invalid');
      } catch (error) {
        console.error("Error checking referral:", error);
      } finally {
        setCheckingReferral(false);
      }
    };
    const timeoutId = setTimeout(checkReferral, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.referredBy, db, isMagicReferral, step]);

  const isValidPhoneNumber = (num: string) => {
    if (num.length !== 10) return false;
    const validPrefixes = ["01", "05", "07"];
    return validPrefixes.some(prefix => num.startsWith(prefix));
  };

  const handleNextStep = () => {
    if (step === 1 && usernameStatus !== 'available') return;
    if (step === 2 && !formData.gender) return;
    if (step === 3 && !isValidPhoneNumber(formData.phoneNumber)) return;
    if (step === 4) {
      if (!formData.acceptedTerms) return;
      if (isMagicReferral && referralStatus === 'valid') {
        setStep(6);
        return;
      }
    }
    if (step === 5 && hasReferral && referralStatus !== 'valid') return;
    setStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    if (step === 6 && isMagicReferral && referralStatus === 'valid') {
      setStep(4);
      return;
    }
    setStep(prev => prev - 1);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;
      const myReferralCode = generateReferralCode();

      await setDoc(doc(db, "users", user.uid), {
        username: formData.username.toLowerCase().trim(),
        gender: formData.gender,
        phoneNumber: fullPhoneNumber,
        acceptedTerms: formData.acceptedTerms,
        referredBy: (hasReferral && referralStatus === 'valid') ? formData.referredBy.toUpperCase().trim() : null,
        referralCode: myReferralCode,
        role: "user",
        cameraAuthorized: false,
        notificationsEnabled: false,
        locationAuthorized: false,
        biometricEnabled: false,
        createdAt: serverTimestamp(),
        totalPoints: 0
      });

      toast({ title: "Bienvenue", description: "Votre compte est prêt." });
      router.push("/autoriser");
    } catch (error) {
      console.error("Registration error:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Inscription impossible." });
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0, filter: "blur(10px)" }),
    center: { zIndex: 1, x: 0, opacity: 1, filter: "blur(0px)", transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.4 } } },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0, filter: "blur(10px)", transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.4 } })
  };

  if (isAuthLoading) return null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 py-8 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg z-10">
        <div className="flex flex-col items-center mb-10">
          <Logo className="scale-75" />
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <motion.div 
              key={s} 
              animate={{ 
                width: step === s ? 32 : 8, 
                backgroundColor: step >= s ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.1)",
                opacity: (s === 5 && isMagicReferral && referralStatus === 'valid') ? 0.2 : 1
              }} 
              className="h-1.5 rounded-full transition-all duration-500" 
            />
          ))}
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" custom={step}>
            <motion.div key={step} custom={step} variants={stepVariants} initial="enter" animate="center" exit="exit" className="w-full">
              <Card className="border-none shadow-2xl bg-card/40 backdrop-blur-2xl">
                {step === 1 && (
                  <>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3 mb-2 text-primary">
                        <UserIcon className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Identité</span>
                      </div>
                      <CardTitle className="text-2xl">Votre nom de plume</CardTitle>
                      <CardDescription>Choisissez un pseudonyme unique.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="relative">
                          <Input 
                            placeholder="ex: aristote" 
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value.replace(/\s/g, '').toLowerCase()})}
                            className="h-14 bg-background/50 pl-5 pr-12"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {checkingUsername ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                              <>
                                {usernameStatus === 'available' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {usernameStatus === 'taken' && <XCircle className="h-5 w-5 text-red-500" />}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-6">
                      <Button onClick={handleNextStep} className="w-full h-14 font-bold" disabled={usernameStatus !== 'available' || checkingUsername}>Continuer</Button>
                    </CardFooter>
                  </>
                )}

                {step === 2 && (
                  <>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3 mb-2 text-primary">
                        <Users className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Nature</span>
                      </div>
                      <CardTitle className="text-2xl">Quel est votre genre ?</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <RadioGroup value={formData.gender} onValueChange={(val) => setFormData({...formData, gender: val})} className="grid grid-cols-2 gap-4">
                        {[
                          { id: "masculin", label: "Homme", icon: Mars },
                          { id: "féminin", label: "Femme", icon: Venus }
                        ].map((option) => {
                          const Icon = option.icon;
                          return (
                            <div key={option.id}>
                              <RadioGroupItem value={option.id} id={option.id} className="peer sr-only" />
                              <Label htmlFor={option.id} className="flex flex-col items-center justify-center rounded-2xl border-2 border-muted bg-background/50 p-6 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer font-bold text-base h-32 group">
                                <Icon className="h-8 w-8 mb-3 opacity-40 group-hover:opacity-100 transition-opacity peer-data-[state=checked]:opacity-100" />
                                {option.label}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </CardContent>
                    <CardFooter className="flex gap-4 p-6">
                      <Button variant="ghost" onClick={handleBackStep} className="h-14 flex-1">Retour</Button>
                      <Button onClick={handleNextStep} className="h-14 flex-1" disabled={!formData.gender}>Suivant</Button>
                    </CardFooter>
                  </>
                )}

                {step === 3 && (
                  <>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3 mb-2 text-primary">
                        <div className="relative h-6 w-6 rounded-full overflow-hidden">{waveIcon && <Image src={waveIcon} alt="Wave" fill className="object-cover" />}</div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Liaison Wave</span>
                      </div>
                      <CardTitle className="text-2xl">Numéro de contact</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex gap-3">
                        <div className="relative w-[120px]">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-8 rounded overflow-hidden shadow-sm">{civFlag && <Image src={civFlag} alt="CIV" fill className="object-cover" />}</div>
                          <Input readOnly value={formData.countryCode} className="h-14 bg-muted/50 pl-14 font-bold opacity-80" />
                        </div>
                        <Input type="tel" placeholder="07..." value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="h-14 flex-1 text-lg" autoFocus />
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-4 p-6">
                      <Button variant="ghost" onClick={handleBackStep} className="h-14 flex-1">Retour</Button>
                      <Button onClick={handleNextStep} className="h-14 flex-1" disabled={!isValidPhoneNumber(formData.phoneNumber)}>Suivant</Button>
                    </CardFooter>
                  </>
                )}

                {step === 4 && (
                  <>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3 mb-2 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Légalité</span>
                      </div>
                      <CardTitle className="text-2xl">Conditions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="p-5 bg-muted/40 rounded-2xl text-sm leading-relaxed max-h-48 overflow-y-auto border border-primary/5">
                        <p><strong>Article 1 :</strong> Respect et authenticité.</p>
                        <p><strong>Article 2 :</strong> Sécurité de vos données.</p>
                      </div>
                      <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-xl border border-primary/10 cursor-pointer" onClick={() => setFormData({...formData, acceptedTerms: !formData.acceptedTerms})}>
                        <Checkbox checked={formData.acceptedTerms} />
                        <Label className="text-sm font-medium cursor-pointer">J'accepte les conditions</Label>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-4 p-6">
                      <Button variant="ghost" onClick={handleBackStep} className="h-14 flex-1">Retour</Button>
                      <Button onClick={handleNextStep} className="h-14 flex-1" disabled={!formData.acceptedTerms}>
                        {isMagicReferral && referralStatus === 'valid' ? "Terminer" : "Suivant"}
                      </Button>
                    </CardFooter>
                  </>
                )}

                {step === 5 && (
                  <>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3 mb-2 text-primary">
                        <Gift className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Parrainage</span>
                      </div>
                      <CardTitle className="text-2xl">Code d'invitation</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <Label className="text-sm font-bold">J'ai un code</Label>
                        <Switch checked={hasReferral} onCheckedChange={setHasReferral} />
                      </div>
                      {hasReferral && (
                        <div className="relative">
                          <Input 
                            placeholder="CODE6X" 
                            value={formData.referredBy}
                            onChange={(e) => setFormData({...formData, referredBy: e.target.value.toUpperCase()})}
                            maxLength={6}
                            className="h-14 text-center text-xl font-black tracking-widest"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {checkingReferral ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                              <>
                                {referralStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {referralStatus === 'invalid' && formData.referredBy.length === 6 && <XCircle className="h-5 w-5 text-red-500" />}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex gap-4 p-6">
                      <Button variant="ghost" onClick={handleBackStep} className="h-14 flex-1">Retour</Button>
                      <Button onClick={handleNextStep} className="h-14 flex-1" disabled={hasReferral && (referralStatus !== 'valid' || checkingReferral)}>Vérifier</Button>
                    </CardFooter>
                  </>
                )}

                {step === 6 && (
                  <>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3 mb-2 text-primary">
                        <Sparkles className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Confirmation</span>
                      </div>
                      <CardTitle className="text-2xl">Prêt pour l'éveil ?</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4 p-6 bg-muted/30 rounded-2xl border border-primary/5">
                        <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Pseudonyme</span><span className="text-xl font-bold">@{formData.username}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Liaison Wave</span><span className="text-xl font-bold">{formData.countryCode} {formData.phoneNumber}</span></div>
                        {hasReferral && referralStatus === 'valid' && (
                          <div className="flex flex-col p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                            <span className="text-[10px] font-black uppercase text-green-600 opacity-60">Parrainage Actif</span>
                            <span className="text-sm font-bold text-green-600">Code: {formData.referredBy}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-4 p-6">
                      <Button variant="ghost" onClick={handleBackStep} className="h-14 flex-1">Modifier</Button>
                      <Button onClick={handleRegister} className="h-14 flex-1 font-bold" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "S'éveiller"}</Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
