
"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Moon, 
  Sun, 
  Monitor, 
  ChevronRight, 
  Info, 
  ShieldCheck, 
  EyeOff, 
  Loader2, 
  ZapOff, 
  Eye, 
  Palette, 
  Sparkles, 
  Check, 
  Pipette, 
  RotateCcw, 
  Layout, 
  Swords,
  Settings,
  Zap,
  Hash
} from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { PRESET_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * @fileOverview Prisme Spectral - Composant de sélection de couleur personnalisé.
 */
function SpectralPicker({ 
  initialColor, 
  onApply, 
  onCancel,
  isUpdating 
}: { 
  initialColor: string, 
  onApply: (hex: string) => void, 
  onCancel: () => void,
  isUpdating: boolean
}) {
  const [hue, setHue] = useState(0);
  const [hex, setHex] = useState(initialColor === 'default' ? '#3b82f6' : initialColor);

  // Convertir Hex en Hue au montage pour aligner le slider
  useEffect(() => {
    const hexToHue = (h: string) => {
      let r = 0, g = 0, b = 0;
      if (h.length === 4) {
        r = parseInt(h[1] + h[1], 16);
        g = parseInt(h[2] + h[2], 16);
        b = parseInt(h[3] + h[3], 16);
      } else if (h.length === 7) {
        r = parseInt(h.substring(1, 3), 16);
        g = parseInt(h.substring(3, 5), 16);
        b = parseInt(h.substring(5, 7), 16);
      }
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let hueVal = 0;
      if (max !== min) {
        const d = max - min;
        switch (max) {
          case r: hueVal = (g - b) / d + (g < b ? 6 : 0); break;
          case g: hueVal = (b - r) / d + 2; break;
          case b: hueVal = (r - g) / d + 4; break;
        }
        hueVal /= 6;
      }
      return Math.round(hueVal * 360);
    };
    setHue(hexToHue(hex));
  }, []);

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    // On garde une saturation et une luminosité fixes pour une esthétique cohérente avec le Sanctuaire
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    setHex(hslToHex(newHue, 80, 60));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full space-y-8 p-4 bg-primary/5 rounded-[2.5rem] border border-primary/5"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Prisme Spectral</p>
          <span className="text-[10px] font-black tabular-nums text-primary">{hex.toUpperCase()}</span>
        </div>

        {/* Hue Slider Personnalisé */}
        <div className="relative h-8 w-full rounded-xl overflow-hidden cursor-pointer">
          <div 
            className="absolute inset-0"
            style={{ 
              background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' 
            }}
          />
          <input 
            type="range" 
            min="0" 
            max="360" 
            value={hue} 
            onChange={(e) => handleHueChange(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <motion.div 
            animate={{ left: `${(hue / 360) * 100}%` }}
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
          />
        </div>

        {/* Hex Input */}
        <div className="relative">
          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-20" />
          <Input 
            value={hex.replace('#', '')}
            onChange={(e) => setHex('#' + e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
            className="h-14 bg-background/50 border-none rounded-2xl text-center font-black text-lg pl-10"
            placeholder="FFFFFF"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest">
          Retour
        </Button>
        <Button 
          onClick={() => onApply(hex)} 
          disabled={isUpdating}
          className="flex-[2] h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-primary/20"
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Invoquer cette Teinte
        </Button>
      </div>
    </motion.div>
  );
}

export default function ParametresPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);
  const [activeTab, setActiveTab] = useState("aura");
  const [isSpectralMode, setIsSpectralMode] = useState(false);
  
  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);

  const handleUpdateSetting = async (field: string, value: any) => {
    if (!userDocRef) return;
    haptic.light();
    
    try {
      await updateDoc(userDocRef, {
        [field]: value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: { [field]: value },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    handleUpdateSetting('theme', newTheme);
  };

  const handleApplyColor = async (type: 'aura' | 'bg', hex: string) => {
    if (!userDocRef || isUpdatingColor) return;
    haptic.medium();
    setIsUpdatingColor(true);
    
    const field = type === 'aura' ? 'customColor' : 'customBgColor';
    
    try {
      await updateDoc(userDocRef, {
        [field]: hex,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Harmonie mise à jour", description: "L'essence a été infusée avec succès." });
      setIsSpectralMode(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance" });
    } finally {
      setIsUpdatingColor(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const currentColor = profile?.customColor || 'default';
  const currentBgColor = profile?.customBgColor || 'default';
  
  const activeColorForPicker = activeTab === 'aura' ? currentColor : currentBgColor;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Configuration</p>
          <h1 className="text-3xl font-black tracking-tight">Paramètres</h1>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          {/* Section Sécurité */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <ShieldCheck className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Protection</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-2">
                <button 
                  onClick={() => router.push("/parametres/securite")}
                  className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors rounded-2xl group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Verrouillage Biométrique</p>
                      <p className="text-[10px] opacity-40 font-medium">Protéger l'accès avec un Sceau</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                </button>
              </CardContent>
            </Card>
          </motion.section>

          {/* Section Expérience */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <Zap className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Expérience</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between p-3 rounded-2xl group hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => { haptic.light(); setIsColorDialogOpen(true); }}>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center relative overflow-hidden">
                      <Palette className="h-5 w-5 text-primary opacity-60" />
                      {currentColor !== 'default' && (
                        <div 
                          className="absolute inset-0 opacity-20" 
                          style={{ backgroundColor: currentColor }} 
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold">Harmonie de l'Esprit</p>
                      <p className="text-[10px] opacity-40 font-medium">Aura & Fond personnalisés</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <ZapOff className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Mode Éco-Éther</p>
                      <p className="text-[10px] opacity-40 font-medium">Réduire les animations</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.reducedMotion ?? false} 
                    onCheckedChange={(checked) => handleUpdateSetting('reducedMotion', checked)} 
                  />
                </div>

                <div className="pt-4 border-t border-primary/5 mt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 px-2">Ambiance visuelle</p>
                  <RadioGroup 
                    value={theme} 
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-3 gap-3"
                  >
                    {[
                      { id: 'light', label: 'Clair', icon: Sun },
                      { id: 'dark', label: 'Sombre', icon: Moon },
                      { id: 'system', label: 'Auto', icon: Monitor },
                    ].map((item) => (
                      <div key={item.id}>
                        <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" />
                        <Label
                          htmlFor={item.id}
                          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-transparent bg-background/50 p-4 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer group"
                        >
                          <item.icon className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Section Confidentialité */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <EyeOff className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Discrétion</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <EyeOff className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Voile de l'Esprit</p>
                      <p className="text-[10px] opacity-40 font-medium">Invisible dans le classement</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.rankingHidden ?? false} 
                    onCheckedChange={(checked) => handleUpdateSetting('rankingHidden', checked)} 
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Eye className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Sceau d'Invisibilité</p>
                      <p className="text-[10px] opacity-40 font-medium">Masquer les points dans l'entête</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.hidePointsInHeader ?? false} 
                    onCheckedChange={(checked) => handleUpdateSetting('hidePointsInHeader', checked)} 
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Swords className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Sceau de Paix</p>
                      <p className="text-[10px] opacity-40 font-medium">Refuser les chocs d'esprits</p>
                    </div>
                  </div>
                  <Switch 
                    checked={profile?.duelProtected ?? false} 
                    onCheckedChange={(checked) => handleUpdateSetting('duelProtected', checked)} 
                  />
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Section À propos & Session */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-3 pl-2">
              <Info className="h-4 w-4 text-primary opacity-60" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Sanctuaire</h2>
            </div>
            <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-2 space-y-1">
                <button 
                  onClick={() => router.push("/conditions")}
                  className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors rounded-2xl group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <Scale className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Conditions d'Utilisation</p>
                      <p className="text-[10px] opacity-40 font-medium">Vos droits et engagements</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-60 transition-opacity" />
                </button>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/5 mx-2 mb-2">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Settings className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Version de l'Éveil</p>
                      <p className="text-[10px] opacity-40 font-medium tracking-widest uppercase">2.4.0 - Chroma Flux</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </main>

      {/* Dialogue de sélection de couleur */}
      <Dialog open={isColorDialogOpen} onOpenChange={(open) => { setIsColorDialogOpen(open); if(!open) setIsSpectralMode(false); }}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <div className="space-y-1 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Harmonisation</p>
                <DialogTitle className="text-2xl font-black tracking-tight italic">Nuances de l'Esprit</DialogTitle>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setIsSpectralMode(false); }} className="w-full">
              <TabsList className="grid grid-cols-2 bg-primary/5 p-1 h-12 rounded-xl mb-8">
                <TabsTrigger value="aura" className="rounded-lg font-black text-[10px] uppercase tracking-widest gap-2">
                  <Zap className="h-3 w-3" /> Aura Primaire
                </TabsTrigger>
                <TabsTrigger value="bg" className="rounded-lg font-black text-[10px] uppercase tracking-widest gap-2">
                  <Layout className="h-3 w-3" /> Fond Principal
                </TabsTrigger>
              </TabsList>

              <div className="space-y-8 flex flex-col items-center">
                <div className="relative">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="h-32 w-32 rounded-[3rem] shadow-2xl border-4 border-white/10 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: activeTab === 'aura' ? (currentColor === 'default' ? '#000000' : currentColor) : (currentBgColor === 'default' ? '#ffffff' : currentBgColor) }}
                  >
                    <Sparkles className="h-12 w-12 text-white mix-blend-difference opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                  </motion.div>
                  <motion.div 
                    animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 blur-3xl -z-10 rounded-full"
                    style={{ backgroundColor: activeTab === 'aura' ? (currentColor === 'default' ? '#000000' : currentColor) : (currentBgColor === 'default' ? '#ffffff' : currentBgColor) }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  {isSpectralMode ? (
                    <SpectralPicker 
                      key="spectral"
                      initialColor={activeColorForPicker}
                      onApply={(hex) => handleApplyColor(activeTab as any, hex)}
                      onCancel={() => setIsSpectralMode(false)}
                      isUpdating={isUpdatingColor}
                    />
                  ) : (
                    <motion.div 
                      key="presets"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full space-y-6"
                    >
                      <div className="grid grid-cols-6 gap-3">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => handleApplyColor(activeTab as any, color.hex)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              (activeTab === 'aura' ? currentColor : currentBgColor) === color.hex ? "border-primary scale-125 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                            )}
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                        <button
                          onClick={() => { haptic.light(); setIsSpectralMode(true); }}
                          className="h-8 w-8 rounded-full bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center hover:bg-primary/10"
                        >
                          <Pipette className="h-4 w-4 opacity-40" />
                        </button>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => handleApplyColor(activeTab as any, 'default')} disabled={isUpdatingColor} className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2">
                          <RotateCcw className="h-4 w-4" /> Reset
                        </Button>
                        <Button variant="ghost" onClick={() => setIsColorDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest opacity-40">
                          Quitter
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Tabs>

            {!isSpectralMode && (
              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
                <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
                  "Chaque nuance résonne avec votre quête de Lumière."
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
