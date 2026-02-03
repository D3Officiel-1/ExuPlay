"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Moon, 
  Sun, 
  Monitor, 
  ShieldCheck, 
  ChevronRight, 
  Info, 
  Scale,
  Settings,
  Zap,
  Fingerprint
} from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function ParametresPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (!userDocRef) return;
    
    updateDoc(userDocRef, {
      theme: newTheme,
      updatedAt: serverTimestamp()
    }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: { theme: newTheme },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
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
          className="space-y-8"
        >
          {/* Section Thème */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <Zap className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Ambiance visuelle</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-6">
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
              </CardContent>
            </Card>
          </motion.section>

          {/* Section Sécurité */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <ShieldCheck className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Confidentialité</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem]">
              <CardContent className="p-2">
                <button 
                  onClick={() => router.push("/parametres/securite")}
                  className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors rounded-2xl group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Fingerprint className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Sceau Biométrique</p>
                      <p className="text-[10px] opacity-40 font-medium">Statut : {profile?.biometricEnabled ? "Activé" : "Non configuré"}</p>
                    </div>
                  </div>
                  {profile?.biometricEnabled ? (
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                  )}
                </button>
              </CardContent>
            </Card>
          </motion.section>

          {/* Section Légal & Infos */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <Info className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">À propos</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-2 space-y-1">
                <button className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors rounded-2xl group text-left">
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
                      <p className="text-[10px] opacity-40 font-medium tracking-widest">2.0.4 - MAJOR UPDATE</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
