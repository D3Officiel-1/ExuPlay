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
  ShieldCheck,
  Star,
  Flame,
  Moon,
  Sun,
  Package,
  Gift,
  Dices,
  Clock,
  TrendingUp,
  Boxes,
  ShieldAlert,
  Medal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const STORE_ITEMS = [
  // --- PRESTIGE & ACCRÉDITATION ---
  {
    id: "verified_badge",
    type: "upgrade",
    category: "prestige",
    name: "Sceau de Confiance",
    description: "Accréditation officielle de l'Oracle. Augmente vos limites de flux et marque votre identité d'un sceau d'authenticité.",
    price: 5000,
    icon: ShieldCheck,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  // --- OUTILS INDIVIDUELS ---
  {
    id: "hint",
    type: "consumable",
    category: "tools",
    name: "Indice de Perception",
    description: "Dissipe l'illusion. Supprime 2 mauvaises réponses.",
    price: 50,
    icon: Eye,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    field: "hintCount"
  },
  {
    id: "time_boost",
    type: "consumable",
    category: "tools",
    name: "Sablier d'Éternité",
    description: "Le temps est relatif. Ajoute 15 secondes.",
    price: 100,
    icon: Clock,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    field: "timeBoostCount"
  },
  {
    id: "shield",
    type: "consumable",
    category: "tools",
    name: "Sceau de Protection",
    description: "Annule la pénalité de points en cas d'erreur.",
    price: 150,
    icon: ShieldCheck,
    color: "text-green-500",
    bg: "bg-green-500/10",
    field: "shieldCount"
  },
  {
    id: "multiplier",
    type: "consumable",
    category: "tools",
    name: "Prisme de Lumière",
    description: "Double les points gagnés pour le défi actuel.",
    price: 200,
    icon: Star,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    field: "multiplierCount"
  },
  // --- PACTES (BUNDLES) ---
  {
    id: "bundle_initiation",
    type: "bundle",
    category: "packs",
    name: "Pacte d'Initiation",
    description: "Contient 2 exemplaires de chaque outil d'éveil.",
    price: 800,
    icon: Package,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    fields: { hintCount: 2, timeBoostCount: 2, shieldCount: 2, multiplierCount: 2 }
  },
  {
    id: "bundle_master",
    type: "bundle",
    category: "packs",
    name: "Pacte du Maître",
    description: "Contient 5 exemplaires de chaque outil d'éveil.",
    price: 1800,
    icon: Boxes,
    color: "text-primary",
    bg: "bg-primary/5",
    fields: { hintCount: 5, timeBoostCount: 5, shieldCount: 5, multiplierCount: 5 }
  },
  // --- MYSTÈRE ---
  {
    id: "mystery_box",
    type: "mystery",
    category: "mystery",
    name: "L'Urne de l'Inconnu",
    description: "Un outil aléatoire octroyé par l'Oracle.",
    price: 120,
    icon: Dices,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10"
  },
  // --- THÈMES ---
  {
    id: "theme_ruby",
    type: "theme",
    category: "themes",
    name: "Sceau de Rubis",
    description: "L'éclat de la force et de la volonté ardente.",
    price: 1500,
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10"
  },
  {
    id: "theme_obsidian",
    type: "theme",
    category: "themes",
    name: "Sceau d'Obsidienne",
    description: "La maîtrise absolue de l'ombre et du vide.",
    price: 3000,
    icon: Moon,
    color: "text-gray-900 dark:text-gray-100",
    bg: "bg-gray-900/10 dark:bg-gray-100/10"
  },
  {
    id: "theme_gold",
    type: "theme",
    category: "themes",
    name: "Sceau d'Or Pur",
    description: "La distinction suprême des Maîtres.",
    price: 5000,
    icon: Sun,
    color: "text-yellow-600",
    bg: "bg-yellow-600/10"
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

    // Checks for upgrades or themes already owned
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
      } else if (item.type === 'mystery') {
        const tools = STORE_ITEMS.filter(i => i.type === 'consumable');
        const randomTool = tools[Math.floor(Math.random() * tools.length)];
        updatePayload[(randomTool as any).field] = increment(1);
        toast({ title: "Destinée scellée", description: `Vous avez reçu : ${randomTool.name}` });
      } else if (item.type === 'theme') {
        updatePayload.ownedThemes = arrayUnion(item.id);
      }

      await updateDoc(userDocRef, updatePayload);
      haptic.success();
      if (item.type !== 'mystery') {
        toast({ title: "Acquisition réussie", description: `${item.name} lié à votre essence.` });
      }
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

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-10 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Arsenal</p>
            <h1 className="text-3xl font-black tracking-tight">L'Échoppe</h1>
          </div>
          <div className="bg-primary/5 px-4 py-2 rounded-2xl border border-primary/5 flex items-center gap-2 shadow-sm">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-sm font-black">{profile?.totalPoints?.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-12">
          {/* SECTION PRESTIGE */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 pl-2">
              <Medal className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Prestige & Titres</h2>
            </div>
            {STORE_ITEMS.filter(i => i.category === 'prestige').map((item) => {
              const isOwned = profile?.trustBadge === true;
              return (
                <Card key={item.id} className={cn("border-none bg-primary text-primary-foreground shadow-2xl rounded-[2.5rem] overflow-hidden relative group transition-all", isOwned && "opacity-50 grayscale")}>
                  <div className="absolute top-0 right-0 p-6 opacity-10"><ShieldCheck className="h-24 w-24" /></div>
                  <CardContent className="p-8 flex items-center gap-6 relative z-10">
                    <div className="h-16 w-16 bg-primary-foreground/10 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                      <item.icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black tracking-tight uppercase italic">{item.name}</h3>
                      <p className="text-[10px] font-medium opacity-60 leading-relaxed">{item.description}</p>
                    </div>
                    <Button 
                      onClick={() => handlePurchase(item)} 
                      disabled={buyingId === item.id || isOwned} 
                      variant="secondary" 
                      className="rounded-xl h-14 px-6 font-black text-xs gap-2 shadow-2xl"
                    >
                      {isOwned ? <Check className="h-4 w-4" /> : buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `${item.price} PTS`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* SECTION OUTILS */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 pl-2">
              <Sparkles className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Outils d'Éveil</h2>
            </div>
            <div className="grid gap-4">
              {STORE_ITEMS.filter(i => i.category === 'tools').map((item) => {
                const count = profile?.[(item as any).field] || 0;
                return (
                  <Card key={item.id} className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden group">
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.bg)}>
                        <item.icon className={cn("h-7 w-7", item.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base uppercase italic">{item.name}</h3>
                          {count > 0 && <span className="bg-primary/10 text-primary text-[8px] font-black px-2 py-0.5 rounded-full">x{count}</span>}
                        </div>
                        <p className="text-[10px] font-medium opacity-40 leading-relaxed">{item.description}</p>
                      </div>
                      <Button onClick={() => handlePurchase(item)} disabled={buyingId === item.id} className="rounded-xl h-12 px-4 font-black text-xs gap-2">
                        {buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.price} <Zap className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* SECTION MYSTÈRE & PACKS */}
          <div className="grid grid-cols-1 gap-10">
            <section className="space-y-5">
              <div className="flex items-center gap-3 pl-2">
                <Dices className="h-4 w-4 opacity-40" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Hasard Sacré</h2>
              </div>
              {STORE_ITEMS.filter(i => i.category === 'mystery').map((item) => (
                <Card key={item.id} className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-6 opacity-5"><Dices className="h-20 w-20 text-primary" /></div>
                  <CardContent className="p-8 flex items-center gap-6 relative z-10">
                    <div className="h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black tracking-tight uppercase italic text-primary">{item.name}</h3>
                      <p className="text-[10px] font-medium opacity-40">{item.description}</p>
                    </div>
                    <Button onClick={() => handlePurchase(item)} disabled={buyingId === item.id} className="rounded-xl h-14 px-6 font-black text-xs gap-2 shadow-xl shadow-primary/5">
                      {buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.price} <Zap className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="space-y-5">
              <div className="flex items-center gap-3 pl-2">
                <Boxes className="h-4 w-4 opacity-40" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Pactes de Puissance</h2>
              </div>
              <div className="grid gap-4">
                {STORE_ITEMS.filter(i => i.category === 'packs').map((item) => (
                  <Card key={item.id} className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden">
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", item.bg)}>
                        <item.icon className={cn("h-7 w-7", item.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base uppercase italic">{item.name}</h3>
                          <span className="bg-green-500/10 text-green-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Économique</span>
                        </div>
                        <p className="text-[10px] font-medium opacity-40 leading-relaxed">{item.description}</p>
                      </div>
                      <Button onClick={() => handlePurchase(item)} disabled={buyingId === item.id} className="rounded-xl h-12 px-4 font-black text-xs gap-2">
                        {buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.price} <Zap className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* SECTION THÈMES */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 pl-2">
              <Palette className="h-4 w-4 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Esthétique de l'Aura</h2>
            </div>
            <div className="grid gap-4">
              {STORE_ITEMS.filter(i => i.category === 'themes').map((item) => {
                const isOwned = profile?.ownedThemes?.includes(item.id);
                return (
                  <Card key={item.id} className={cn("border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden transition-all duration-500", isOwned && "opacity-40 grayscale")}>
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", item.bg)}>
                        <item.icon className={cn("h-7 w-7", item.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-base uppercase italic">{item.name}</h3>
                        <p className="text-[10px] font-medium opacity-40 leading-relaxed">{item.description}</p>
                      </div>
                      <Button onClick={() => handlePurchase(item)} disabled={buyingId === item.id || isOwned} variant={isOwned ? "outline" : "default"} className="rounded-xl h-12 px-4 font-black text-xs gap-2">
                        {isOwned ? <Check className="h-4 w-4" /> : buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.price} {!isOwned && <Zap className="h-3 w-3" />}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-2">
          <TrendingUp className="h-6 w-6 mx-auto text-primary opacity-20" />
          <p className="text-[10px] leading-relaxed font-medium opacity-40 italic">
            "Le savoir est une arme, l'artéfact est son catalyseur. Forgez votre destin."
          </p>
        </div>
      </main>
    </div>
  );
}
