
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
  Moon, 
  Sun, 
  Monitor, 
  ChevronRight, 
  Info, 
  Scale,
  Settings,
  Zap,
  ShieldCheck,
  Bell,
  Vibrate,
  EyeOff,
  LogOut,
  Loader2,
  Volume2,
  ZapOff,
  Eye
} from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

export default function ParametresPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const db = useFirestore();
  const auth = getAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
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
                {/* Notifications */}
                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Bell className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Notifications</p>
                      <p className="text-[10px] opacity-40 font-medium">Résonance du Sanctuaire</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.notificationsEnabled ?? true} 
                    onCheckedChange={(checked) => handleUpdateSetting('notificationsEnabled', checked)} 
                  />
                </div>

                {/* Haptiques */}
                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Vibrate className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Échos Haptiques</p>
                      <p className="text-[10px] opacity-40 font-medium">Vibrations d'interaction</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.hapticEnabled ?? true} 
                    onCheckedChange={(checked) => handleUpdateSetting('hapticEnabled', checked)} 
                  />
                </div>

                {/* Sons */}
                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Volume2 className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Sons du Sanctuaire</p>
                      <p className="text-[10px] opacity-40 font-medium">Effets audio d'ambiance</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.soundsEnabled ?? true} 
                    onCheckedChange={(checked) => handleUpdateSetting('soundsEnabled', checked)} 
                  />
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
    </div>
  );
}
