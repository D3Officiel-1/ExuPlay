
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  QrCode, 
  Camera, 
  Zap, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Scan,
  User,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function TransfertPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("qr");
  const [recipient, setRecipient] = useState<any>(null);
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (activeTab === "scan") {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          stream.getTracks().forEach(track => track.stop());

          const scanner = new Html5QrcodeScanner(
            "reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              rememberLastUsedCamera: true,
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
            },
            false
          );

          scanner.render(onScanSuccess, onScanFailure);
          scannerRef.current = scanner;
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
        }
      };

      getCameraPermission();
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
      }
    };
  }, [activeTab]);

  const onScanSuccess = async (decodedText: string) => {
    if (decodedText === user?.uid) {
      toast({ variant: "destructive", title: "Action impossible", description: "Vous ne pouvez pas vous envoyer de points à vous-même." });
      return;
    }

    if (scannerRef.current) {
      scannerRef.current.clear();
    }

    setLoadingRecipient(true);
    try {
      const recipientRef = doc(db, "users", decodedText);
      const recipientSnap = await getDoc(recipientRef);
      if (recipientSnap.exists()) {
        setRecipient({ id: decodedText, ...recipientSnap.data() });
      } else {
        toast({ variant: "destructive", title: "Esprit non trouvé", description: "Ce QR Code n'est pas reconnu par l'Éveil." });
        setActiveTab("qr");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de lire le sceau." });
      setActiveTab("qr");
    } finally {
      setLoadingRecipient(false);
    }
  };

  const onScanFailure = (error: any) => {
    // Silently continue scanning
  };

  const [loadingRecipient, setLoadingRecipient] = useState(false);

  const handleTransfer = async () => {
    const transferAmount = parseInt(amount);
    if (!transferAmount || transferAmount <= 0) {
      toast({ variant: "destructive", title: "Montant invalide" });
      return;
    }

    if ((profile?.totalPoints || 0) < transferAmount) {
      toast({ variant: "destructive", title: "Lumière insuffisante", description: "Vous ne possédez pas assez de points." });
      return;
    }

    setIsProcessing(true);

    try {
      const senderRef = doc(db, "users", user!.uid);
      const receiverRef = doc(db, "users", recipient.id);

      // Perform updates
      await updateDoc(senderRef, {
        totalPoints: increment(-transferAmount),
        updatedAt: serverTimestamp()
      });

      await updateDoc(receiverRef, {
        totalPoints: increment(transferAmount),
        updatedAt: serverTimestamp()
      });

      setIsSuccess(true);
      toast({ title: "Transfert réussi", description: `${transferAmount} points envoyés à @${recipient.username}.` });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: `users/${user?.uid}/transfer`,
        operation: 'write',
        requestResourceData: { amount: transferAmount, to: recipient.id },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
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
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Interaction</p>
            <h1 className="text-3xl font-black tracking-tight">Transfert</h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!recipient && !isSuccess ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-card/40 backdrop-blur-3xl border border-primary/5 p-1 h-14 rounded-2xl grid grid-cols-2">
                  <TabsTrigger value="qr" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
                    <QrCode className="h-4 w-4" />
                    Mon Sceau
                  </TabsTrigger>
                  <TabsTrigger value="scan" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
                    <Scan className="h-4 w-4" />
                    Scanner
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="mt-8 space-y-8">
                  <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden">
                    <CardContent className="p-10 flex flex-col items-center gap-8 text-center">
                      <div className="p-6 bg-white rounded-[2.5rem] shadow-inner relative">
                        <QRCodeCanvas 
                          value={user?.uid || ""} 
                          size={200}
                          level="H"
                          includeMargin={false}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                          <Zap className="h-10 w-10 text-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-bold">@{profile?.username}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          Présentez ce code pour recevoir de la lumière
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="scan" className="mt-8">
                  <div className="relative aspect-square w-full rounded-[3rem] overflow-hidden bg-black/40 border-4 border-primary/10 shadow-inner group">
                    <div id="reader" className="w-full h-full object-cover" />
                    {hasCameraPermission === false && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-background/80 backdrop-blur-md">
                        <ShieldAlert className="h-12 w-12 text-destructive" />
                        <p className="text-sm font-bold">Caméra Bloquée</p>
                        <p className="text-xs opacity-60">Veuillez autoriser l'accès à la caméra pour scanner les sceaux.</p>
                      </div>
                    )}
                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
                    <div className="absolute inset-[40px] border-2 border-primary/20 rounded-3xl pointer-events-none animate-pulse" />
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          ) : recipient && !isSuccess ? (
            <motion.div
              key="amount"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-6"
            >
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="text-center pt-10 pb-4">
                  <div className="mx-auto w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-4 relative">
                    <User className="h-10 w-10 text-primary opacity-20" />
                    {recipient.profileImage && (
                      <img src={recipient.profileImage} alt="" className="absolute inset-0 w-full h-full object-cover rounded-3xl" />
                    )}
                  </div>
                  <CardTitle className="text-2xl font-black">Vers @{recipient.username}</CardTitle>
                  <CardDescription>Envoyez une part de votre éveil</CardDescription>
                </CardHeader>
                
                <CardContent className="px-8 pb-10 space-y-8">
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Votre Solde</p>
                      <p className="text-xl font-black">{profile?.totalPoints?.toLocaleString()} <span className="text-xs opacity-20">PTS</span></p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Montant du transfert</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-16 text-3xl font-black text-center rounded-2xl bg-primary/5 border-none focus-visible:ring-primary/20"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black opacity-20">PTS</div>
                      </div>
                    </div>
                  </div>

                  {recipient.id === user?.uid && (
                    <div className="flex gap-3 p-4 bg-destructive/5 rounded-2xl border border-destructive/10 items-start">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[10px] leading-relaxed font-bold text-destructive uppercase">
                        Vous ne pouvez pas vous envoyer de points.
                      </p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="px-8 pb-10 flex flex-col gap-3">
                  <Button 
                    onClick={handleTransfer}
                    disabled={isProcessing || !amount || parseInt(amount) <= 0 || parseInt(amount) > (profile?.totalPoints || 0) || recipient.id === user?.uid}
                    className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Confirmer le Transfert
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setRecipient(null);
                      setAmount("");
                      setActiveTab("qr");
                    }}
                    className="w-full h-12 text-[10px] font-black uppercase tracking-widest opacity-40"
                  >
                    Annuler
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-10"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="relative h-24 w-24 bg-card rounded-[2.5rem] flex items-center justify-center border border-green-500/20 shadow-2xl mx-auto">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Transmission Réussie</h2>
                <p className="text-sm font-medium opacity-40 px-6">
                  Votre lumière a été partagée avec @{recipient?.username}. Le cycle de l'éveil continue.
                </p>
              </div>

              <div className="p-8 bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-primary/5 max-w-xs mx-auto">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Montant envoyé</p>
                <p className="text-4xl font-black tabular-nums">{amount} <span className="text-xs opacity-20">PTS</span></p>
              </div>

              <Button 
                variant="outline" 
                onClick={() => router.push("/profil")}
                className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2"
              >
                Retour au Profil
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
