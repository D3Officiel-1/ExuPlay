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
import { Switch } from "@/components/ui/switch";
import { 
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
  Swords,
  ShieldCheck,
  Ghost,
  QrCode,
  Flashlight,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export default function TransfertPage() {
  const { user: firebaseUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("scan");
  const [recipient, setRecipient] = useState<any>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'transfer' | 'duel'>('transfer');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [cachedQr, setCachedQr] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // État pour le FAB et la lampe de poche
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const userDocRef = useMemo(() => {
    if (!db || !firebaseUser?.uid) return null;
    return doc(db, "users", firebaseUser.uid);
  }, [db, firebaseUser?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  const transferAmount = parseInt(amount) || 0;
  const fees = mode === 'transfer' ? Math.floor(transferAmount * 0.1) : 0;
  const totalCost = transferAmount + fees;

  const DAILY_LIMIT = profile?.trustBadge ? 2500 : 500;

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Génération du QR Code
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const loadQr = async () => {
      const stored = localStorage.getItem(`exu_seal_${firebaseUser.uid}`);
      if (stored) {
        setCachedQr(stored);
        return;
      }

      if (activeTab === "generate" && !isGeneratingQr) {
        setIsGeneratingQr(true);
        try {
          const QRCodeStyling = (await import('qr-code-styling')).default;
          const qrCode = new QRCodeStyling({
            width: 600,
            height: 600,
            type: 'canvas',
            data: firebaseUser.uid,
            margin: 20,
            dotsOptions: { color: "#000000", type: "rounded" },
            backgroundOptions: { color: "#ffffff" },
            cornersSquareOptions: { type: "extra-rounded", color: "#000000" },
            cornersDotOptions: { type: "dot", color: "#000000" },
            qrOptions: { errorCorrectionLevel: 'H' }
          });

          const blob = await qrCode.getRawData('png');
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              localStorage.setItem(`exu_seal_${firebaseUser.uid}`, base64);
              setCachedQr(base64);
              setIsGeneratingQr(false);
            };
            reader.readAsDataURL(blob);
          }
        } catch (e) {
          console.error("QR Generation Failed", e);
          setIsGeneratingQr(false);
        }
      }
    };

    loadQr();
  }, [firebaseUser?.uid, activeTab, isGeneratingQr]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        if (isTorchOn) {
          try {
            // @ts-ignore
            await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: false }] });
          } catch (e) {}
        }
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
        setIsTorchOn(false);
      } catch (err) {
        console.warn("Stop scanner error:", err);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initScanner = async () => {
      if (activeTab === "scan" && !recipient && !isSuccess && validationStatus === 'idle') {
        let attempts = 0;
        let container = document.getElementById("reader");
        
        while (!container && attempts < 15) {
          await new Promise(resolve => setTimeout(resolve, 100));
          container = document.getElementById("reader");
          attempts++;
        }

        if (!container || !isMounted) return;

        try {
          await stopScanner();
          if (!isMounted) return;

          const scanner = new Html5Qrcode("reader");
          html5QrCodeRef.current = scanner;

          // Calibration dynamique pour éviter le zoom excessif
          const screenRatio = window.innerWidth / window.innerHeight;

          await scanner.start(
            { facingMode: "environment" },
            { 
              fps: 30, 
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                // On utilise toute la zone pour la détection
                return { width: viewfinderWidth, height: viewfinderHeight };
              },
              aspectRatio: screenRatio,
              videoConstraints: {
                aspectRatio: screenRatio,
                facingMode: "environment",
                // On demande une résolution optimale pour le plein écran
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 }
              }
            },
            (text) => {
              if (isMounted) onScanSuccess(text);
            },
            () => {}
          );
          
          if (isMounted) setHasCameraPermission(true);
        } catch (error: any) {
          console.error("Scanner Error:", error);
          if (isMounted && (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError")) {
            setHasCameraPermission(false);
          }
        }
      } else {
        await stopScanner();
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [activeTab, recipient, isSuccess, validationStatus]);

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner();
    haptic.medium();
    
    if (decodedText === firebaseUser?.uid) {
      haptic.error();
      setErrorMessage("C'est votre propre Sceau");
      setValidationStatus('error');
      setTimeout(() => { 
        setValidationStatus('idle'); 
        setActiveTab("scan"); 
      }, 2500);
      return;
    }

    setValidationStatus('validating');
    
    try {
      const recipientRef = doc(db, "users", decodedText);
      const recipientSnap = await getDoc(recipientRef);
      
      if (recipientSnap.exists()) {
        const data = recipientSnap.data();
        haptic.success();
        setRecipient({ id: decodedText, ...data });
        setValidationStatus('success');
        setTimeout(() => setValidationStatus('idle'), 2000);
      } else {
        haptic.error();
        setErrorMessage("Esprit non identifié");
        setValidationStatus('error');
        setTimeout(() => { 
          setValidationStatus('idle'); 
          setActiveTab("scan"); 
        }, 2500);
      }
    } catch (error) {
      setValidationStatus('error');
      setTimeout(() => { 
        setValidationStatus('idle'); 
        setActiveTab("scan"); 
      }, 2500);
    }
  };

  const toggleTorch = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        const state = !isTorchOn;
        // @ts-ignore
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: state }]
        });
        setIsTorchOn(state);
        haptic.light();
      } catch (err) {
        console.warn("Torch logic failed:", err);
        toast({ 
          variant: "destructive",
          title: "Lumière Indisponible", 
          description: "Le flash ne peut être matérialisé." 
        });
      }
    }
  };

  const handlePickRandomRecipient = async () => {
    setIsProcessing(true);
    haptic.medium();
    setIsFabOpen(false);
    try {
      const q = query(collection(db, "users"), orderBy("totalPoints", "asc"), limit(15));
      const snap = await getDocs(q);
      const others = snap.docs.filter(d => d.id !== firebaseUser?.uid);
      
      if (others.length > 0) {
        const candidates = others.slice(0, 10);
        const randomDoc = candidates[Math.floor(Math.random() * candidates.length)];
        haptic.success();
        setRecipient({ id: randomDoc.id, ...randomDoc.data() });
        setMode('transfer');
        setIsAnonymous(true);
      } else {
        toast({ title: "Solitude", description: "Aucun autre esprit n'a été trouvé." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance réseau" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async () => {
    if (!transferAmount || transferAmount <= 0 || !firebaseUser?.uid || !recipient?.id) return;
    
    if (transferAmount > DAILY_LIMIT) {
      haptic.error();
      toast({ 
        variant: "destructive", 
        title: "Limite dépassée", 
        description: `Votre flux est limité à ${DAILY_LIMIT} PTS.`
      });
      return;
    }

    if ((profile?.totalPoints || 0) < totalCost) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante" });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      const senderRef = doc(db, "users", firebaseUser.uid);
      
      if (mode === 'transfer') {
        const receiverRef = doc(db, "users", recipient.id);
        await updateDoc(senderRef, { totalPoints: increment(-totalCost), updatedAt: serverTimestamp() });
        await updateDoc(receiverRef, { totalPoints: increment(transferAmount), updatedAt: serverTimestamp() });
        await addDoc(collection(db, "transfers"), {
          fromId: isAnonymous ? "anonymous" : firebaseUser.uid,
          fromName: isAnonymous ? "Un Esprit Inconnu" : (profile?.username || "Anonyme"),
          fromPhoto: isAnonymous ? "" : (profile?.profileImage || ""),
          toId: recipient.id,
          amount: transferAmount,
          timestamp: new Date().toISOString(),
          read: false
        });
        haptic.success();
        setIsSuccess(true);
      } else {
        await updateDoc(senderRef, { totalPoints: increment(-transferAmount), updatedAt: serverTimestamp() });
        
        await addDoc(collection(db, "duels"), {
          challengerId: firebaseUser.uid,
          challengerName: profile?.username || "Anonyme",
          challengerPhoto: profile?.profileImage || "",
          opponentId: recipient.id,
          opponentName: recipient.username || "Adversaire",
          opponentPhoto: recipient.profileImage || "",
          wager: transferAmount,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        
        haptic.success();
        toast({ title: "Défi Lancé !", description: "Mise prélevée." });
        router.push("/home");
      }
    } catch (error) {
      haptic.error();
      toast({ variant: "destructive", title: "Erreur de transmission" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <main className={cn("flex-1 mx-auto w-full relative h-full", activeTab !== 'scan' && "max-w-lg")}>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); haptic.light(); }} className="w-full h-full flex flex-col">
          <div className="fixed top-6 left-0 right-0 z-[100] px-6 max-w-lg mx-auto">
            <TabsList className="w-full bg-card/20 backdrop-blur-3xl border border-primary/10 p-1 h-14 rounded-2xl grid grid-cols-2 shadow-2xl">
              <TabsTrigger value="scan" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
                <Scan className="h-4 w-4" /> Scanner
              </TabsTrigger>
              <TabsTrigger value="generate" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
                <QrCode className="h-4 w-4" /> Mon Sceau
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 w-full relative">
            <AnimatePresence mode="wait">
              {validationStatus !== 'idle' ? (
                <motion.div key="validation-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1, filter: "blur(40px)" }} className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center overflow-hidden">
                  <div className="relative flex flex-col items-center">
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-32 w-32 rounded-[3rem] bg-card border-2 shadow-2xl flex items-center justify-center overflow-hidden relative">
                      {validationStatus === 'error' ? <AlertCircle className="h-12 w-12 text-red-500" /> : recipient?.profileImage ? <img src={recipient.profileImage} alt="" className="w-full h-full object-cover" /> : <Sparkles className="h-12 w-12 text-primary opacity-20" />}
                    </motion.div>
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 text-center px-6">
                      {validationStatus === 'error' ? <><h2 className="text-2xl font-black text-red-500">Dissonance</h2><p className="text-[10px] opacity-40 mt-2">{errorMessage}</p></> : <><h2 className="text-2xl font-black">@{recipient?.username}</h2><p className="text-[10px] opacity-40">Résonance Établie</p></>}
                    </motion.div>
                  </div>
                </motion.div>
              ) : activeTab === "generate" ? (
                <motion.div key="generate" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center px-8">
                  <div className="space-y-10 w-full max-w-sm text-center">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Oracle du Sceau</p>
                      <h2 className="text-3xl font-black tracking-tighter italic">Votre Identité Sacrée</h2>
                    </div>

                    <div className="relative group">
                      <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-[-20px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="relative aspect-square bg-white rounded-[3.5rem] p-10 shadow-2xl border-4 border-primary/5 flex items-center justify-center overflow-hidden">
                        {cachedQr ? (
                          <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} src={cachedQr} alt="Mon Sceau" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-4 opacity-20">
                            <Loader2 className="h-12 w-12 animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Matérialisation...</p>
                          </div>
                        )}
                        <div className="absolute inset-0 border-[12px] border-white rounded-[3.5rem] pointer-events-none" />
                      </div>
                    </div>

                    <Button variant="ghost" onClick={() => router.push("/profil")} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity">Retour au Sanctuaire</Button>
                  </div>
                </motion.div>
              ) : !recipient && !isSuccess ? (
                <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full">
                  <TabsContent value="scan" className="mt-0 h-full w-full outline-none fixed inset-0 flex flex-col border-none p-0 z-0">
                    <div id="reader" className="fixed inset-0 w-full h-full bg-black z-0" />
                    
                    {!hasCameraPermission && hasCameraPermission !== null && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-background/90 z-50 text-center">
                        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
                        <h2 className="text-xl font-black">Permission Requise</h2>
                        <p className="text-xs opacity-40 mt-2">Activez la caméra pour scanner les Sceaux.</p>
                        <Button variant="outline" onClick={() => window.location.reload()} className="mt-6 rounded-xl font-black text-[10px] uppercase">Réessayer</Button>
                      </div>
                    )}
                    
                    {/* Menu FAB Cinématique */}
                    <div className="absolute bottom-10 right-6 z-[100] flex flex-col items-end gap-4">
                      <AnimatePresence>
                        {isFabOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.8 }}
                            className="flex flex-col items-end gap-3 mb-2"
                          >
                            <div className="flex items-center gap-3">
                              <span className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white border border-white/10">Oracle de Lumière</span>
                              <Button 
                                size="icon" 
                                onClick={toggleTorch}
                                className={cn(
                                  "h-14 w-14 rounded-2xl backdrop-blur-xl border border-white/20 shadow-2xl transition-all",
                                  isTorchOn ? "bg-white text-black" : "bg-white/10 text-white"
                                )}
                              >
                                <Flashlight className={cn("h-6 w-6", isTorchOn && "fill-current")} />
                              </Button>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white border border-white/10">Répandre l'Éveil</span>
                              <Button 
                                size="icon" 
                                onClick={handlePickRandomRecipient}
                                disabled={isProcessing}
                                className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl"
                              >
                                {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button 
                        onClick={() => { haptic.medium(); setIsFabOpen(!isFabOpen); }}
                        className={cn(
                          "h-16 w-16 rounded-[2rem] shadow-2xl transition-all duration-500",
                          isFabOpen ? "bg-white text-black rotate-45" : "bg-primary text-primary-foreground"
                        )}
                      >
                        <Plus className="h-8 w-8" />
                      </Button>
                    </div>

                    <div className="absolute bottom-10 left-6 z-[50]">
                      <Button variant="ghost" onClick={() => router.push("/profil")} className="text-[10px] font-black uppercase opacity-60 text-white hover:bg-white/5"><X className="h-4 w-4 mr-2" /> Annuler</Button>
                    </div>
                  </TabsContent>
                </motion.div>
              ) : recipient && !isSuccess ? (
                <motion.div key="amount" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen flex flex-col items-center justify-center px-6">
                  <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden w-full">
                    <CardHeader className="text-center pt-10 pb-4">
                      <div className="mx-auto w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-4 relative overflow-hidden">
                        {recipient.profileImage ? <img src={recipient.profileImage} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <User className="h-10 w-10 text-primary opacity-20" />}
                      </div>
                      <CardTitle className="text-2xl font-black">@{recipient.username}</CardTitle>
                      <div className="flex gap-2 justify-center mt-4">
                        <Button variant={mode === 'transfer' ? 'default' : 'ghost'} onClick={() => setMode('transfer')} className="h-10 rounded-full text-[10px] font-black uppercase">Transfert</Button>
                        <Button variant={mode === 'duel' ? 'default' : 'ghost'} onClick={() => setMode('duel')} className="h-10 rounded-full text-[10px] font-black uppercase gap-2"><Swords className="h-3 w-3" /> Duel</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-6 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase opacity-40 ml-2">{mode === 'duel' ? "Mise du duel" : "Montant du transfert"}</Label>
                        <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-16 text-3xl font-black text-center rounded-2xl bg-primary/5 border-none" autoFocus />
                      </div>
                      {mode === 'transfer' && (
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/5">
                          <div className="flex items-center gap-3">
                            <Ghost className={cn("h-5 w-5 transition-colors", isAnonymous ? "text-primary" : "opacity-20")} />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest">Don Anonyme</p>
                              <p className="text-[8px] font-medium opacity-40 uppercase">Masquer votre identité</p>
                            </div>
                          </div>
                          <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="px-8 pb-10 flex flex-col gap-3">
                      <Button onClick={handleAction} disabled={isProcessing || !amount || transferAmount <= 0 || (profile?.totalPoints || 0) < totalCost} className="w-full h-16 rounded-2xl font-black text-sm uppercase gap-3 shadow-xl">
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'duel' ? <Swords className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                        {mode === 'duel' ? "Lancer le Duel" : "Confirmer le Transfert"}
                      </Button>
                      <Button variant="ghost" onClick={() => { setRecipient(null); setActiveTab("scan"); }} className="w-full h-12 text-[10px] font-black uppercase opacity-40">Annuler</Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-8">
                  <div className="relative h-24 w-24 bg-card rounded-[2.5rem] flex items-center justify-center border border-green-500/20 shadow-2xl mx-auto"><CheckCircle2 className="h-12 w-12 text-green-500" /></div>
                  <div className="space-y-2"><h2 className="text-3xl font-black">Transmission Réussie</h2><p className="text-sm opacity-40">Lumière partagée avec @{recipient?.username}.</p></div>
                  <Button variant="outline" onClick={() => router.push("/profil")} className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase gap-2">Retour au Profil <ArrowRight className="h-4 w-4" /></Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </main>
      <style jsx global>{` 
        #reader { 
          border: none !important; 
          background: black !important; 
          height: 100vh !important;
          width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          box-shadow: none !important;
        } 
        #reader video { 
          object-fit: cover !important; 
          width: 100vw !important; 
          height: 100vh !important;
          display: block !important;
          border-radius: 0 !important;
        } 
        #reader__scan_region { 
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #reader__scan_region video {
          border-radius: 0px !important;
          object-fit: cover !important;
        }
        #reader__scan_region div[style*="border"] {
          border: none !important;
          display: none !important;
        }
        #reader__scan_region > div > div {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        #reader__dashboard, 
        #reader__status_span, 
        #reader__header_message { 
          display: none !important; 
        } 
        div[id^="reader__"] {
          border: none !important;
          box-shadow: none !important;
        }
        .html5-qrcode-element {
          border: none !important;
        }
        #reader__scan_region img,
        #reader__scan_region canvas {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
