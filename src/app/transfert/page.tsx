
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
  Swords,
  ShieldCheck,
  Ghost
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { useTheme } from "next-themes";
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
  const [mode, setMode] = useState<'transfer' | 'duel'>('transfer');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  const transferAmount = parseInt(amount) || 0;
  const fees = mode === 'transfer' ? Math.floor(transferAmount * 0.1) : 0;
  const totalCost = transferAmount + fees;

  const DAILY_LIMIT = profile?.trustBadge ? 2500 : 500;

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
    if (activeTab === "qr" && !recipient && !isSuccess && validationStatus === 'idle') {
      const timer = setTimeout(() => generateQRCode(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, user?.uid, resolvedTheme, recipient, isSuccess, validationStatus]);

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
                if ((capabilities as any).torch) setHasTorch(true);
              } catch (e) {}
            }
          } catch (error: any) {
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
    return () => { isMounted = false; clearTimeout(scannerTimeout); stopScanner(); };
  }, [activeTab, recipient, isSuccess, validationStatus]);

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner();
    haptic.medium();
    
    if (decodedText === user?.uid) {
      haptic.error();
      setErrorMessage("C'est votre propre Sceau");
      setValidationStatus('error');
      setTimeout(() => { setValidationStatus('idle'); setActiveTab("scan"); }, 2500);
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
        setTimeout(() => { setValidationStatus('idle'); setActiveTab("scan"); }, 2500);
      }
    } catch (error) {
      setValidationStatus('error');
      setTimeout(() => { setValidationStatus('idle'); setActiveTab("scan"); }, 2500);
    }
  };

  const onScanFailure = () => {};

  /**
   * @fileOverview Logique de Redistribution de l'Équilibre.
   * Recherche les esprits les plus "pauvres" en points pour encourager leur éveil.
   */
  const handlePickRandomRecipient = async () => {
    setIsProcessing(true);
    haptic.medium();
    try {
      // LOGIQUE : On cible les 10 utilisateurs ayant le moins de points (les Adeptes)
      const q = query(collection(db, "users"), orderBy("totalPoints", "asc"), limit(15));
      const snap = await getDocs(q);
      const others = snap.docs.filter(d => d.id !== user?.uid);
      
      if (others.length > 0) {
        // On pioche au hasard parmi les 10 premiers (les plus faibles)
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
    if (!transferAmount || transferAmount <= 0 || !user?.uid || !recipient?.id) return;
    
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
      if (mode === 'transfer') {
        const senderRef = doc(db, "users", user.uid);
        const receiverRef = doc(db, "users", recipient.id);
        await updateDoc(senderRef, { totalPoints: increment(-totalCost), updatedAt: serverTimestamp() });
        await updateDoc(receiverRef, { totalPoints: increment(transferAmount), updatedAt: serverTimestamp() });
        await addDoc(collection(db, "transfers"), {
          fromId: isAnonymous ? "anonymous" : user.uid,
          fromName: isAnonymous ? "Un Esprit Inconnu" : (profile?.username || "Anonyme"),
          fromPhoto: isAnonymous ? "" : (profile?.profileImage || ""),
          toId: recipient.id,
          amount: transferAmount,
          fees: fees,
          timestamp: new Date().toISOString(),
          read: false
        });
        haptic.success();
        setIsSuccess(true);
      } else {
        await addDoc(collection(db, "duels"), {
          challengerId: user.uid,
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
        toast({ title: "Défi Lancé !", description: "Attendez que votre adversaire accepte le duel." });
        router.push("/home");
      }
    } catch (error) {
      haptic.error();
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <main className="flex-1 max-w-lg mx-auto w-full relative h-full">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); haptic.light(); }} className="w-full h-full flex flex-col">
          <div className="fixed top-6 left-0 right-0 z-[100] px-6 max-w-lg mx-auto">
            <TabsList className="w-full bg-card/20 backdrop-blur-3xl border border-primary/10 p-1 h-14 rounded-2xl grid grid-cols-2 shadow-2xl">
              <TabsTrigger value="qr" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
                <QrCode className="h-4 w-4" /> Mon Sceau
              </TabsTrigger>
              <TabsTrigger value="scan" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
                <Scan className="h-4 w-4" /> Scanner
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 w-full relative">
            <AnimatePresence mode="wait">
              {validationStatus !== 'idle' ? (
                <motion.div key="validation-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }} className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center overflow-hidden">
                  <div className="relative flex flex-col items-center">
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-32 w-32 rounded-[3rem] bg-card border-2 shadow-2xl flex items-center justify-center overflow-hidden relative">
                      {validationStatus === 'error' ? <AlertCircle className="h-12 w-12 text-red-500" /> : recipient?.profileImage ? <img src={recipient.profileImage} alt="" className="w-full h-full object-cover" /> : <Sparkles className="h-12 w-12 text-primary opacity-20" />}
                    </motion.div>
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 text-center px-6">
                      {validationStatus === 'error' ? <><h2 className="text-2xl font-black text-red-500">Dissonance</h2><p className="text-[10px] opacity-40 mt-2">{errorMessage}</p></> : <><h2 className="text-2xl font-black">@{recipient?.username}</h2><p className="text-[10px] opacity-40">Résonance Établie</p></>}
                    </motion.div>
                  </div>
                </motion.div>
              ) : !recipient && !isSuccess ? (
                <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <TabsContent value="qr" className="mt-0 h-full flex flex-col items-center justify-start pt-28 px-6 space-y-8">
                    <div className="relative group flex justify-center w-full max-w-[340px]">
                      <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 blur-[60px] rounded-full bg-primary" />
                      <Card className="border-none bg-card/60 backdrop-blur-3xl shadow-2xl rounded-[3.5rem] overflow-hidden relative w-full">
                        <CardContent className="p-8 flex flex-col items-center gap-6">
                          <div className={`w-full aspect-square rounded-[3rem] flex items-center justify-center p-4 shadow-2xl transition-colors duration-500 ${resolvedTheme === 'dark' ? 'bg-white' : 'bg-black'}`} ref={qrRef} />
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4 w-full px-4">
                      <Button 
                        onClick={handlePickRandomRecipient}
                        disabled={isProcessing}
                        className="w-full h-16 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] gap-3 bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10"
                      >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Répandre l'Éveil
                      </Button>
                      
                      <div className="flex flex-col items-center gap-2">
                        {profile?.trustBadge && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full shadow-inner">
                            <ShieldCheck className="h-3 w-3 text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Flux Étendu : {DAILY_LIMIT} PTS</span>
                          </div>
                        )}
                        <Button variant="ghost" onClick={() => router.push("/profil")} className="text-[10px] font-black uppercase opacity-40"><X className="h-4 w-4 mr-2" /> Fermer</Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="scan" className="mt-0 h-full">
                    <div id="reader" className="absolute inset-0 w-full h-full bg-black" />
                    {hasCameraPermission === false && <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-background/90 z-50 text-center"><ShieldAlert className="h-12 w-12 text-destructive mb-4" /><h2 className="text-xl font-black">Permission Requise</h2><Button variant="outline" onClick={() => window.location.reload()} className="mt-4 rounded-xl">Réessayer</Button></div>}
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

                      <div className="flex justify-between items-center px-2">
                        <div className="space-y-1">
                          {transferAmount > 0 && mode === 'transfer' && (
                            <p className="text-[10px] font-bold uppercase opacity-40">
                              Total : {totalCost} PTS
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-20">Limite : {DAILY_LIMIT} PTS</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="px-8 pb-10 flex flex-col gap-3">
                      <Button onClick={handleAction} disabled={isProcessing || !amount || transferAmount <= 0 || (profile?.totalPoints || 0) < totalCost} className="w-full h-16 rounded-2xl font-black text-sm uppercase gap-3 shadow-xl">
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'duel' ? <Swords className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                        {mode === 'duel' ? "Lancer le Duel" : "Confirmer le Transfert"}
                      </Button>
                      <Button variant="ghost" onClick={() => { setRecipient(null); setActiveTab("qr"); }} className="w-full h-12 text-[10px] font-black uppercase opacity-40">Annuler</Button>
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
      <style jsx global>{` #reader video { object-fit: cover !important; width: 100vw !important; height: 100vh !important; position: fixed !important; top: 0 !important; left: 0 !important; } #reader { border: none !important; background: black !important; } #reader__scan_region { display: none !important; } `}</style>
    </div>
  );
}
