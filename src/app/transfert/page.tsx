
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  query, 
  collection, 
  where,
  addDoc
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2, 
  CheckCircle2, 
  Scan,
  User,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  Swords,
  Ghost,
  QrCode,
  Flashlight,
  Percent,
  TrendingUp
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
  const [isTorchOn, setIsTorchOn] = useState(false);

  const userDocRef = useMemo(() => (db && firebaseUser?.uid) ? doc(db, "users", firebaseUser.uid) : null, [db, firebaseUser?.uid]);
  const appStatusRef = useMemo(() => (db ? doc(db, "appConfig", "status") : null), [db]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);
  const { data: appStatus, loading: configLoading } = useDoc(appStatusRef);

  // --- LOGIQUE DES LIMITES QUOTIDIENNES ---
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const todayTransfersQuery = useMemoFirebase(() => {
    if (!db || !firebaseUser?.uid) return null;
    return query(
      collection(db, "transfers"),
      where("fromId", "==", firebaseUser.uid),
      where("timestamp", ">=", today)
    );
  }, [db, firebaseUser?.uid, today]);

  const { data: todayTransfers } = useCollection(todayTransfersQuery);

  const sentToday = useMemo(() => {
    if (!todayTransfers) return 0;
    return todayTransfers.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [todayTransfers]);

  const dailyLimit = profile?.trustBadge 
    ? (appStatus?.dailyTransferLimitTrusted ?? 2500) 
    : (appStatus?.dailyTransferLimitDefault ?? 500);

  const remainingLimit = Math.max(0, dailyLimit - sentToday);
  // -----------------------------------------

  const transferAmount = parseInt(amount) || 0;
  const transferFeePercent = appStatus?.transferFeePercent ?? 10;
  const fees = mode === 'transfer' ? Math.floor(transferAmount * (transferFeePercent / 100)) : 0;
  const totalCost = transferAmount + fees;

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const loadQr = async () => {
      const stored = localStorage.getItem(`exu_seal_${firebaseUser.uid}`);
      if (stored) { setCachedQr(stored); return; }
      if (activeTab === "generate" && !isGeneratingQr) {
        setIsGeneratingQr(true);
        try {
          const QRCodeStyling = (await import('qr-code-styling')).default;
          const qrCode = new QRCodeStyling({
            width: 600, height: 600, type: 'canvas', data: firebaseUser.uid, margin: 20,
            dotsOptions: { color: "#000000", type: "rounded" }, backgroundOptions: { color: "#ffffff" },
            cornersSquareOptions: { type: "extra-rounded", color: "#000000" }, cornersDotOptions: { type: "dot", color: "#000000" },
            qrOptions: { errorCorrectionLevel: 'H' }
          });
          const blob = await qrCode.getRawData('png');
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => { const base64 = reader.result as string; localStorage.setItem(`exu_seal_${firebaseUser.uid}`, base64); setCachedQr(base64); setIsGeneratingQr(false); };
            reader.readAsDataURL(blob);
          }
        } catch (e) { setIsGeneratingQr(false); }
      }
    };
    loadQr();
  }, [firebaseUser?.uid, activeTab, isGeneratingQr]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        if (isTorchOn) { try { await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: false }] }); } catch (e) {} }
        await html5QrCodeRef.current.stop(); html5QrCodeRef.current = null; setIsTorchOn(false);
      } catch (err) {}
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initScanner = async () => {
      if (activeTab === "scan" && !recipient && !isSuccess && validationStatus === 'idle') {
        let container = document.getElementById("reader");
        while (!container && isMounted) { await new Promise(r => setTimeout(r, 100)); container = document.getElementById("reader"); }
        if (!container || !isMounted) return;
        try {
          await stopScanner(); if (!isMounted) return;
          const scanner = new Html5Qrcode("reader"); html5QrCodeRef.current = scanner;
          await scanner.start({ facingMode: "environment" }, { 
            fps: 30, qrbox: (w, h) => ({ width: w * 0.8, height: h * 0.8 }),
            aspectRatio: 1.0,
            videoConstraints: { facingMode: "environment" }
          }, (text) => { if (isMounted) onScanSuccess(text); }, () => {});
          if (isMounted) setHasCameraPermission(true);
        } catch (e: any) { if (isMounted && (e?.name === "NotAllowedError")) setHasCameraPermission(false); }
      } else { await stopScanner(); }
    };
    initScanner();
    return () => { isMounted = false; stopScanner(); };
  }, [activeTab, recipient, isSuccess, validationStatus]);

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner(); haptic.medium();
    if (decodedText === firebaseUser?.uid) {
      haptic.error(); setErrorMessage("C'est votre propre Sceau"); setValidationStatus('error');
      setTimeout(() => { setValidationStatus('idle'); setActiveTab("scan"); }, 2500); return;
    }
    setValidationStatus('validating');
    try {
      const recipientRef = doc(db, "users", decodedText); const snap = await getDoc(recipientRef);
      if (snap.exists()) { 
        const data = snap.data();
        setRecipient({ id: decodedText, ...data }); 
        setValidationStatus('success'); 
        if (data.duelProtected) setMode('transfer');
        setTimeout(() => setValidationStatus('idle'), 2000); 
      }
      else { setErrorMessage("Esprit inconnu"); setValidationStatus('error'); setTimeout(() => { setValidationStatus('idle'); setActiveTab("scan"); }, 2500); }
    } catch (error) { setValidationStatus('error'); setTimeout(() => { setValidationStatus('idle'); setActiveTab("scan"); }, 2500); }
  };

  const toggleTorch = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        const state = !isTorchOn;
        await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: state }] });
        setIsTorchOn(state); haptic.light();
      } catch (err) { toast({ variant: "destructive", title: "Flash indisponible" }); }
    }
  };

  const handleAction = async () => {
    if (!transferAmount || transferAmount <= 0 || !firebaseUser?.uid || !recipient?.id) return;
    
    // Vérification de la solvabilité de l'opposant pour le duel
    if (mode === 'duel' && (recipient.totalPoints || 0) < transferAmount) {
      haptic.error();
      toast({ 
        variant: "destructive", 
        title: "Lumière Insuffisante", 
        description: `@${recipient.username} n'a pas assez de points pour ce pari.` 
      });
      return;
    }

    // Vérification de la limite de flux cumulée
    if (transferAmount > remainingLimit && mode === 'transfer') { 
      haptic.error();
      toast({ 
        variant: "destructive", 
        title: "Plafond atteint", 
        description: `Il ne vous reste que ${remainingLimit} PTS de flux aujourd'hui.` 
      }); 
      return; 
    }

    if ((profile?.totalPoints || 0) < totalCost) { 
      haptic.error();
      toast({ 
        variant: "destructive", 
        title: "Lumière insuffisante", 
        description: `Il vous faut ${totalCost} PTS (incluant les frais).` 
      }); 
      return; 
    }

    setIsProcessing(true); haptic.medium();
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
          toId: recipient.id, amount: transferAmount, timestamp: new Date().toISOString(), read: false
        });
        setIsSuccess(true);
      } else {
        if (recipient.duelProtected) {
          toast({ variant: "destructive", title: "Action impossible", description: "Cet esprit est sous le Sceau de Paix." });
          return;
        }
        await updateDoc(senderRef, { totalPoints: increment(-transferAmount), updatedAt: serverTimestamp() });
        
        const participants: Record<string, any> = {
          [firebaseUser.uid]: {
            name: profile?.username || "Anonyme",
            photo: profile?.profileImage || "",
            status: 'accepted'
          },
          [recipient.id]: {
            name: recipient.username || "Anonyme",
            photo: recipient.profileImage || "",
            status: 'pending'
          }
        };

        await addDoc(collection(db, "duels"), {
          challengerId: firebaseUser.uid, 
          challengerName: profile?.username || "Anonyme", 
          challengerPhoto: profile?.profileImage || "",
          participantIds: [firebaseUser.uid, recipient.id],
          participants,
          wager: transferAmount, 
          status: 'pending', 
          createdAt: serverTimestamp(),
          round: 1
        });
        toast({ title: "Défi Lancé !" }); router.push("/home");
      }
    } finally { setIsProcessing(false); }
  };

  if (profileLoading || configLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <main className="flex-1 mx-auto w-full relative h-full max-w-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <div className="fixed top-6 left-0 right-0 z-[100] px-6 max-w-lg mx-auto">
            <TabsList className="w-full bg-card/20 backdrop-blur-3xl border border-primary/10 p-1 h-14 rounded-2xl grid grid-cols-2 shadow-2xl">
              <TabsTrigger value="scan" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2"><Scan className="h-4 w-4" /> Scanner</TabsTrigger>
              <TabsTrigger value="generate" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2"><QrCode className="h-4 w-4" /> Mon Sceau</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 w-full relative pt-24 pb-32">
            <AnimatePresence mode="wait">
              {validationStatus !== 'idle' ? (
                <motion.div key="validation-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1, filter: "blur(40px)" }} className="absolute inset-0 z-[200] bg-background flex flex-col items-center justify-center overflow-hidden">
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="h-32 w-32 rounded-[3rem] bg-card border-2 shadow-2xl flex items-center justify-center overflow-hidden relative">
                    {validationStatus === 'error' ? <AlertCircle className="h-12 w-12 text-red-500" /> : recipient?.profileImage ? <img src={recipient.profileImage} alt="" className="w-full h-full object-cover" /> : <Sparkles className="h-12 w-12 text-primary opacity-20" />}
                  </motion.div>
                  <h2 className="mt-8 text-2xl font-black">{validationStatus === 'error' ? "Dissonance" : `@${recipient?.username}`}</h2>
                </motion.div>
              ) : activeTab === "generate" ? (
                <motion.div key="generate" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col items-center justify-center px-8 text-center space-y-10">
                  <div className="space-y-2"><p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Oracle du Sceau</p><h2 className="text-3xl font-black italic">Identité Sacrée</h2></div>
                  <div className="relative w-64 h-64 bg-white rounded-[3.5rem] p-8 shadow-2xl border-4 border-primary/5 flex items-center justify-center overflow-hidden">
                    {cachedQr ? <img src={cachedQr} alt="Sceau" className="w-full h-full object-contain" /> : <Loader2 className="h-12 w-12 animate-spin opacity-20" />}
                  </div>
                  <Button variant="ghost" onClick={() => router.push("/profil")} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Retour</Button>
                </motion.div>
              ) : !recipient && !isSuccess ? (
                <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full px-6 space-y-8">
                  <div className="relative w-full aspect-square rounded-[3.5rem] overflow-hidden bg-black border-2 border-primary/10 shadow-2xl group">
                    <div id="reader" className="w-full h-full" />
                    {!hasCameraPermission && hasCameraPermission !== null && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-background/90 z-50 text-center">
                        <ShieldAlert className="h-12 w-12 text-destructive mb-4" /><h2 className="text-xl font-black">Permission Requise</h2>
                        <Button variant="outline" onClick={() => window.location.reload()} className="mt-6 rounded-xl font-black text-[10px] uppercase">Réessayer</Button>
                      </div>
                    )}
                    <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-8 border-2 border-primary/20 border-dashed rounded-[2.5rem] pointer-events-none" />
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 text-center px-10">
                    Alignez le Sceau de l'esprit à scanner dans le cadre
                  </p>

                  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]">
                    <Button 
                      size="icon" 
                      onClick={toggleTorch} 
                      className={cn(
                        "h-16 w-16 rounded-[2rem] shadow-2xl transition-all", 
                        isTorchOn ? "bg-primary text-primary-foreground" : "bg-card/40 backdrop-blur-xl text-primary border border-primary/10"
                      )}
                    >
                      <Flashlight className="h-8 w-8" />
                    </Button>
                  </div>
                </motion.div>
              ) : recipient && !isSuccess ? (
                <motion.div key="amount" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col items-center justify-center px-6">
                  <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden w-full">
                    <CardHeader className="text-center pt-10 pb-4">
                      <div className="mx-auto w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-4 overflow-hidden relative">
                        {recipient.profileImage ? <img src={recipient.profileImage} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <User className="h-10 w-10 opacity-20" />}
                      </div>
                      <CardTitle className="text-2xl font-black">@{recipient.username}</CardTitle>
                      <div className="flex gap-2 justify-center mt-4">
                        <Button variant={mode === 'transfer' ? 'default' : 'ghost'} onClick={() => setMode('transfer')} className="h-10 rounded-full text-[10px] font-black uppercase">Transfert</Button>
                        {!recipient.duelProtected && (
                          <Button variant={mode === 'duel' ? 'default' : 'ghost'} onClick={() => setMode('duel')} className="h-10 rounded-full text-[10px] font-black uppercase gap-2"><Swords className="h-3 w-3" /> Duel</Button>
                        )}
                      </div>
                      {recipient.duelProtected && (
                        <div className="mt-4 px-4 py-2 bg-primary/5 rounded-full flex items-center justify-center gap-2 border border-primary/5">
                          <Swords className="h-3 w-3 opacity-20" />
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Protégé par le Sceau de Paix</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="px-8 pb-6 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Montant</Label>
                        <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-16 text-3xl font-black text-center rounded-2xl bg-primary/5 border-none" autoFocus />
                      </div>

                      {mode === 'transfer' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                            <div className="flex items-center gap-2 opacity-60">
                              <Percent className="h-3 w-3" />
                              <span className="text-[10px] font-black uppercase">Taxe de flux ({transferFeePercent}%)</span>
                            </div>
                            <span className="text-xs font-black text-orange-600">+{fees} PTS</span>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/5">
                            <div className="flex items-center gap-3">
                              <Ghost className={cn("h-5 w-5", isAnonymous ? "text-primary" : "opacity-20")} />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mode Anonyme</span>
                            </div>
                            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="px-8 pb-10 flex flex-col gap-3">
                      <Button onClick={handleAction} disabled={isProcessing || !amount || transferAmount <= 0} className="w-full h-16 rounded-2xl font-black text-sm uppercase shadow-xl">
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'duel' ? "Lancer le Duel" : "Confirmer"}
                      </Button>
                      
                      <div className="w-full p-4 bg-primary/5 rounded-xl border border-primary/5 space-y-2">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-40">
                          <span>Flux Journalier</span>
                          <span>{sentToday + transferAmount} / {dailyLimit} PTS</span>
                        </div>
                        <div className="h-1 bg-primary/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, ((sentToday + transferAmount) / dailyLimit) * 100)}%` }}
                            className={cn("h-full transition-colors", (sentToday + transferAmount) > dailyLimit ? "bg-red-500" : "bg-primary")}
                          />
                        </div>
                        <p className="text-[7px] text-center font-bold opacity-30 uppercase">
                          {remainingLimit >= transferAmount 
                            ? `Il vous reste ${remainingLimit} points de flux aujourd'hui.` 
                            : "Capacité de flux quotidienne insuffisante."}
                        </p>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-8 px-6">
                  <div className="h-32 w-32 bg-green-500/10 rounded-[3rem] flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-black italic">Transmission Réussie</h2>
                  <Button variant="outline" onClick={() => router.push("/profil")} className="h-14 w-full rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]">Retour au Sanctuaire</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </main>
      <style jsx global>{` 
        #reader { border: none !important; background: black !important; width: 100% !important; height: 100% !important; } 
        #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; } 
        #reader__scan_region { border: none !important; } 
        #reader__dashboard, #reader__status_span, #reader__header_message { display: none !important; } 
      `}</style>
    </div>
  );
}
