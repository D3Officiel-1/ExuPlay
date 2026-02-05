
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  query, 
  collection, 
  where, 
  limit, 
  getDocs,
  addDoc,
  orderBy
} from "firebase/firestore";
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
  AlertCircle,
  ArrowDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { useTheme } from "next-themes";
import { sendPushNotification } from "@/app/actions/notifications";
import { haptic } from "@/lib/haptics";

export default function TransfertPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("qr");
  const [recipient, setRecipient] = useState<any>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const [activeIncomingTransfer, setActiveIncomingTransfer] = useState<any>(null);
  const lastPointsRef = useRef<number | null>(null);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  // Calcul des frais
  const transferAmount = parseInt(amount) || 0;
  const fees = Math.floor(transferAmount * 0.1);
  const totalCost = transferAmount + fees;

  useEffect(() => {
    if (!profile || !db || !user?.uid) return;

    if (lastPointsRef.current !== null && profile.totalPoints > lastPointsRef.current) {
      const checkIncomingTransfer = async () => {
        try {
          const q = query(
            collection(db, "transfers"),
            where("toId", "==", user.uid),
            where("read", "==", false),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            haptic.impact();
            const transfer = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setActiveIncomingTransfer(transfer);
            
            const audio = new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_f80e052d2e.mp3");
            audio.play().catch(() => {});

            setTimeout(async () => {
              setActiveIncomingTransfer(null);
              await updateDoc(doc(db, "transfers", transfer.id), { read: true });
            }, 6000);
          }
        } catch (e) {
          console.error("Résonance interrompue:", e);
        }
      };
      checkIncomingTransfer();
    }
    lastPointsRef.current = profile.totalPoints;
  }, [profile?.totalPoints, db, user?.uid, profile]);

  const qrRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const generateQRCode = async () => {
    if (!qrRef.current || !user?.uid || activeIncomingTransfer) return;
    
    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;
      const dotColor = resolvedTheme === 'dark' ? '#000000' : '#FFFFFF';
      
      const options = {
        width: 280,
        height: 280,
        type: "svg" as const,
        data: user.uid,
        dotsOptions: { color: dotColor, type: "dots" as const },
        backgroundOptions: { color: "transparent" },
        cornersSquareOptions: { color: dotColor, type: "extra-rounded" as const },
        cornersDotOptions: { color: dotColor, type: "dot" as const },
        qrOptions: { typeNumber: 0, mode: "Byte" as const, errorCorrectionLevel: "H" as const },
      };

      qrRef.current.innerHTML = "";
      const qrCode = new QRCodeStyling(options);
      qrCode.append(qrRef.current);
    } catch (error) {
      console.error("Erreur QR:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "qr" && !recipient && !isSuccess && validationStatus === 'idle' && !activeIncomingTransfer) {
      const timer = setTimeout(() => generateQRCode(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, user?.uid, resolvedTheme, recipient, isSuccess, validationStatus, activeIncomingTransfer]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        if (isTorchOn) {
          await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: false }] } as any);
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

    if (activeTab === "scan" && !recipient && !isSuccess && validationStatus === 'idle') {
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
                if ((capabilities as any).torch) {
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
  }, [activeTab, recipient, isSuccess, validationStatus]);

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !html5QrCodeRef.current.isScanning) return;
    haptic.light();
    try {
      const newState = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: newState }] } as any);
      setIsTorchOn(newState);
    } catch (err) {
      console.error("Erreur Torch:", err);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner();
    haptic.medium();
    
    if (decodedText === user?.uid) {
      haptic.error();
      setErrorMessage("C'est votre propre Sceau");
      setValidationStatus('error');
      setTimeout(() => {
        setValidationStatus('idle');
        setErrorMessage("");
        setActiveTab("scan");
      }, 2500);
      return;
    }

    setValidationStatus('validating');
    
    try {
      const recipientRef = doc(db, "users", decodedText);
      const recipientSnap = await getDoc(recipientRef);
      
      if (recipientSnap.exists()) {
        haptic.success();
        const data = recipientSnap.data();
        setRecipient({ id: decodedText, ...data });
        setValidationStatus('success');
        setTimeout(() => {
          setValidationStatus('idle');
        }, 2500);
      } else {
        haptic.error();
        setErrorMessage("Esprit non identifié");
        setValidationStatus('error');
        setTimeout(() => {
          setValidationStatus('idle');
          setErrorMessage("");
          setActiveTab("scan");
        }, 2500);
      }
    } catch (error) {
      setErrorMessage("Dissonance réseau");
      setValidationStatus('error');
      setTimeout(() => {
        setValidationStatus('idle');
        setErrorMessage("");
        setActiveTab("scan");
      }, 2500);
    }
  };

  const onScanFailure = () => {};

  const handleTransfer = async () => {
    if (!transferAmount || transferAmount <= 0 || !user?.uid || !recipient?.id) return;
    if ((profile?.totalPoints || 0) < totalCost) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante", description: "Le coût total (montant + frais) dépasse votre solde." });
      return;
    }

    setIsProcessing(true);
    haptic.medium();
    const senderRef = doc(db, "users", user.uid);
    const receiverRef = doc(db, "users", recipient.id);

    try {
      // Déduire le montant total (Transfert + Frais)
      await updateDoc(senderRef, {
        totalPoints: increment(-totalCost),
        updatedAt: serverTimestamp()
      });

      // Le destinataire reçoit le montant exact
      await updateDoc(receiverRef, {
        totalPoints: increment(transferAmount),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "transfers"), {
        fromId: user.uid,
        fromName: profile?.username || "Anonyme",
        fromPhoto: profile?.profileImage || "",
        toId: recipient.id,
        amount: transferAmount,
        fees: fees,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      if (recipient.fcmToken) {
        sendPushNotification({
          token: recipient.fcmToken,
          title: "Lumière Reçue !",
          body: `@${profile?.username || 'Un esprit'} vous a envoyé ${transferAmount} PTS.`
        });
      }

      haptic.success();
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      haptic.error();
      toast({ variant: "destructive", title: "Erreur de transfert" });
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
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); haptic.light(); }} className="w-full h-full flex flex-col">
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
              {validationStatus !== 'idle' ? (
                <motion.div
                  key="validation-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                  className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center overflow-hidden"
                >
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [1, 2, 1.5], 
                      opacity: validationStatus === 'error' ? [0.4, 0.1, 0.2] : [0.5, 0.1, 0.3] 
                    }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className={`absolute h-96 w-96 rounded-full blur-[80px] ${
                      validationStatus === 'error' ? 'bg-red-500/20' : 'bg-primary/10'
                    }`}
                  />
                  
                  <div className="relative flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={validationStatus === 'error' 
                        ? { 
                            scale: 1, 
                            opacity: 1, 
                            x: [0, -10, 10, -10, 10, 0],
                            transition: { duration: 0.5, ease: "easeInOut" }
                          } 
                        : { 
                            scale: 1, 
                            opacity: 1,
                            transition: { type: "spring", stiffness: 200, damping: 20 }
                          }
                      }
                      className={`h-32 w-32 rounded-[3rem] bg-card border-2 shadow-2xl flex items-center justify-center overflow-hidden relative ${
                        validationStatus === 'error' ? 'border-red-500/30' : 'border-primary/10'
                      }`}
                    >
                      {validationStatus === 'error' ? (
                        <AlertCircle className="h-12 w-12 text-red-500" />
                      ) : validationStatus === 'success' && recipient?.profileImage ? (
                        <img src={recipient.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="h-12 w-12 text-primary opacity-20" />
                        </motion.div>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-8 text-center"
                    >
                      {validationStatus === 'error' ? (
                        <>
                          <h2 className="text-2xl font-black tracking-tighter text-red-500 uppercase italic">Dissonance</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-2">{errorMessage}</p>
                        </>
                      ) : validationStatus === 'success' ? (
                        <>
                          <h2 className="text-2xl font-black tracking-tighter">@{recipient?.username}</h2>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <motion.div 
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="h-1.5 w-1.5 bg-green-500 rounded-full"
                            />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Résonance Établie</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Analyse de l'Éther...</p>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              ) : !recipient && !isSuccess ? (
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
                      
                      <AnimatePresence mode="wait">
                        {!activeIncomingTransfer ? (
                          <motion.div
                            key="qr-view"
                            initial={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
                            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                            exit={{ scale: 1.2, opacity: 0, filter: "blur(40px)", rotate: 5 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full"
                          >
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
                              </CardContent>
                            </Card>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="transfer-animation"
                            initial={{ scale: 0.5, opacity: 0, rotate: -15, filter: "blur(30px)" }}
                            animate={{ scale: 1, opacity: 1, rotate: 0, filter: "blur(0px)" }}
                            exit={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="w-full"
                          >
                            <Card className="border-none bg-primary/10 backdrop-blur-[80px] shadow-[0_40px_100px_rgba(0,0,0,0.3)] rounded-[3.5rem] overflow-hidden relative w-full border border-primary/20">
                              <CardContent className="p-10 flex flex-col items-center gap-8 text-center">
                                <motion.div 
                                  initial={{ y: 20, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  transition={{ delay: 0.3 }}
                                  className="relative"
                                >
                                  <div className="h-32 w-32 rounded-[2.5rem] bg-card border-2 border-primary/10 shadow-2xl overflow-hidden relative">
                                    {activeIncomingTransfer.fromPhoto ? (
                                      <img src={activeIncomingTransfer.fromPhoto} alt="" className="object-cover w-full h-full" />
                                    ) : (
                                      <User className="h-12 w-12 text-primary opacity-20 m-auto absolute inset-0" />
                                    )}
                                  </div>
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -top-4 -right-4 h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl"
                                  >
                                    <Zap className="h-6 w-6 text-primary-foreground fill-current" />
                                  </motion.div>
                                </motion.div>

                                <div className="space-y-2">
                                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Résonance Établie</p>
                                  <h2 className="text-3xl font-black tracking-tighter italic">@{activeIncomingTransfer.fromName}</h2>
                                </div>

                                <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 w-full relative">
                                  <motion.div 
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.6, type: "spring" }}
                                    className="flex flex-col items-center"
                                  >
                                    <span className="text-6xl font-black tabular-nums tracking-tighter">
                                      +{activeIncomingTransfer.amount}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30 mt-1">Lumière Transmise</span>
                                  </motion.div>
                                  <Sparkles className="absolute top-4 right-4 h-5 w-5 text-primary opacity-20 animate-pulse" />
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Button variant="ghost" onClick={() => router.push("/profil")} className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      <X className="h-4 w-4 mr-2" />
                      Fermer
                    </Button>
                  </TabsContent>

                  <TabsContent value="scan" className="mt-0 h-full">
                    <div className="fixed inset-0 z-0 bg-black flex items-center justify-center">
                      <div id="reader" className="absolute inset-0 w-full h-full" />
                      
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

                      <AnimatePresence>
                        {hasTorch && activeTab === "scan" && (
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="absolute bottom-12 left-0 right-0 z-50 flex justify-center"
                          >
                            <Button
                              onClick={toggleTorch}
                              className={`h-16 w-16 rounded-full shadow-2xl backdrop-blur-3xl border transition-all duration-500 ${isTorchOn ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-primary/40' : 'bg-card/20 border-white/10 text-white'}`}
                            >
                              <Zap className={`h-6 w-6 ${isTorchOn ? 'fill-current animate-pulse' : ''}`} />
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </TabsContent>
                </motion.div>
              ) : recipient && !isSuccess ? (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, y: 40, filter: "blur(20px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
                      <div className="space-y-6">
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Votre Solde Actuel</p>
                          <p className="text-xl font-black">{profile?.totalPoints?.toLocaleString()} <span className="text-xs opacity-20">PTS</span></p>
                        </div>

                        <div className="space-y-4">
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

                          <AnimatePresence>
                            {transferAmount > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pt-2"
                              >
                                <div className="flex items-center justify-between px-2">
                                  <span className="text-[10px] font-bold uppercase opacity-40">Frais de résonance (10%)</span>
                                  <span className="text-[10px] font-black">+{fees} PTS</span>
                                </div>
                                <div className="h-px bg-primary/5 w-full" />
                                <div className="flex items-center justify-between px-2">
                                  <span className="text-[10px] font-black uppercase">Coût total de l'envoi</span>
                                  <span className={`text-sm font-black ${profile?.totalPoints && totalCost > profile.totalPoints ? 'text-red-500' : 'text-primary'}`}>
                                    {totalCost} PTS
                                  </span>
                                </div>
                                {profile?.totalPoints && totalCost > profile.totalPoints && (
                                  <div className="flex items-center gap-2 px-2 text-red-500">
                                    <AlertCircle className="h-3 w-3" />
                                    <p className="text-[9px] font-bold uppercase">Lumière insuffisante pour couvrir les frais</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="px-8 pb-10 flex flex-col gap-3">
                      <Button 
                        onClick={handleTransfer}
                        disabled={isProcessing || !amount || transferAmount <= 0 || (profile?.totalPoints || 0) < totalCost}
                        className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                      >
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                        {isProcessing ? "Transmission..." : "Confirmer le Transfert"}
                      </Button>
                      <Button variant="ghost" onClick={() => { haptic.light(); setRecipient(null); setAmount(""); setActiveTab("qr"); }} className="w-full h-12 text-[10px] font-black uppercase tracking-widest opacity-40">
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

                  <div className="p-8 bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-primary/5 w-full max-w-xs mx-auto space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Montant envoyé</p>
                      <p className="text-4xl font-black tabular-nums">{transferAmount} <span className="text-xs opacity-20">PTS</span></p>
                    </div>
                    <div className="h-px bg-primary/5" />
                    <div className="flex justify-between items-center text-[10px] font-bold opacity-40 uppercase">
                      <span>Frais inclus</span>
                      <span>{fees} PTS</span>
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => { haptic.medium(); router.push("/profil"); }} className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2">
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
        #reader { border: none !important; background: black !important; }
        #reader__scan_region { display: none !important; }
      `}</style>
    </div>
  );
}
