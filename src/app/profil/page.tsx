"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  User as UserIcon, 
  Phone, 
  Gift, 
  Copy, 
  Calendar,
  Camera,
  Loader2,
  Edit2,
  Check,
  X,
  Share2,
  ShieldAlert,
  ChevronRight,
  ArrowRightLeft,
  Users,
  QrCode,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { haptic } from "@/lib/haptics";
import { ProfilePhotoDialog } from "@/components/ProfilePhotoDialog";

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

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  useEffect(() => {
    const savedImage = localStorage.getItem("exu_profile_image");
    if (savedImage) {
      setLocalProfileImage(savedImage);
    }
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
        console.error("Error checking username:", error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [editedUsername, db, isEditingName, profile?.username]);

  const handleCopyCode = async () => {
    if (profile?.referralCode) {
      haptic.light();
      try {
        await navigator.clipboard.writeText(profile.referralCode);
        toast({
          title: "Code copié",
          description: "Le sceau de parrainage est prêt à être partagé."
        });
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de copier le code." });
      }
    }
  };

  const copyMagicLink = async () => {
    if (profile?.referralCode) {
      haptic.medium();
      const baseUrl = window.location.origin;
      const magicLink = `${baseUrl}/login?ref=${profile.referralCode}&u=${encodeURIComponent(profile.username || 'Esprit')}`;
      
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Rejoins-moi sur Exu Play !',
            text: `Découvre l'art de la pensée, réinventé. Utilise mon lien pour un éveil immédiat :`,
            url: magicLink,
          });
          return;
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Error sharing:', error);
          } else {
            return;
          }
        }
      }

      try {
        await navigator.clipboard.writeText(magicLink);
        toast({
          title: "Lien magique copié",
          description: "Le lien de parrainage est prêt."
        });
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de copier le lien." });
      }
    }
  };

  const handleImageClick = () => {
    haptic.light();
    fileInputRef.current?.click();
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      haptic.medium();
      setIsFullImageOpen(true);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Fichier trop lourd",
          description: "Veuillez choisir une image de moins de 1 Mo."
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLocalProfileImage(base64String);
        localStorage.setItem("exu_profile_image", base64String);

        if (user?.uid && db) {
          const userRef = doc(db, "users", user.uid);
          updateDoc(userRef, {
            profileImage: base64String,
            updatedAt: serverTimestamp()
          }).catch(async (error) => {
            const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'update',
              requestResourceData: { profileImage: "base64_image_data" },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditingName = () => {
    haptic.light();
    setEditedUsername(profile?.username || "");
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setUsernameStatus('idle');
  };

  const saveNewUsername = async () => {
    if (usernameStatus !== 'available' || !user?.uid) return;
    
    setIsSavingName(true);
    haptic.medium();
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        username: editedUsername.toLowerCase().trim(),
        updatedAt: serverTimestamp()
      });
      setIsEditingName(false);
      toast({
        title: "Profil mis à jour",
        description: "Votre nom d'utilisateur a été modifié."
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingName(false);
    }
  };

  const startEditingPhone = () => {
    haptic.light();
    const rawPhone = profile?.phoneNumber?.replace("+225", "") || "";
    setEditedPhone(rawPhone);
    setIsEditingPhone(true);
  };

  const isValidPhoneNumber = (num: string) => {
    if (num.length !== 10) return false;
    const validPrefixes = ["01", "05", "07"];
    return validPrefixes.some(prefix => num.startsWith(prefix));
  };

  const saveNewPhone = async () => {
    if (!isValidPhoneNumber(editedPhone) || !user?.uid) return;
    
    setIsSavingPhone(true);
    haptic.medium();
    try {
      const userRef = doc(db, "users", user.uid);
      const fullPhoneNumber = `+225${editedPhone}`;
      await updateDoc(userRef, {
        phoneNumber: fullPhoneNumber,
        updatedAt: serverTimestamp()
      });
      setIsEditingPhone(false);
      toast({
        title: "Numéro mis à jour",
        description: "Votre numéro Wave a été modifié."
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  const currentImage = profile?.profileImage || localProfileImage;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <motion.div 
          style={{ opacity: mainProfileOpacity, scale: mainProfileScale }}
          className="text-center space-y-4"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
            <button 
              onClick={handleImageClick}
              onContextMenu={(e) => {
                e.preventDefault();
                haptic.medium();
                setIsFullImageOpen(true);
              }}
              onPointerDown={handleLongPressStart}
              onPointerUp={handleLongPressEnd}
              onPointerLeave={handleLongPressEnd}
              className="relative h-28 w-28 bg-card rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-2xl mx-auto overflow-hidden group transition-transform active:scale-95"
            >
              {currentImage ? (
                <Image src={currentImage} alt="Profil" fill className="object-cover transition-opacity group-hover:opacity-60" />
              ) : (
                <UserIcon className="h-12 w-12 text-primary transition-opacity group-hover:opacity-40" />
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-2 flex flex-col items-center">
            <AnimatePresence mode="wait">
              {!isEditingName ? (
                <motion.div 
                  key="display-name"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group flex items-center gap-2 cursor-pointer"
                  onClick={startEditingName}
                >
                  <h1 className="text-3xl font-black tracking-tight">@{profile?.username || "Anonyme"}</h1>
                  <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
                </motion.div>
              ) : (
                <motion.div 
                  key="edit-name"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3 w-full"
                >
                  <div className="relative w-full max-w-[280px]">
                    <Input 
                      value={editedUsername}
                      onChange={(e) => setEditedUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
                      className="h-12 text-center text-xl font-bold bg-background/50 rounded-xl pr-10"
                      autoFocus
                      maxLength={15}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? <Loader2 className="h-4 w-4 animate-spin opacity-40" /> : (
                        <>
                          {usernameStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                          {usernameStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={cancelEditingName} className="rounded-xl h-9 px-4 font-bold opacity-60">Annuler</Button>
                    <Button size="sm" onClick={saveNewUsername} disabled={usernameStatus !== 'available' || isSavingName} className="rounded-xl h-9 px-6 font-bold">
                      {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!isEditingName && (
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Membre de l'Éveil</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Votre Lumière</p>
                <div className="flex items-center justify-center gap-3">
                  <Zap className="h-6 w-6 text-primary fill-current opacity-20" />
                  <h2 className="text-5xl font-black tabular-nums tracking-tighter">{profile?.totalPoints?.toLocaleString() || 0}</h2>
                </div>
              </div>
              
              <Button 
                onClick={() => { haptic.medium(); router.push("/transfert"); }}
                className="w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] gap-3 shadow-2xl shadow-primary/10 group transition-all"
              >
                <QrCode className="h-5 w-5 group-hover:scale-110 transition-transform" />
                Transférer
                <ArrowRightLeft className="h-4 w-4 opacity-40 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {profile?.role === 'admin' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 pl-4">Maître de l'Éveil</h2>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden border border-primary/10">
              <CardContent className="p-2">
                <button onClick={() => { haptic.light(); router.push("/admin"); }} className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors rounded-2xl group text-left">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <ShieldAlert className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Console d'Administration</p>
                      <p className="text-[10px] opacity-40 font-medium">Gestion du savoir et des esprits</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Expansion</h2>
            <button onClick={() => { haptic.light(); router.push("/parrainage"); }} className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
              <Users className="h-3 w-3" />
              Mes Filleuls
            </button>
          </div>
          
          <Card className="border-none bg-primary text-primary-foreground shadow-2xl rounded-[3rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Gift className="h-40 w-40" />
            </div>
            <CardContent className="p-8 space-y-8 relative z-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Sceau de Parrainage</p>
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyCode}
                    className="group bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/5 p-6 rounded-[2.5rem] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-4xl font-black tracking-tighter">{profile?.referralCode || "------"}</span>
                    <div className="h-10 w-10 bg-primary-foreground/10 rounded-2xl flex items-center justify-center group-hover:bg-primary-foreground/20 transition-colors">
                      <Copy className="h-4 w-4" />
                    </div>
                  </motion.div>
                  <p className="text-[9px] font-bold text-center opacity-30 uppercase tracking-[0.2em]">Appuyez sur le code pour copier</p>
                </div>

                <Button 
                  variant="secondary" 
                  onClick={copyMagicLink}
                  className="w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] gap-3 bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-all"
                >
                  <Share2 className="h-5 w-5" />
                  Envoyer le Lien Magique
                </Button>
              </div>
              
              <div className="p-5 bg-primary-foreground/5 rounded-2xl border border-primary-foreground/5">
                <p className="text-[11px] font-medium opacity-80 leading-relaxed text-center italic">
                  "Chaque esprit éveillé grâce à vous renforce votre propre Lumière de 100 PTS."
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 pl-4">Liaisons</h2>
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-2 space-y-1">
              <AnimatePresence mode="wait">
                {!isEditingPhone ? (
                  <motion.div key="phone-display" onClick={startEditingPhone} className="flex items-center gap-4 p-5 hover:bg-primary/5 transition-colors rounded-[2rem] group cursor-pointer">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Téléphone Wave</p>
                      <p className="text-sm font-bold">{profile?.phoneNumber || "Non renseigné"}</p>
                    </div>
                    <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                  </motion.div>
                ) : (
                  <motion.div key="phone-edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 space-y-4">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Nouveau numéro Wave</p>
                    <div className="flex gap-2">
                      <Input value={editedPhone} onChange={(e) => setEditedPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="h-12 font-bold bg-background/50 rounded-xl" placeholder="07..." autoFocus />
                      <Button size="icon" variant="ghost" onClick={() => setIsEditingPhone(false)} className="h-12 w-12 rounded-xl"><X className="h-4 w-4" /></Button>
                      <Button size="icon" onClick={saveNewPhone} disabled={!isValidPhoneNumber(editedPhone) || isSavingPhone} className="h-12 w-12 rounded-xl">
                        {isSavingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 p-5 rounded-[2rem]">
                <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary opacity-60" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Éveil Initial</p>
                  <p className="text-sm font-bold">
                    {profile?.createdAt ? new Date(profile.createdAt.toDate()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
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
