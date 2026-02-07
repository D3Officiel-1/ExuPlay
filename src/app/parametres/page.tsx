
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Moon, 
  Sun, 
  Monitor, 
  ChevronRight, 
  Info, 
  Scale,
  Settings,
  Zap,
  ShieldCheck,
  EyeOff,
  LogOut,
  Loader2,
  ZapOff,
  Eye,
  Palette,
  Sparkles,
  Check
} from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { APP_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

export default function ParametresPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const db = useFirestore();
  const auth = getAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);
  
  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);

  const handleUpdateSetting = async (field: string, value: any) => {
    if (!userDocRef) return;
    haptic.light();
    
    try {
      await updateDoc(userDocRef, {
        [field]: value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: { [field]: value },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    handleUpdateSetting('theme', newTheme);
  };

  const handleColorSelect = async (colorId: string) => {
    if (!userDocRef || isUpdatingColor) return;
    haptic.medium();
    setIsUpdatingColor(true);
    try {
      await updateDoc(userDocRef, {
        customColor: colorId,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Harmonie mise à jour", description: `L'aura ${APP_COLORS[colorId].name} a été infusée.` });
      setIsColorDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance" });
    } finally {
      setIsUpdatingColor(false);
    }
  };

  const handleLogout = async () => {
    haptic.medium();
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      sessionStorage.clear();
      router.push("/login");
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "L'âme refuse de quitter le sanctuaire." });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Configuration</p>
          <h1 className="text-3xl font-black tracking-tight">Paramètres</h1>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          {/* Section Sécurité */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <ShieldCheck className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Protection</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-2">
                <button 
                  onClick={() => router.push("/parametres/securite")}
                  className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors rounded-2xl group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Verrouillage Biométrique</p>
                      <p className="text-[10px] opacity-40 font-medium">Protéger l'accès avec un Sceau</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                </button>
              </CardContent>
            </Card>
          </motion.section>

          {/* Section Expérience */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <Zap className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Expérience</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-4 space-y-1">
                {/* Harmonie de l'Aura */}
                <div className="flex items-center justify-between p-3 rounded-2xl group hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => { haptic.light(); setIsColorDialogOpen(true); }}>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center relative">
                      <Palette className="h-5 w-5 text-primary opacity-60" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-primary shadow-sm" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Harmonie de l'Aura</p>
                      <p className="text-[10px] opacity-40 font-medium">Couleur : {APP_COLORS[profile?.customColor || 'default'].name}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                </div>

                {/* Animations (Eco mode) */}
                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <ZapOff className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Mode Éco-Éther</p>
                      <p className="text-[10px] opacity-40 font-medium">Réduire les animations</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.reducedMotion ?? false} 
                    onCheckedChange={(checked) => handleUpdateSetting('reducedMotion', checked)} 
                  />
                </div>

                {/* Thème */}
                <div className="pt-4 border-t border-primary/5 mt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 px-2">Ambiance visuelle</p>
                  <RadioGroup 
                    value={theme} 
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-3 gap-3"
                  >
                    {[
                      { id: 'light', label: 'Clair', icon: Sun },
                      { id: 'dark', label: 'Sombre', icon: Moon },
                      { id: 'system', label: 'Auto', icon: Monitor },
                    ].map((item) => (
                      <div key={item.id}>
                        <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" />
                        <Label
                          htmlFor={item.id}
                          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-transparent bg-background/50 p-4 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer group"
                        >
                          <item.icon className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Section Confidentialité */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <EyeOff className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Discrétion</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <EyeOff className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Voile de l'Esprit</p>
                      <p className="text-[10px] opacity-40 font-medium">Invisible dans le classement</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.rankingHidden ?? false} 
                    onCheckedChange={(checked) => handleUpdateSetting('rankingHidden', checked)} 
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Eye className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Sceau d'Invisibilité</p>
                      <p className="text-[10px] opacity-40 font-medium">Masquer les points dans l'entête</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.hidePointsInHeader ?? false} 
                    onCheckedChange={(checked) => handleUpdateSetting('hidePointsInHeader', checked)} 
                  />
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Section À propos & Session */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <Info className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Sanctuaire</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-2 space-y-1">
                <button 
                  onClick={() => router.push("/conditions")}
                  className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors rounded-2xl group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Scale className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Conditions d'Utilisation</p>
                      <p className="text-[10px] opacity-40 font-medium">Vos droits et engagements</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                </button>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/5 mx-2 mb-2">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Settings className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Version de l'Éveil</p>
                      <p className="text-[10px] opacity-40 font-medium tracking-widest uppercase">2.3.0 - Quantum Flux</p>
                    </div>
                  </div>
                </div>

                <div className="px-2 pb-2">
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full h-14 rounded-2xl flex items-center justify-between px-4 hover:bg-destructive/10 hover:text-destructive transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-destructive/10 rounded-xl flex items-center justify-center group-hover:bg-destructive/20">
                        {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5 text-destructive" />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Quitter le Sanctuaire</p>
                        <p className="text-[10px] opacity-40 font-medium uppercase tracking-widest">Fermer la session</p>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </main>

      {/* Dialogue de sélection de couleur */}
      <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="p-8 space-y-10">
            <DialogHeader>
              <div className="space-y-1 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Personnalisation</p>
                <DialogTitle className="text-2xl font-black tracking-tight italic">Harmonie de l'Aura</DialogTitle>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.values(APP_COLORS).map((color) => {
                const isActive = (profile?.customColor || 'default') === color.id;
                return (
                  <button
                    key={color.id}
                    onClick={() => handleColorSelect(color.id)}
                    disabled={isUpdatingColor}
                    className={cn(
                      "group relative flex flex-col items-center gap-3 p-5 rounded-[2rem] border-2 transition-all duration-500",
                      isActive 
                        ? "border-primary bg-primary/5 shadow-lg" 
                        : "border-transparent bg-background/40 hover:bg-primary/5 opacity-60 hover:opacity-100"
                    )}
                  >
                    <div 
                      className="h-12 w-12 rounded-2xl shadow-inner flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: color.hex }}
                    >
                      {isActive && <Check className="h-6 w-6 text-white mix-blend-difference" />}
                      <motion.div 
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 bg-white/20"
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{color.name}</span>
                    
                    {isActive && (
                      <motion.div 
                        layoutId="active-glow"
                        className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-xl -z-10"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
              <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
                "La couleur est la vibration visible de votre esprit dans le flux."
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={() => setIsColorDialogOpen(false)}
              className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest"
            >
              Fermer le dialogue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
