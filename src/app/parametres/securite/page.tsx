
"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Fingerprint, ShieldCheck, Loader2, ChevronLeft, Lock, Unlock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function SecuritePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);
  const isEnabled = profile?.biometricEnabled === true;

  const handleToggleBiometrics = async () => {
    if (isEnabled) {
      // Désactiver la protection
      setLoading(true);
      try {
        if (userDocRef) {
          await updateDoc(userDocRef, {
            biometricEnabled: false,
            updatedAt: serverTimestamp()
          });
          localStorage.removeItem("citation_biometric_enabled");
          toast({
            title: "Protection désactivée",
            description: "Votre application n'est plus protégée par biométrie."
          });
        }
      } catch (error) {
        const permissionError = new FirestorePermissionError({
          path: userDocRef?.path || "",
          operation: 'update',
          requestResourceData: { biometricEnabled: false },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      } finally {
        setLoading(false);
      }
    } else {
      // Activer la protection (Créer une Passkey)
      setLoading(true);
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const userId = user?.uid || "anonymous";
        const userEmail = user?.email || `${userId}@exuplay.app`;

        const createCredentialOptions: PublicKeyCredentialCreationOptions = {
          challenge,
          rp: { name: "Exu Play", id: window.location.hostname },
          user: {
            id: Uint8Array.from(userId, c => c.charCodeAt(0)),
            name: userEmail,
            displayName: profile?.username || "Utilisateur Exu Play",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: { 
            authenticatorAttachment: "platform", 
            userVerification: "required",
            residentKey: "required"
          },
          timeout: 60000,
        };

        const credential = await navigator.credentials.create({ publicKey: createCredentialOptions });

        if (credential && userDocRef) {
          await updateDoc(userDocRef, { 
            biometricEnabled: true,
            updatedAt: serverTimestamp() 
          });
          localStorage.setItem("citation_biometric_enabled", "true");
          toast({ 
            title: "Sceau biométrique activé", 
            description: "Votre identité est désormais protégée." 
          });
        }
      } catch (error: any) {
        console.error('Passkey creation error:', error);
        toast({ 
          variant: "destructive",
          title: "Échec de l'activation", 
          description: "La création de la Passkey a été annulée ou a échoué." 
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 p-6 pt-20 space-y-8 max-w-lg mx-auto w-full">
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
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Configuration</p>
            <h1 className="text-3xl font-black tracking-tight">Sécurité</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="text-center pt-10 pb-4">
              <div className="mx-auto w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-4 relative">
                {isEnabled ? (
                  <ShieldCheck className="h-10 w-10 text-primary" />
                ) : (
                  <Lock className="h-10 w-10 text-primary opacity-20" />
                )}
                {isEnabled && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-4 border-background flex items-center justify-center"
                  >
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                  </motion.div>
                )}
              </div>
              <CardTitle className="text-2xl font-black">Sceau Biométrique</CardTitle>
              <CardDescription className="px-6 font-medium">
                Protégez l'accès à votre éveil spirituel en utilisant votre technologie native (Face ID, Touch ID).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 py-6">
              <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-4">
                <div className="flex items-center gap-4">
                  <Fingerprint className="h-5 w-5 opacity-40" />
                  <div>
                    <p className="text-sm font-bold">État de la protection</p>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-40">
                      {isEnabled ? "Activé & Sécurisé" : "Inactif"}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed opacity-60">
                  {isEnabled 
                    ? "L'application demandera une authentification biométrique à chaque ouverture pour garantir que vous seul puissiez accéder à votre univers philosophique."
                    : "L'activation de la biométrie crée une Passkey unique liée à votre appareil. Vos données biométriques ne quittent jamais votre téléphone."}
                </p>
              </div>
            </CardContent>
            <CardFooter className="px-8 pb-10">
              <Button 
                onClick={handleToggleBiometrics} 
                disabled={loading}
                className={`w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl transition-all ${
                  isEnabled 
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-none shadow-none" 
                    : "shadow-primary/20"
                }`}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : isEnabled ? (
                  <>
                    <Unlock className="h-5 w-5" />
                    Désactiver le Sceau
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Activer ma Passkey
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {isEnabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 bg-yellow-500/5 rounded-[2rem] border border-yellow-500/10 flex gap-4 items-start"
            >
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Note Importante</p>
                <p className="text-[10px] leading-relaxed opacity-60">
                  Si vous changez d'appareil, vous devrez réactiver cette protection sur le nouveau matériel. La Passkey est propre à chaque terminal physique.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
