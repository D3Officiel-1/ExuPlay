"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, getDoc, updateDoc, increment, serverTimestamp, query, collection, where, limit, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  Scan,
  User,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  X,
  RefreshCw,
  Zap,
  ZapOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { useTheme } from "next-themes";

export default function TransfertPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("qr");
  const [recipient, setRecipient] = useState<any>(null);
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [loadingRecipient, setLoadingRecipient] = useState(false);
  
  // Flashlight state
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  const qrRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const generateQRCode = async () => {
    if (!qrRef.current || !user?.uid) return;
    
    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;
      const dotColor = resolvedTheme === 'dark' ? '#000000' : '#FFFFFF';
      
      const options = {
        width: 280,
        height: 280,
        type: "svg" as const,
        data: user.uid,
        dotsOptions: { 
          color: dotColor, 
          type: "dots" as const 
        },
        backgroundOptions: { color: "transparent" },
        cornersSquareOptions: { 
          color: dotColor, 
          type: "extra-rounded" as const 
        },
        cornersDotOptions: { 
          color: dotColor, 
          type: "dot" as const 
        },
        qrOptions: { 
          typeNumber: 0, 
          mode: "Byte" as const, 
          errorCorrectionLevel: "H" as const 
        },
      };

      qrRef.current.innerHTML = "";
      const qrCode = new QRCodeStyling(options);
      qrCode.append(qrRef.current);
    } catch (error) {
      console.error("Erreur QR:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "qr" && !recipient && !isSuccess) {
      const timer = setTimeout(() => generateQRCode(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, user?.uid, resolvedTheme, recipient, isSuccess]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        if (isTorchOn) {
          await html5QrCodeRef.current.applyVideoConstraints({
            // @ts-ignore
            advanced: [{ torch: false }]
          });
          setIsTorchOn(false);
        }
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
        setHasTorch(false);
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    let scannerTimeout: NodeJS.Timeout;

    if (activeTab === "scan" && !recipient && !isSuccess) {
      const startScanner = async () => {
        scannerTimeout = setTimeout(async () => {
          const container = document.getElementById("reader");
          if (!container) return;
          
          try {
            await stopScanner();
            const scanner = new Html5Qrcode("reader");
            html5QrCodeRef.current = scanner;

            await scanner.start(
              { facingMode: "environment" },
              { fps: 20 },
              onScanSuccess,
              onScanFailure
            );
            
            if (isMounted) {
              setHasCameraPermission(true);
              try {
                const capabilities = scanner.getRunningTrackCapabilities();
                // @ts-ignore
                if (capabilities.torch) {
                  setHasTorch(true);
                }
              } catch (e) {
                console.log("Torch capability check failed", e);
              }
            }
          } catch (error: any) {
            console.error("Scanner error:", error);
            if (isMounted && (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError")) {
              setHasCameraPermission(false);
            }
          }
        }, 300);
      };

      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      isMounted = false;
      clearTimeout(scannerTimeout);
      stopScanner();
    };
  }, [activeTab, recipient, isSuccess]);

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !html5QrCodeRef.current.isScanning) return;
    
    try {
      const newState = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        // @ts-ignore
        advanced: [{ torch: newState }]
      });
      setIsTorchOn(newState);
    } catch (err) {
      console.error("Erreur Torch:", err);
      toast({
        variant: "destructive",
        title: "Erreur Lampe",
        description: "Impossible d'activer le flash sur cet appareil."
      });
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (decodedText === user?.uid) {
      toast({ variant: "destructive", title: "Action impossible", description: "C'est votre propre sceau." });
      return;
    }
    
    await stopScanner();
    setLoadingRecipient(true);
    
    try {
      const recipientRef = doc(db, "users", decodedText);
      const recipientSnap = await getDoc(recipientRef);
      if (recipientSnap.exists()) {
        setRecipient({ id: decodedText, ...recipientSnap.data() });
      } else {
        toast({ variant: "destructive", title: "Esprit non trouvé" });
        setActiveTab("qr");
      }
    } catch (error) {
      setActiveTab("qr");
    } finally {
      setLoadingRecipient(false);
    }
  };

  const onScanFailure = () => {};

  const handleTransfer = async () => {
    const transferAmount = parseInt(amount);
    if (!transferAmount || transferAmount <= 0 || !user?.uid || !recipient?.id) return;
    if ((profile?.totalPoints || 0) < transferAmount) {
      toast({ variant: "destructive", title: "Lumière insuffisante" });
      return;
    }

    setIsProcessing(true);
    const senderRef = doc(db, "users", user.uid);
    const receiverRef = doc(db, "users", recipient.id);

    try {
      await updateDoc(senderRef, {
        totalPoints: increment(-transferAmount),
        updatedAt: serverTimestamp()
      });

      const receiverUpdatePayload: any = {
        totalPoints: increment(transferAmount),
        updatedAt: serverTimestamp()
      };

      const newRecipientPoints = (recipient.totalPoints || 0) + transferAmount;
      if (recipient.referredBy && !recipient.referralRewardClaimed && newRecipientPoints >= 100) {
        const referrersQuery = query(collection(db, "users"), where("referralCode", "==", recipient.referredBy), limit(1));
        const referrerSnap = await getDocs(referrersQuery);
        if (!referrerSnap.empty) {
          await updateDoc(referrerSnap.docs[0].ref, {
            totalPoints: increment(100),
            updatedAt: serverTimestamp()
          });
          receiverUpdatePayload.referralRewardClaimed = true;
        }
      }

      await updateDoc(receiverRef, receiverUpdatePayload);
      setIsSuccess(true);
      toast({ title: "Transfert réussi", description: `${transferAmount} points envoyés.` });
    } catch (error) {
      console.error(error);
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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <main className="flex-1 max-w-lg mx-auto w-full relative h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="fixed top-6 left-0 right-0 z-[100] px-6 max-w-lg mx-auto">
            <TabsList className="w-full bg-card/20 backdrop-blur-3xl border border-primary/10 p-1 h-14 rounded-2xl grid grid-cols-2 shadow-2xl">
              <TabsTrigger value="qr" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
                <QrCode className="h-4 w-4" />
                Mon Sceau
              </TabsTrigger>
              <TabsTrigger value="scan" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
                <Scan className="h-4 w-4" />
                Scanner
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 w-full relative">
            <AnimatePresence mode="wait">
              {!recipient && !isSuccess ? (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <TabsContent value="qr" className="mt-0 h-full flex flex-col items-center justify-start pt-28 px-6">
                    <div className="relative group flex justify-center w-full max-w-[340px]">
                      <motion.div 
                        animate={{ scale: [1, 1.05, 1], opacity: [0.05, 0.1, 0.05] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute inset-0 blur-[60px] rounded-full bg-primary"
                      />
                      
                      <Card className="border-none bg-card/60 backdrop-blur-3xl shadow-2xl rounded-[3.5rem] overflow-hidden relative w-full">
                        <CardContent className="p-8 flex flex-col items-center gap-6">
                          <div className="relative">
                            <div 
                              className={`w-full aspect-square rounded-[3rem] flex items-center justify-center p-4 shadow-2xl transition-colors duration-500 ${resolvedTheme === 'dark' ? 'bg-white' : 'bg-black'}`} 
                              ref={qrRef} 
                            />
                            
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 shadow-2xl min-w-[90px] ${resolvedTheme === 'dark' ? 'bg-white border-black text-black' : 'bg-black border-white text-white'}`}
                              >
                                <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-current bg-background/10">
                                  {profile?.profileImage ? (
                                    <img src={profile.profileImage} alt="" className="object-cover w-full h-full" />
                                  ) : (
                                    <User className="h-6 w-6 m-auto absolute inset-0 opacity-40" />
                                  )}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tighter truncate max-w-[80px]">
                                  {profile?.username}
                                </span>
                              </motion.div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <p className="text-xl font-black tracking-tight">Sceau d'Éveil</p>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Scannez pour résonner</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Button variant="ghost" onClick={() => router.push("/profil")} className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      <X className="h-4 w-4 mr-2" />
                      Fermer
                    </Button>
                  </TabsContent>

                  <TabsContent value="scan" className="mt-0 h-full">
                    <div className="fixed inset-0 z-0 bg-black flex items-center justify-center">
                      <div id="reader" className="absolute inset-0 w-full h-full" />
                      
                      <div className="absolute inset-0 pointer-events-none z-10" />

                      {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-background/90 backdrop-blur-xl z-50">
                          <ShieldAlert className="h-12 w-12 text-destructive" />
                          <h2 className="text-xl font-black uppercase tracking-tight">Permission Requise</h2>
                          <p className="text-xs font-medium opacity-60">L'accès à la caméra est nécessaire.</p>
                          <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl px-8 gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Réessayer
                          </Button>
                        </div>
                      )}

                      {/* Flashlight Button - Centered at bottom */}
                      {hasTorch && hasCameraPermission && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100]"
                        >
                          <Button
                            onClick={toggleTorch}
                            className={`h-20 w-20 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 backdrop-blur-2xl border ${
                              isTorchOn 
                                ? 'bg-primary text-primary-foreground border-primary shadow-primary/20' 
                                : 'bg-black/20 text-white border-white/10 hover:bg-black/40'
                            }`}
                          >
                            <AnimatePresence mode="wait">
                              {isTorchOn ? (
                                <motion.div
                                  key="on"
                                  initial={{ opacity: 0, rotate: -45 }}
                                  animate={{ opacity: 1, rotate: 0 }}
                                  exit={{ opacity: 0, rotate: 45 }}
                                >
                                  <Zap className="h-8 w-8 fill-current" />
                                  <motion.div 
                                    animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 bg-white/20 rounded-full blur-xl"
                                  />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="off"
                                  initial={{ opacity: 0, rotate: -45 }}
                                  animate={{ opacity: 1, rotate: 0 }}
                                  exit={{ opacity: 0, rotate: 45 }}
                                >
                                  <ZapOff className="h-8 w-8 opacity-60" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </TabsContent>
                </motion.div>
              ) : recipient && !isSuccess ? (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="min-h-screen flex flex-col items-center justify-center px-6"
                >
                  <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden w-full">
                    <CardHeader className="text-center pt-10 pb-4">
                      <div className="mx-auto w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-4 relative overflow-hidden border border-primary/10">
                        {recipient.profileImage ? (
                          <img src={recipient.profileImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 text-primary opacity-20" />
                        )}
                      </div>
                      <CardTitle className="text-2xl font-black">Vers @{recipient.username}</CardTitle>
                      <CardDescription>Partagez une part de votre éveil</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-8 pb-10 space-y-8">
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Votre Solde Actuel</p>
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
                              autoFocus
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black opacity-20">PTS</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="px-8 pb-10 flex flex-col gap-3">
                      <Button 
                        onClick={handleTransfer}
                        disabled={isProcessing || !amount || parseInt(amount) <= 0 || parseInt(amount) > (profile?.totalPoints || 0)}
                        className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                      >
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                        {isProcessing ? "Traitement..." : "Confirmer le Transfert"}
                      </Button>
                      <Button variant="ghost" onClick={() => { setRecipient(null); setAmount(""); setActiveTab("qr"); }} className="w-full h-12 text-[10px] font-black uppercase tracking-widest opacity-40">
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
                  className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-8"
                >
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="relative h-24 w-24 bg-card rounded-[2.5rem] flex items-center justify-center border border-green-500/20 shadow-2xl mx-auto">
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight">Transmission Réussie</h2>
                    <p className="text-sm font-medium opacity-40 px-6">Votre lumière a été partagée avec @{recipient?.username}.</p>
                  </div>

                  <div className="p-8 bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-primary/5 w-full max-w-xs mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Montant envoyé</p>
                    <p className="text-4xl font-black tabular-nums">{amount} <span className="text-xs opacity-20">PTS</span></p>
                  </div>

                  <Button variant="outline" onClick={() => router.push("/profil")} className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2">
                    Retour au Profil
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </main>
      <style jsx global>{`
        #reader video {
          object-fit: cover !important;
          width: 100vw !important;
          height: 100vh !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
        }
        #reader { 
          border: none !important; 
          background: black !important; 
        }
        #reader__scan_region {
          display: none !important;
        }
        #reader__scan_region img { 
          display: none !important; 
        }
      `}</style>
    </div>
  );
}