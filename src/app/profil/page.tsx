
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useDoc, useAuth } from "@/firebase";
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  User as UserIcon, 
  Phone, 
  Gift, 
  LogOut, 
  Copy, 
  Trophy, 
  Calendar,
  Camera,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function ProfilPage() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  useEffect(() => {
    const savedImage = localStorage.getItem("exu_profile_image");
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter."
      });
    }
  };

  const copyReferralCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      toast({
        title: "Code copié",
        description: "Votre code de parrainage est prêt à être partagé."
      });
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "Fichier trop lourd",
          description: "Veuillez choisir une image de moins de 2 Mo."
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileImage(base64String);
        localStorage.setItem("exu_profile_image", base64String);
        toast({
          title: "Image mise à jour",
          description: "Votre avatar a été enregistré localement."
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-12 w-12 bg-primary/20 rounded-full blur-xl"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        {/* En-tête du profil */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
            <button 
              onClick={handleImageClick}
              className="relative h-24 w-24 bg-card rounded-[2rem] flex items-center justify-center border border-primary/10 shadow-2xl mx-auto overflow-hidden group transition-transform active:scale-95"
            >
              {profileImage ? (
                <Image 
                  src={profileImage} 
                  alt="Profil" 
                  fill 
                  className="object-cover transition-opacity group-hover:opacity-60"
                />
              ) : (
                <UserIcon className="h-10 w-10 text-primary transition-opacity group-hover:opacity-40" />
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight">@{profile?.username || "Anonyme"}</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Membre de l'Éveil</p>
          </div>
        </motion.div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem]">
              <CardContent className="p-6 text-center">
                <Trophy className="h-5 w-5 text-primary mx-auto mb-2 opacity-50" />
                <p className="text-2xl font-black">{profile?.totalPoints?.toLocaleString() || 0}</p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Points Total</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem]">
              <CardContent className="p-6 text-center">
                <Calendar className="h-5 w-5 text-primary mx-auto mb-2 opacity-50" />
                <p className="text-sm font-black">
                  {profile?.createdAt ? new Date(profile.createdAt.toDate()).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Depuis</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Détails du compte */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 pl-2">Informations</h2>
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-2 space-y-1">
              <div className="flex items-center gap-4 p-4 hover:bg-primary/5 transition-colors rounded-2xl group">
                <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary opacity-60" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Téléphone Liaison</p>
                  <p className="text-sm font-bold">{profile?.phoneNumber || "Non renseigné"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 hover:bg-primary/5 transition-colors rounded-2xl group">
                <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-primary opacity-60" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Genre</p>
                  <p className="text-sm font-bold capitalize">{profile?.gender || "Non spécifié"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Parrainage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 pl-2">Expansion</h2>
          <Card className="border-none bg-primary text-primary-foreground shadow-2xl rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Gift className="h-32 w-32" />
            </div>
            <CardContent className="p-8 space-y-6 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Votre Code de Parrainage</p>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-black tracking-tighter">{profile?.referralCode || "------"}</p>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    onClick={copyReferralCode}
                    className="h-12 w-12 rounded-2xl shadow-lg"
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs font-medium opacity-80 leading-relaxed">
                Partagez ce code avec vos amis. Chaque nouvel esprit éveillé vous rapporte <span className="font-bold">500 points</span>.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pt-4"
        >
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] gap-3 text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
