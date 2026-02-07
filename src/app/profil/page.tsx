"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  orderBy
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Copy, 
  Camera,
  Loader2,
  Edit2,
  Check,
  X,
  Share2,
  ShieldAlert,
  ChevronRight,
  Users,
  QrCode,
  Zap,
  History,
  Shield,
  ShieldCheck,
  Eye,
  Settings,
  Palette,
  Sparkles,
  Gift,
  Smartphone,
  Mars,
  Venus,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { haptic } from "@/lib/haptics";
import { ProfilePhotoDialog } from "@/components/ProfilePhotoDialog";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { getHonorTitle, THEMES } from "@/lib/titles";
import { cn } from "@/lib/utils";

export default function ProfilPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [localProfileImage, setLocalProfileImage] = useState<string | null>(null);
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [isSavingName, setIsSavingName] = useState(false);

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const { scrollY } = useScroll();
  const mainProfileOpacity = useTransform(scrollY, [0, 180], [1, 0]);
  const mainProfileScale = useTransform(scrollY, [0, 180], [1, 0.9]);

  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: profile, loading } = useDoc(userDocRef);

  const recentActivitiesQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "transfers"), where("toId", "==", user.uid), orderBy("timestamp", "desc"), limit(3));
  }, [db, user?.uid]);

  const { data: recentActivities } = useCollection(recentActivitiesQuery);
  const currentTitle = useMemo(() => getHonorTitle(profile?.totalPoints || 0), [profile?.totalPoints]);

  useEffect(() => {
    if (profile?.username) {
      setEditedUsername(profile.username);
    }
    if (profile?.phoneNumber) {
      setEditedPhone(profile.phoneNumber.replace("+225", ""));
    }
  }, [profile]);

  useEffect(() => {
    if (!isEditingName || editedUsername.length < 3 || editedUsername === profile?.username) { setUsernameStatus('idle'); return; }
    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
        const q = query(collection(db, "users"), where("username", "==", editedUsername.toLowerCase()), limit(1));
        const snap = await getDocs(q); setUsernameStatus(snap.empty ? 'available' : 'taken');
      } finally { setCheckingUsername(false); }
    };
    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [editedUsername, db, isEditingName, profile?.username]);

  const isValidPhone = (num: string) => {
    if (num.length !== 10) return false;
    const validPrefixes = ["01", "05", "07"];
    return validPrefixes.some(prefix => num.startsWith(prefix));
  };

  const handleApplyTheme = async (themeId: string) => {
    if (!userDocRef || profile?.activeTheme === themeId) return;
    haptic.medium();
    try { await updateDoc(userDocRef, { activeTheme: themeId, updatedAt: serverTimestamp() }); }
    catch (e) {}
  };

  const handleCopyCode = async () => {
    if (profile?.referralCode) { haptic.light(); await navigator.clipboard.writeText(profile.referralCode); toast({ title: "Code copié" }); }
  };

  const copyMagicLink = async () => {
    if (profile?.referralCode) {
      haptic.medium();
      const magicLink = `${window.location.origin}/login?ref=${profile.referralCode}&u=${encodeURIComponent(profile.username || 'Esprit')}`;
      if (navigator.share) { try { await navigator.share({ url: magicLink }); return; } catch (e) {} }
      await navigator.clipboard.writeText(magicLink); toast({ title: "Lien magique copié" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string; setLocalProfileImage(base64String);
        if (userDocRef) updateDoc(userDocRef, { profileImage: base64String, updatedAt: serverTimestamp() });
      };
      reader.readAsDataURL(file);
    }
  };

  const savePhoneNumber = async () => {
    if (!userDocRef || isSavingPhone || !isValidPhone(editedPhone)) return;
    setIsSavingPhone(true);
    haptic.medium();
    try {
      const fullPhone = `+225${editedPhone}`;
      await updateDoc(userDocRef, {
        phoneNumber: fullPhone,
        updatedAt: serverTimestamp()
      });
      setIsEditingPhone(false);
      toast({ title: "Liaison mise à jour" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la mise à jour" });
    } finally {
      setIsSavingPhone(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>;

  const currentImage = profile?.profileImage || localProfileImage;
  const ownedThemes = profile?.ownedThemes || [];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-10 max-w-lg mx-auto w-full">
        <motion.div style={{ opacity: mainProfileOpacity, scale: mainProfileScale }} className="text-center space-y-6">
          <div className="relative inline-block">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              onContextMenu={(e) => {
                e.preventDefault();
                haptic.medium();
                setIsFullImageOpen(true);
              }}
              onPointerDown={() => {
                longPressTimer.current = setTimeout(() => { 
                  haptic.medium(); 
                  setIsFullImageOpen(true); 
                }, 600);
              }} 
              onPointerUp={() => clearTimeout(longPressTimer.current)} 
              onPointerLeave={() => clearTimeout(longPressTimer.current)}
              className="group active:scale-95 transition-transform"
            >
              <ProfileAvatar imageUrl={currentImage} points={profile?.totalPoints || 0} activeTheme={profile?.activeTheme} isTrusted={profile?.trustBadge} size="xl" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-3 flex flex-col items-center">
            <AnimatePresence mode="wait">
              {!isEditingName ? (
                <motion.div key="display-name" className="group flex items-center gap-3 cursor-pointer" onClick={() => { setIsEditingName(true); haptic.light(); }}>
                  <h1 className="text-3xl font-black tracking-tight uppercase italic">@{profile?.username || "Anonyme"}</h1>
                  <Edit2 className="h-4 w-4 opacity-40" />
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 w-full">
                  <div className="relative w-full max-w-[240px]">
                    <Input 
                      value={editedUsername} 
                      onChange={(e) => setEditedUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} 
                      className="h-14 text-center text-xl font-black rounded-2xl bg-primary/5" 
                      autoFocus 
                      maxLength={15} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {checkingUsername && <Loader2 className="h-4 w-4 animate-spin opacity-40" />}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} className="rounded-xl">Annuler</Button>
                    <Button 
                      size="sm" 
                      className="px-6 rounded-xl" 
                      onClick={async () => { 
                        if (usernameStatus === 'available' && userDocRef) { 
                          setIsSavingName(true); 
                          await updateDoc(userDocRef, { username: editedUsername.trim(), updatedAt: serverTimestamp() }); 
                          setIsEditingName(false); 
                          setIsSavingName(false); 
                          toast({ title: "Identité mise à jour" });
                        } 
                      }} 
                      disabled={usernameStatus !== 'available' || isSavingName}
                    >
                      {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className={cn("px-5 py-2 rounded-full border-2 shadow-lg", currentTitle.bgClass, currentTitle.borderColor)}>
              <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", currentTitle.color)}>{currentTitle.name}</span>
            </div>
          </div>
        </motion.div>

        {ownedThemes.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 px-4">
              <Palette className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Sélecteur d'Aura</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-6 flex gap-6 overflow-x-auto no-scrollbar items-center justify-center">
                <button 
                  onClick={() => handleApplyTheme("default")} 
                  className={cn(
                    "h-16 w-16 shrink-0 rounded-[1.5rem] border-2 transition-all flex items-center justify-center", 
                    (profile?.activeTheme === "default" || !profile?.activeTheme) 
                      ? "border-primary bg-primary/10 shadow-xl scale-110" 
                      : "border-transparent bg-background/50 opacity-40"
                  )}
                >
                  <Sparkles className="h-6 w-6" />
                </button>
                {ownedThemes.map((tid: string) => {
                  const theme = THEMES[tid];
                  const isActive = profile?.activeTheme === tid;
                  if (!theme) return null;
                  
                  return (
                    <button 
                      key={tid} 
                      onClick={() => handleApplyTheme(tid)} 
                      className={cn(
                        "h-16 w-16 shrink-0 rounded-[1.5rem] border-2 transition-all flex items-center justify-center bg-card/80",
                        isActive ? theme.borderColor + " scale-110" : "border-transparent opacity-60"
                      )}
                    >
                      <div className={cn("h-6 w-6 rounded-full shadow-inner", theme.color.replace('text-', 'bg-'))} />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-5">
          <div className="flex items-center gap-3 px-4">
            <User className="h-4 w-4 opacity-40" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Identité de l'Esprit</h2>
          </div>
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between px-2 min-h-[40px]">
                <div className="flex items-center gap-3 opacity-40">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Liaison Wave</span>
                </div>
                <AnimatePresence mode="wait">
                  {!isEditingPhone ? (
                    <motion.div 
                      key="phone-display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => { setIsEditingPhone(true); haptic.light(); }}
                    >
                      <span className="text-sm font-bold">{profile?.phoneNumber || "Non lié"}</span>
                      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="phone-input"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex items-center gap-1.5 bg-primary/5 rounded-xl px-3 py-1.5 border border-primary/5">
                        <span className="text-[10px] font-black opacity-40">+225</span>
                        <input 
                          value={editedPhone} 
                          onChange={(e) => setEditedPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="bg-transparent border-none outline-none text-sm font-bold w-24 p-0"
                          placeholder="07..."
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setIsEditingPhone(false)}
                          className="h-8 w-8 rounded-full flex items-center justify-center bg-destructive/10 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={savePhoneNumber}
                          disabled={!isValidPhone(editedPhone) || isSavingPhone}
                          className="h-8 w-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-20"
                        >
                          {isSavingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="h-px bg-primary/5 w-full" />
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 opacity-40">
                  {profile?.gender === 'masculin' ? <Mars className="h-4 w-4" /> : <Venus className="h-4 w-4" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">Nature</span>
                </div>
                <span className="text-sm font-bold uppercase">{profile?.gender === 'masculin' ? 'Homme' : 'Femme'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {profile?.role === 'admin' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 px-4">
              <ShieldCheck className="h-4 w-4 text-primary opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Commandement</h2>
            </div>
            <Card className="border-none bg-primary text-primary-foreground shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-2">
                <button 
                  onClick={() => { haptic.medium(); router.push("/admin"); }}
                  className="w-full flex items-center justify-between p-6 hover:bg-primary-foreground/10 transition-colors rounded-[2rem] group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-base font-black">Espace Maître</p>
                      <p className="text-[10px] opacity-60 font-medium uppercase tracking-widest">Gérer le Sanctuaire</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-5">
          <div className="flex items-center gap-3 px-4">
            <Settings className="h-4 w-4 opacity-40" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Configuration</h2>
          </div>
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-2">
              <button 
                onClick={() => { haptic.light(); router.push("/parametres"); }}
                className="w-full flex items-center justify-between p-6 hover:bg-primary/5 transition-colors rounded-[2rem] group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center">
                    <Settings className="h-6 w-6 text-primary opacity-60" />
                  </div>
                  <div>
                    <p className="text-base font-black">Paramètres de l'Esprit</p>
                    <p className="text-[10px] opacity-40 font-medium uppercase tracking-widest">Aura, Sécurité & Sagesse</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-60 transition-opacity" />
              </button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] p-8 space-y-10">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Lumière Totale</p>
            <h2 className="text-6xl font-black tabular-nums">{profile?.totalPoints?.toLocaleString() || 0}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => router.push("/transfert")} className="h-20 rounded-[2.2rem] font-black text-[10px] uppercase gap-3 shadow-xl"><QrCode className="h-5 w-5" /> Transférer</Button>
            <div className="bg-primary/5 rounded-[2.2rem] flex items-center justify-center gap-4"><span className="text-2xl font-black">{profile?.hintCount || 0}</span><Eye className="h-6 w-6 opacity-20" /></div>
          </div>
        </Card>

        <Card className="border-none bg-primary text-primary-foreground shadow-2xl rounded-[3rem] p-8 space-y-10 relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Gift className="h-40 w-40" /></div>
          <div className="space-y-3 relative z-10 text-center">
            <p className="text-[10px] font-black uppercase opacity-50">Sceau de Parrainage</p>
            <div onClick={handleCopyCode} className="bg-primary-foreground/10 p-8 rounded-[2.5rem] flex items-center justify-center cursor-pointer shadow-inner">
              <span className="text-5xl font-black italic">{profile?.referralCode || "------"}</span>
            </div>
          </div>
          <Button variant="secondary" onClick={copyMagicLink} className="w-full h-20 rounded-[2.2rem] font-black text-xs uppercase bg-primary-foreground text-primary relative z-10"><Share2 className="h-6 w-6" /> Lien Magique</Button>
        </Card>
      </main>
      <ProfilePhotoDialog isOpen={isFullImageOpen} onOpenChange={setIsFullImageOpen} imageUrl={currentImage} username={profile?.username || "Anonyme"} />
    </div>
  );
}
