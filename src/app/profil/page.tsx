
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
  Gift
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

  const [isChangingTheme, setIsChangingTheme] = useState(false);

  const { scrollY } = useScroll();
  const mainProfileOpacity = useTransform(scrollY, [0, 180], [1, 0]);
  const mainProfileScale = useTransform(scrollY, [0, 180], [1, 0.9]);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  const recentActivitiesQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "transfers"),
      where("toId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(3)
    );
  }, [db, user?.uid]);

  const { data: recentActivities } = useCollection(recentActivitiesQuery);

  const currentTitle = useMemo(() => getHonorTitle(profile?.totalPoints || 0), [profile?.totalPoints]);

  useEffect(() => {
    const savedImage = localStorage.getItem("exu_profile_image");
    if (savedImage) setLocalProfileImage(savedImage);
  }, []);

  useEffect(() => {
    if (!isEditingName || editedUsername.length < 3 || editedUsername === profile?.username) {
      setUsernameStatus('idle');
      return;
    }
    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
        const q = query(collection(db, "users"), where("username", "==", editedUsername.toLowerCase()), limit(1));
        const querySnapshot = await getDocs(q);
        setUsernameStatus(querySnapshot.empty ? 'available' : 'taken');
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingUsername(false);
      }
    };
    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [editedUsername, db, isEditingName, profile?.username]);

  const handleApplyTheme = async (themeId: string) => {
    if (!userDocRef || profile?.activeTheme === themeId) return;
    haptic.medium();
    setIsChangingTheme(true);
    try {
      await updateDoc(userDocRef, {
        activeTheme: themeId,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Aura harmonisée", description: "Votre nouveau sceau est actif." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsChangingTheme(false);
    }
  };

  const handleCopyCode = async () => {
    if (profile?.referralCode) {
      haptic.light();
      try {
        await navigator.clipboard.writeText(profile.referralCode);
        toast({ title: "Code copié", description: "Le sceau de parrainage est prêt." });
      } catch (err) {}
    }
  };

  const copyMagicLink = async () => {
    if (profile?.referralCode) {
      haptic.medium();
      const baseUrl = window.location.origin;
      const magicLink = `${baseUrl}/login?ref=${profile.referralCode}&u=${encodeURIComponent(profile.username || 'Esprit')}`;
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'Rejoins-moi sur Exu Play !', url: magicLink });
          return;
        } catch (error) {}
      }
      try {
        await navigator.clipboard.writeText(magicLink);
        toast({ title: "Lien magique copié" });
      } catch (err) {}
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Fichier trop lourd" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLocalProfileImage(base64String);
        if (user?.uid && db) {
          updateDoc(doc(db, "users", user.uid), { profileImage: base64String, updatedAt: serverTimestamp() });
        }
      };
      reader.readAsDataURL(file);
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
              onPointerDown={() => longPressTimer.current = setTimeout(() => { haptic.medium(); setIsFullImageOpen(true); }, 600)} 
              onPointerUp={() => clearTimeout(longPressTimer.current)} 
              className="group active:scale-95 transition-transform"
            >
              <ProfileAvatar imageUrl={currentImage} points={profile?.totalPoints || 0} activeTheme={profile?.activeTheme} isTrusted={profile?.trustBadge} size="xl" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm h-10 w-10 rounded-full flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-3 flex flex-col items-center">
            <AnimatePresence mode="wait">
              {!isEditingName ? (
                <motion.div 
                  key="display-name" 
                  className="group flex items-center gap-3 cursor-pointer" 
                  onClick={() => { haptic.light(); setEditedUsername(profile?.username || ""); setIsEditingName(true); }}
                >
                  <h1 className="text-3xl font-black tracking-tight uppercase italic">@{profile?.username || "Anonyme"}</h1>
                  <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
                </motion.div>
              ) : (
                <motion.div key="edit-name" className="flex flex-col items-center gap-3 w-full">
                  <div className="relative w-full max-w-[280px]">
                    <Input 
                      value={editedUsername} 
                      onChange={(e) => setEditedUsername(e.target.value.replace(/\s/g, '').toLowerCase())} 
                      className="h-14 text-center text-xl font-black uppercase rounded-2xl pr-12 bg-primary/5 border-none" 
                      autoFocus 
                      maxLength={15} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {checkingUsername ? <Loader2 className="h-4 w-4 animate-spin opacity-40" /> : (
                        usernameStatus === 'available' ? <Check className="h-4 w-4 text-green-500" /> : 
                        usernameStatus === 'taken' ? <X className="h-4 w-4 text-red-500" /> : null
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setIsEditingName(false)}>Annuler</Button>
                    <Button 
                      size="sm" 
                      className="rounded-xl px-6" 
                      onClick={async () => { if (usernameStatus !== 'available' || !user?.uid) return; setIsSavingName(true); await updateDoc(doc(db, "users", user.uid), { username: editedUsername.toLowerCase().trim(), updatedAt: serverTimestamp() }); setIsEditingName(false); setIsSavingName(false); }} 
                      disabled={usernameStatus !== 'available' || isSavingName}
                    >
                      {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!isEditingName && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("px-5 py-2 rounded-full flex items-center gap-2 border-2 transition-all duration-700 shadow-lg", currentTitle.bgClass, currentTitle.borderColor)}>
                  <Shield className={cn("h-3.5 w-3.5", currentTitle.color)} />
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", currentTitle.color)}>{currentTitle.name}</span>
                </motion.div>
                {profile?.trustBadge && (
                  <div className="px-5 py-2 rounded-full flex items-center gap-2 border-2 border-primary/20 bg-primary/5 shadow-inner">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Sceau Certifié</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Sélecteur d'Aura Magnifié */}
        {ownedThemes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            <div className="flex items-center gap-3 px-4">
              <Palette className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Sélecteur d'Aura</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-6 flex gap-4 overflow-x-auto no-scrollbar items-center justify-center">
                <button 
                  onClick={() => handleApplyTheme("default")}
                  className={cn(
                    "flex-shrink-0 h-16 w-16 rounded-[1.5rem] border-2 transition-all flex items-center justify-center relative group",
                    (profile?.activeTheme === "default" || !profile?.activeTheme) 
                      ? "border-primary bg-primary/10 shadow-lg" 
                      : "border-transparent bg-background/50 opacity-40 hover:opacity-100"
                  )}
                >
                  <Sparkles className="h-6 w-6" />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {ownedThemes.map((themeId: string) => {
                  const theme = THEMES[themeId];
                  if (!theme) return null;
                  const isActive = profile?.activeTheme === themeId;
                  return (
                    <button 
                      key={themeId}
                      onClick={() => handleApplyTheme(themeId)}
                      disabled={isChangingTheme}
                      className={cn(
                        "flex-shrink-0 h-16 w-16 rounded-[1.5rem] border-2 transition-all flex items-center justify-center relative overflow-hidden group",
                        isActive ? theme.borderColor : "border-transparent bg-background/50 opacity-40 hover:opacity-100",
                        isActive && "bg-primary/5 shadow-2xl scale-110 mx-1"
                      )}
                    >
                      <div className={cn(
                        "absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity",
                        theme.auraClass.replace('blur-3xl', 'blur-md').replace('blur-2xl', 'blur-sm')
                      )} />
                      
                      <div className={cn(
                        "h-4 w-4 rounded-full relative z-10 transition-transform group-hover:scale-125",
                        theme.color.replace('text-', 'bg-')
                      )} />
                      
                      {isActive && (
                        <motion.div 
                          layoutId="active-theme-dot"
                          className="absolute bottom-1.5 h-1 w-1 rounded-full bg-current"
                        />
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Lumière Totale</p>
                <div className="flex items-center justify-center gap-4">
                  <Zap className="h-8 w-8 text-primary fill-current opacity-10 animate-pulse" />
                  <h2 className="text-6xl font-black tabular-nums tracking-tighter">{profile?.totalPoints?.toLocaleString() || 0}</h2>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => { haptic.medium(); router.push("/transfert"); }} 
                  className="h-20 rounded-[2.2rem] font-black text-[10px] uppercase tracking-[0.3em] gap-3 shadow-2xl shadow-primary/10 group overflow-hidden relative"
                >
                  <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                  <QrCode className="h-5 w-5 relative z-10 group-hover:scale-110 transition-transform" />
                  <span className="relative z-10">Transférer</span>
                </Button>
                <div className="bg-primary/5 rounded-[2.2rem] border border-primary/5 flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black">{profile?.hintCount || 0}</span>
                    <span className="text-[8px] font-black uppercase opacity-40 tracking-widest">Indices</span>
                  </div>
                  <Eye className="h-6 w-6 text-primary opacity-20" />
                </div>
              </div>

              {recentActivities && recentActivities.length > 0 && (
                <div className="pt-6 border-t border-primary/5 space-y-5">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-3">
                    <History className="h-4 w-4" /> Flux de Réception
                  </p>
                  <div className="space-y-3">
                    {recentActivities.map((act) => (
                      <div key={act.id} className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/5 group hover:bg-primary/[0.08] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border border-primary/5 overflow-hidden relative">
                            {act.fromPhoto ? <Image src={act.fromPhoto} alt="" fill className="object-cover" /> : <Users className="h-5 w-5 opacity-20" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">@{act.fromName}</span>
                            <span className="text-[8px] font-bold opacity-30 uppercase">Éveil partagé</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-green-600">+{act.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 pl-4">Configuration</h2>
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-2 space-y-1">
              <button onClick={() => { haptic.light(); router.push("/parametres"); }} className="w-full flex items-center justify-between p-5 hover:bg-primary/5 transition-colors rounded-[1.8rem] group text-left">
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings className="h-6 w-6 text-primary opacity-60" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">Paramètres du Sanctuaire</p>
                    <p className="text-[10px] opacity-40 font-medium italic">Thèmes et Sceau Biométrique</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-60 group-hover:translate-x-1 transition-all" />
              </button>
              {profile?.role === 'admin' && (
                <button onClick={() => { haptic.light(); router.push("/admin"); }} className="w-full flex items-center justify-between p-5 hover:bg-primary/5 transition-colors rounded-[1.8rem] group text-left border-t border-primary/5">
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShieldAlert className="h-6 w-6 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight">Console du Maître</p>
                      <p className="text-[10px] opacity-40 font-medium italic">Gestion des esprits et du savoir</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-60 group-hover:translate-x-1 transition-all" />
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-5 pb-10">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Expansion</h2>
            <button 
              onClick={() => { haptic.light(); router.push("/parrainage"); }} 
              className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <Users className="h-4 w-4" /> Mes Filleuls
            </button>
          </div>
          <Card className="border-none bg-primary text-primary-foreground shadow-2xl rounded-[3rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Gift className="h-48 w-40" /></div>
            <CardContent className="p-8 space-y-10 relative z-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 text-center">Sceau de Parrainage</p>
                  <motion.div 
                    whileTap={{ scale: 0.98 }} 
                    onClick={handleCopyCode} 
                    className="group bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/10 p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer transition-all shadow-inner"
                  >
                    <span className="text-5xl font-black tracking-tighter italic">{profile?.referralCode || "------"}</span>
                    <div className="h-12 w-12 bg-primary-foreground/10 rounded-2xl flex items-center justify-center group-hover:bg-primary-foreground/20 transition-colors">
                      <Copy className="h-5 w-5" />
                    </div>
                  </motion.div>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={copyMagicLink} 
                  className="w-full h-20 rounded-[2.2rem] font-black text-xs uppercase tracking-[0.25em] gap-4 bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-all shadow-2xl"
                >
                  <Share2 className="h-6 w-6" /> Envoyer le Lien Magique
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <ProfilePhotoDialog 
        isOpen={isFullImageOpen} 
        onOpenChange={setIsFullImageOpen} 
        imageUrl={currentImage} 
        username={profile?.username || "Anonyme"} 
      />
    </div>
  );
}
