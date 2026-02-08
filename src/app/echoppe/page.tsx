
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp, arrayUnion } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Sparkles, 
  Eye, 
  Palette, 
  Loader2, 
  Check,
  BadgeCheck,
  Star,
  Flame,
  Moon,
  Sun,
  Package,
  Boxes,
  Dices,
  Clock,
  TrendingUp,
  Medal,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const STORE_ITEMS = [
  // --- PRESTIGE ---
  {
    id: "verified_badge",
    type: "upgrade",
    category: "prestige",
    name: "Sceau de Confiance",
    description: "Accréditation officielle de l'Oracle. Augmente vos limites de flux et certifie votre essence.",
    price: 5000,
    icon: BadgeCheck,
    color: "text-primary",
    bg: "bg-primary/10",
    gradient: "from-primary/20 via-primary/5 to-transparent"
  },
  // --- OUTILS ---
  {
    id: "hint",
    type: "consumable",
    category: "tools",
    name: "Perception",
    description: "Dissipe l'illusion. Supprime 2 mauvaises réponses.",
    price: 50,
    icon: Eye,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    field: "hintCount",
    gradient: "from-blue-500/20 via-transparent to-transparent"
  },
  {
    id: "time_boost",
    type: "consumable",
    category: "tools",
    name: "Éternité",
    description: "Le temps est relatif. Ajoute 15 secondes au défi.",
    price: 100,
    icon: Clock,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    field: "timeBoostCount",
    gradient: "from-orange-500/20 via-transparent to-transparent"
  },
  {
    id: "shield",
    type: "consumable",
    category: "tools",
    name: "Sceau de Paix",
    description: "Annule la pénalité de points en cas d'erreur.",
    price: 150,
    icon: BadgeCheck,
    color: "text-green-500",
    bg: "bg-green-500/10",
    field: "shieldCount",
    gradient: "from-green-500/20 via-transparent to-transparent"
  },
  {
    id: "multiplier",
    type: "consumable",
    category: "tools",
    name: "Prisme",
    description: "Double les points gagnés pour le défi actuel.",
    price: 200,
    icon: Star,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    field: "multiplierCount",
    gradient: "from-yellow-500/20 via-transparent to-transparent"
  },
  // --- PACKS ---
  {
    id: "bundle_initiation",
    type: "bundle",
    category: "packs",
    name: "Pacte d'Éveil",
    description: "Contient 2 exemplaires de chaque outil d'éveil.",
    price: 800,
    icon: Package,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    fields: { hintCount: 2, timeBoostCount: 2, shieldCount: 2, multiplierCount: 2 },
    gradient: "from-purple-500/20 via-transparent to-transparent"
  },
  // --- THÈMES ---
  {
    id: "theme_ruby",
    type: "theme",
    category: "themes",
    name: "Aura de Rubis",
    description: "L'éclat de la force et de la volonté ardente.",
    price: 1500,
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10",
    gradient: "from-red-500/20 via-transparent to-transparent"
  },
  {
    id: "theme_obsidian",
    type: "theme",
    category: "themes",
    name: "Aura d'Obsidienne",
    description: "La maîtrise absolue de l'ombre et du vide.",
    price: 3000,
    icon: Moon,
    color: "text-zinc-100",
    bg: "bg-zinc-100/10",
    gradient: "from-white/10 via-transparent to-transparent"
  }
];

export default function EchoppePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  const handlePurchase = async (item: typeof STORE_ITEMS[0]) => {
    if (!userDocRef || !profile) return;
    
    if ((profile.totalPoints || 0) < item.price) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Il vous manque ${item.price - profile.totalPoints} PTS.`
      });
      return;
    }

    if (item.id === 'verified_badge' && profile.trustBadge) {
      toast({ title: "Sceau déjà manifesté" });
      return;
    }
    if (item.type === 'theme' && profile.ownedThemes?.includes(item.id)) {
      toast({ title: "Déjà possédé" });
      return;
    }

    setBuyingId(item.id);
    haptic.medium();

    try {
      let updatePayload: any = {
        totalPoints: increment(-item.price),
        updatedAt: serverTimestamp()
      };

      if (item.id === 'verified_badge') {
        updatePayload.trustBadge = true;
      } else if (item.type === 'consumable' && 'field' in item) {
        updatePayload[item.field!] = increment(1);
      } else if (item.type === 'bundle' && 'fields' in item) {
        Object.entries(item.fields!).forEach(([f, val]) => {
          updatePayload[f] = increment(val as number);
        });
      } else if (item.type === 'theme') {
        updatePayload.ownedThemes = arrayUnion(item.id);
      }

      await updateDoc(userDocRef, updatePayload);
      haptic.success();
      toast({ title: "Acquisition réussie", description: `${item.name} lié à votre essence.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Dissonance" });
    } finally {
      setBuyingId(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-12 max-w-lg mx-auto w-full">
        {/* Header Dynamique */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Arsenal</p>
            <h1 className="text-4xl font-black tracking-tighter italic">Le Sanctuaire</h1>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-card/40 backdrop-blur-3xl px-5 py-3 rounded-[2rem] border border-primary/5 flex items-center gap-3 shadow-2xl"
          >
            <div className="relative">
              <Zap className="h-4 w-4 text-primary" />
              <motion.div 
                animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-sm"
              />
            </div>
            <span className="text-lg font-black tabular-nums">{profile?.totalPoints?.toLocaleString()}</span>
          </motion.div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-16"
        >
          {/* SECTION PRESTIGE (Badge Vérifié) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Medal className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Accréditation Royale</h2>
            </div>
            {STORE_ITEMS.filter(i => i.category === 'prestige').map((item) => {
              const isOwned = profile?.trustBadge === true;
              return (
                <motion.div key={item.id} variants={itemVariants}>
                  <Card className={cn(
                    "border-none bg-primary text-primary-foreground shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] rounded-[2.5rem] overflow-hidden relative group transition-all duration-700",
                    isOwned && "opacity-50 grayscale"
                  )}>
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150"><BadgeCheck className="h-32 w-32" /></div>
                    <CardContent className="p-10 flex flex-col gap-8 relative z-10">
                      <div className="flex items-start justify-between">
                        <div className="h-20 w-20 bg-primary-foreground/10 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner">
                          <item.icon className="h-10 w-10" />
                        </div>
                        {isOwned && <span className="bg-primary-foreground/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">Invoqué</span>}
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-black tracking-tight uppercase italic leading-none">{item.name}</h3>
                        <p className="text-xs font-medium opacity-60 leading-relaxed max-w-[80%]">{item.description}</p>
                      </div>
                      <Button 
                        onClick={() => handlePurchase(item)} 
                        disabled={buyingId === item.id || isOwned} 
                        variant="secondary" 
                        className="rounded-2xl h-16 px-8 font-black text-xs uppercase tracking-[0.2em] gap-3 shadow-2xl active:scale-95 transition-all"
                      >
                        {isOwned ? <Check className="h-5 w-5" /> : buyingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : `${item.price} PTS`}
                        {!isOwned && buyingId !== item.id && <ArrowUpRight className="h-4 w-4 opacity-40" />}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </section>

          {/* SECTION OUTILS (Grid 2x2) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Sparkles className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Outils d'Éveil</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {STORE_ITEMS.filter(i => i.category === 'tools').map((item) => {
                const count = profile?.[(item as any).field] || 0;
                return (
                  <motion.div key={item.id} variants={itemVariants}>
                    <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.2rem] overflow-hidden group hover:bg-card/60 transition-colors relative">
                      <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", item.gradient)} />
                      <CardContent className="p-6 flex flex-col gap-6 relative z-10">
                        <div className="flex justify-between items-start">
                          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", item.bg)}>
                            <item.icon className={cn("h-7 w-7", item.color)} />
                          </div>
                          {count > 0 && <span className="bg-primary/5 border border-primary/5 px-2.5 py-1 rounded-full text-[10px] font-black tabular-nums">x{count}</span>}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-black text-sm uppercase tracking-tight italic leading-tight">{item.name}</h3>
                          <p className="text-[9px] font-medium opacity-40 leading-tight h-6 line-clamp-2">{item.description}</p>
                        </div>
                        <Button 
                          onClick={() => handlePurchase(item)} 
                          disabled={buyingId === item.id} 
                          className="rounded-xl h-12 w-full font-black text-xs gap-2 bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/5 transition-all shadow-none"
                        >
                          {buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `${item.price} PTS`}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* SECTION MYSTÈRE & PACTES */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Boxes className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Pactes de Puissance</h2>
            </div>
            <div className="grid gap-4">
              {STORE_ITEMS.filter(i => i.category === 'packs').map((item) => (
                <motion.div key={item.id} variants={itemVariants}>
                  <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden group relative">
                    <div className={cn("absolute inset-0 opacity-5 bg-gradient-to-r", item.gradient)} />
                    <CardContent className="p-6 flex items-center gap-6 relative z-10">
                      <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-white/5", item.bg)}>
                        <item.icon className={cn("h-8 w-8", item.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-base uppercase italic leading-none">{item.name}</h3>
                          <span className="bg-green-500/10 text-green-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Économique</span>
                        </div>
                        <p className="text-[10px] font-medium opacity-40 leading-relaxed">{item.description}</p>
                      </div>
                      <Button 
                        onClick={() => handlePurchase(item)} 
                        disabled={buyingId === item.id} 
                        className="rounded-2xl h-14 px-6 font-black text-xs gap-2 shadow-2xl active:scale-95"
                      >
                        {buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `${item.price} PTS`}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* SECTION THÈMES */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Palette className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Auras de l'Esprit</h2>
            </div>
            <div className="grid gap-4">
              {STORE_ITEMS.filter(i => i.category === 'themes').map((item) => {
                const isOwned = profile?.ownedThemes?.includes(item.id);
                return (
                  <motion.div key={item.id} variants={itemVariants}>
                    <Card className={cn(
                      "border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.2rem] overflow-hidden transition-all duration-500 group relative",
                      isOwned && "opacity-40 grayscale"
                    )}>
                      <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", item.gradient)} />
                      <CardContent className="p-6 flex items-center gap-6 relative z-10">
                        <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner border border-white/5", item.bg)}>
                          <item.icon className={cn("h-8 w-8", item.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-base uppercase italic leading-none mb-1">{item.name}</h3>
                          <p className="text-[10px] font-medium opacity-40 leading-relaxed">{item.description}</p>
                        </div>
                        <Button 
                          onClick={() => handlePurchase(item)} 
                          disabled={buyingId === item.id || isOwned} 
                          variant={isOwned ? "outline" : "default"} 
                          className="rounded-2xl h-14 px-6 font-black text-xs gap-2 transition-all active:scale-95"
                        >
                          {isOwned ? <Check className="h-4 w-4" /> : buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `${item.price} PTS`}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </motion.div>

        {/* Footer Poétique */}
        <div className="p-10 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden">
          <TrendingUp className="h-8 w-8 mx-auto text-primary opacity-10" />
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic px-4">
            "Le savoir est une arme, l'artéfact est son catalyseur. Chaque acquisition résonne avec votre quête de Lumière."
          </p>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary/5 blur-3xl rounded-full" />
        </div>
      </main>
    </div>
  );
}
