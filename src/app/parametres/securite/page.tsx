
"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Fingerprint, 
  Trash2, 
  Loader2, 
  ChevronLeft,
  AlertTriangle,
  Lock,
  Unlock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createPasskey } from "@/lib/passkey";

export default function SecuritePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  const handleEnableBiometrics = async () => {
    if (!userDocRef || !profile) return;
    
    setLoading(true);
    try {
      const passkeyId = await createPasskey(profile.username);
      await updateDoc(userDocRef, {
        biometricEnabled: true,
        passkeyId: passkeyId,
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: "Sceau activé", 
        description: "Votre application est désormais protégée biométriquement." 
      });
    } catch (error: any) {
      console.error(error);
      if (error.name !== 'AbortError') {
        toast({ 
          variant: "destructive", 
          title: "Échec de configuration", 
          description: "Impossible d'enregistrer votre Sceau pour le moment." 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisableBiometrics = async () => {
    if (!userDocRef) return;
    
    setLoading(true);
    try {
      await updateDoc(userDocRef, {
        biometricEnabled: false,
        passkeyId: null,
        updatedAt: serverTimestamp()
      });
      sessionStorage.removeItem(`auth_${user?.uid}`);
      toast({ 
        title: "Sceau révoqué", 
        description: "La protection biométrique a été supprimée." 
      });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: "Impossible de révoquer le Sceau." 
      });
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full h-10 w-10 hover:bg-primary/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Sécurité</p>
            <h1 className="text-3xl font-black tracking-tight">Le Sceau</h1>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-8 opacity-5 transition-transform duration-1000 ${profile?.biometricEnabled ? 'scale-125 rotate-12' : ''}`}>
              <ShieldCheck className="h-32 w-32" />
            </div>
            
            <CardHeader className="pt-10 px-8 text-center space-y-4">
              <div className={`mx-auto w-20 h-20 rounded-[2rem] flex items-center justify-center mb-2 transition-colors duration-500 ${profile?.biometricEnabled ? 'bg-green-500/10' : 'bg-primary/5'}`}>
                {profile?.biometricEnabled ? (
                  <Lock className="h-10 w-10 text-green-500" />
                ) : (
                  <Unlock className="h-10 w-10 text-primary opacity-40" />
                )}
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-black tracking-tight">
                  {profile?.biometricEnabled ? "Accès Sécurisé" : "Accès Libre"}
                </CardTitle>
                <CardDescription className="font-medium text-sm">
                  {profile?.biometricEnabled 
                    ? "Votre esprit est protégé par un verrou biométrique inviolable." 
                    : "Activez le Sceau pour protéger vos points et votre progression."}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              {profile?.biometricEnabled ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/5 rounded-2xl border border-green-500/10 flex items-center gap-4">
                    <Fingerprint className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-green-600">État du Sceau</p>
                      <p className="text-xs font-bold text-green-600/80">Actif & Synchronisé</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline"
                    onClick={handleDisableBiometrics}
                    disabled={loading}
                    className="w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] gap-3 text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/10"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Révoquer le Sceau
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleEnableBiometrics}
                  disabled={loading}
                  className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] gap-3 shadow-xl shadow-primary/20"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="h-5 w-5" />
                      Forger mon Sceau
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5 flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-primary opacity-40 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Note de Sagesse</p>
              <p className="text-[11px] leading-relaxed font-medium opacity-60">
                L'activation du Sceau requiert que votre appareil supporte les technologies biométriques (FaceID, TouchID ou code de verrouillage).
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
