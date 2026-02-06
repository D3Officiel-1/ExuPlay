"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp, arrayUnion } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  Zap, 
  Sparkles, 
  Eye, 
  Palette, 
  Loader2, 
  Check,
  ChevronRight,
  Shield,
  History,
  Clock,
  ShieldCheck,
  Star,
  Gem,
  Flame,
  Droplets,
  Moon,
  Sun
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const STORE_ITEMS = [
  {
    id: "hint",
    type: "consumable",
    name: "Indice de Perception",
    description: "Dissipe l'illusion. Supprime 2 mauvaises réponses pendant un défi.",
    price: 50,
    icon: Eye,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    field: "hintCount"
  },
  {
    id: "time_boost",
    type: "consumable",
    name: "Sablier d'Éternité",
    description: "Le temps est relatif. Ajoute 15 secondes au chronomètre.",
    price: 100,
    icon: Clock,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    field: "timeBoostCount"
  },
  {
    id: "shield",
    type: "consumable",
    name: "Sceau de Protection",
    description: "L'échec n'a pas de prix. Annule la pénalité de points en cas d'erreur.",
    price: 150,
    icon: ShieldCheck,
    color: "text-green-500",
    bg: "bg-green-500/10",
    field: "shieldCount"
  },
  {
    id: "multiplier",
    type: "consumable",
    name: "Prisme de Lumière",
    description: "La résonance amplifiée. Double les points gagnés pour ce défi.",
    price: 200,
    icon: Star,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    field: "multiplierCount"
  },
  {
    id: "theme_ruby",
    type: "theme",
    name: "Sceau de Rubis",
    description: "L'éclat de la force et de la volonté ardente.",
    price: 1500,
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10",
    action: "theme"
  },
  {
    id: "theme_obsidian",
    type: "theme",
    name: "Sceau d'Obsidienne",
    description: "La maîtrise absolue de l'ombre et du vide.",
    price: 3000,
    icon: Moon,
    color: "text-gray-900 dark:text-gray-100",
    bg: "bg-gray-900/10 dark:bg-gray-100/10",
    action: "theme"
  },
  {
    id: "theme_gold",
    type: "theme",
    name: "Sceau d'Or Pur",
    description: "La distinction suprême des Maîtres de l'Éveil.",
    price: 5000,
    icon: Sun,
    color: "text-yellow-600",
    bg: "bg-yellow-600/10",
    action: "theme"
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
        description: `Il vous manque ${item.price - profile.totalPoints} PTS pour cet artefact.`
      });
      return;
    }

    const isOwned = item.type === 'theme' && profile.ownedThemes?.includes(item.id);
    if (isOwned) {
      toast({ title: "Déjà possédé", description: "Ce sceau fait déjà partie de votre essence." });
      return;
    }

    setBuyingId(item.id);
    haptic.medium();

    try {
      const updatePayload: any = {
        totalPoints: increment(-item.price),
        updatedAt: serverTimestamp()
      };

      if (item.type === 'consumable' && 'field' in item) {
        updatePayload[item.field!] = increment(1);
      } else if ('action' in item && item.action === 'theme') {
        updatePayload.ownedThemes = arrayUnion(item.id);
      }

      await updateDoc(userDocRef, updatePayload);
      haptic.success();
      toast({
        title: "Acquisition réussie",
        description: `${item.name} a été lié à votre esprit.`
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Dissonance", description: "Le flux a été interrompu." });
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
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Artefacts</p>
            <h1 className="text-3xl font-black tracking-tight">L'Échoppe</h1>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/5">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-sm font-black">{profile?.totalPoints?.toLocaleString()} <span className="text-[10px] opacity-40">PTS</span></span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 pl-2">
              <Sparkles className="h-3 w-3 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Outils d'Éveil</h2>
            </div>
            <div className="grid gap-4">
              {STORE_ITEMS.filter(i => i.type === 'consumable').map((item) => {
                const field = (item as any).field;
                const count = profile?.[field as keyof typeof profile] || 0;
                return (
                  <Card key={item.id} className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden group">
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.bg)}>
                        <item.icon className={cn("h-7 w-7", item.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base">{item.name}</h3>
                          {typeof count === 'number' && count > 0 && <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">x{count}</span>}
                        </div>
                        <p className="text-[10px] font-medium opacity-40 line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                      <Button 
                        onClick={() => handlePurchase(item)}
                        disabled={buyingId === item.id}
                        className="rounded-xl h-12 px-4 font-black text-xs gap-2 shadow-lg"
                      >
                        {buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.price}
                        <Zap className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 pl-2">
              <Palette className="h-3 w-3 opacity-40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Thèmes & Sceaux</h2>
            </div>
            <div className="grid gap-4">
              {STORE_ITEMS.filter(i => i.type === 'theme').map((item) => {
                const isOwned = profile?.ownedThemes?.includes(item.id);
                return (
                  <Card key={item.id} className={cn(
                    "border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden transition-all duration-500",
                    isOwned && "opacity-60 border border-primary/10"
                  )}>
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", item.bg)}>
                        <item.icon className={cn("h-7 w-7", item.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-base">{item.name}</h3>
                        <p className="text-[10px] font-medium opacity-40 leading-relaxed">{item.description}</p>
                      </div>
                      <Button 
                        onClick={() => handlePurchase(item)}
                        disabled={buyingId === item.id || isOwned}
                        variant={isOwned ? "outline" : "default"}
                        className="rounded-xl h-12 px-4 font-black text-xs gap-2"
                      >
                        {isOwned ? (
                          <div className="flex items-center gap-1.5">
                            <Check className="h-4 w-4" />
                            <span>Acquis</span>
                          </div>
                        ) : (
                          <>
                            {buyingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.price}
                            <Zap className="h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
          <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
            "La véritable richesse ne réside pas dans ce que l'on possède, mais dans les outils que l'on utilise pour s'élever."
          </p>
        </div>
      </main>
    </div>
  );
}
