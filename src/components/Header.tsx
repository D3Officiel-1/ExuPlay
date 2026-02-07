
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Trophy, X, Bell, AlertTriangle, Shield, EyeOff, Megaphone, Zap, Sparkles } from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { getHonorTitle } from "@/lib/titles";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user } = useUser();
  const db = useFirestore();
  const { scrollY } = useScroll();
  const router = useRouter();
  const pathname = usePathname();
  const { toasts, dismiss } = useToast();
  
  const [showPointsVisionOverlay, setShowPointsVisionOverlay] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const appStatusRef = useMemo(() => (db ? doc(db, "appConfig", "status") : null), [db]);

  const { data: profile } = useDoc(userDocRef);
  const { data: appStatus } = useDoc(appStatusRef);
  
  const totalPoints = profile?.totalPoints || 0;
  const conversionRate = appStatus?.pointConversionRate ?? 0.5;
  const fcfaValue = Math.floor(totalPoints * conversionRate);
  
  const currentTitle = useMemo(() => getHonorTitle(totalPoints), [totalPoints]);

  const isProfilePage = pathname === "/profil";
  
  const activeToast = toasts.length > 0 ? toasts[0] : null;

  const defaultOpacity = useTransform(scrollY, [40, 90], [1, 0]);
  const defaultY = useTransform(scrollY, [40, 90], [0, -20]);
  const defaultScale = useTransform(scrollY, [40, 90], [1, 0.9]);

  const profileOpacity = useTransform(scrollY, [60, 100], [0, 1]);
  const profileY = useTransform(scrollY, [60, 100], [20, 0]);
  const profileScale = useTransform(scrollY, [60, 100], [0.8, 1]);

  const hidePoints = profile?.hidePointsInHeader === true;

  const hasAnnouncement = appStatus?.globalAnnouncement && appStatus.globalAnnouncement.trim() !== "";

  // Oracle du Verrouillage de Scroll pour la Vision de Prospérité
  useEffect(() => {
    if (showPointsVisionOverlay) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPointsVisionOverlay]);

  const handlePointsVisionStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button === 2) {
      e.preventDefault();
      haptic.impact();
      setShowPointsVisionOverlay(true);
      return;
    }

    longPressTimer.current = setTimeout(() => {
      haptic.impact();
      setShowPointsVisionOverlay(true);
    }, 600);
  };

  const handlePointsVisionEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    haptic.impact();
    setShowPointsVisionOverlay(true);
  };

  return (
    <>
      <motion.header 
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          duration: 1, 
          ease: [0.22, 1, 0.36, 1],
          delay: 0.1
        }}
        className={cn(
          "fixed top-0 left-0 right-0 z-40",
          "flex flex-col",
          "bg-background/10 backdrop-blur-3xl"
        )}
      >
        <AnimatePresence>
          {hasAnnouncement && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full bg-primary overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
            >
              <div className="px-6 py-2.5 flex items-center justify-center gap-3">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Megaphone className="h-3 w-3 text-primary-foreground" />
                </motion.div>
                <p className="text-[9px] font-black text-primary-foreground uppercase tracking-[0.2em] text-center leading-none">
                  {appStatus.globalAnnouncement}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-20 px-6 md:px-10 flex items-center relative">
          <div className="max-w-screen-2xl mx-auto w-full relative h-full flex items-center">
            <AnimatePresence mode="wait">
              {activeToast ? (
                <motion.div
                  key={`toast-${activeToast.id}`}
                  initial={{ opacity: 0, y: 15, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -15, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 z-[60] px-2",
                    activeToast.variant === 'destructive' ? "text-destructive" : "text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 pl-2">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      activeToast.variant === 'destructive' ? "bg-destructive/20" : "bg-primary/10"
                    )}>
                      {activeToast.variant === 'destructive' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      {activeToast.title && (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-0.5">
                          {activeToast.title}
                        </span>
                      )}
                      {activeToast.description && (
                        <span className="text-[9px] font-medium opacity-60 line-clamp-1 leading-tight">
                          {activeToast.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeToast.action}
                    <button 
                      onClick={() => dismiss(activeToast.id)}
                      className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center hover:bg-primary/10 transition-colors"
                    >
                      <X className="h-4 w-4 opacity-40" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="header-content"
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full flex items-center relative"
                >
                  <motion.div 
                    style={isProfilePage ? { 
                      opacity: defaultOpacity, 
                      y: defaultY, 
                      scale: defaultScale 
                    } : {}}
                    className="w-full flex items-center justify-between"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => router.push("/home")}
                    >
                      <Logo layout="horizontal" className="scale-100 origin-left" />
                    </div>

                    <button 
                      onClick={() => { haptic.light(); router.push("/echange"); }}
                      onContextMenu={handleContextMenu}
                      onPointerDown={handlePointsVisionStart}
                      onPointerUp={handlePointsVisionEnd}
                      onPointerLeave={handlePointsVisionEnd}
                      className="flex items-center gap-3 px-4 py-2 bg-card/40 backdrop-blur-3xl rounded-2xl border border-primary/5 shadow-lg group hover:border-primary/20 hover:bg-primary/5 transition-all duration-300"
                    >
                      <div className="relative">
                        <Trophy className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        <motion.div 
                          animate={{ opacity: [0, 1, 0], scale: [1, 1.4, 1] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                          className="absolute inset-0 bg-primary/20 rounded-full blur-sm"
                        />
                      </div>
                      
                      {hidePoints ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-center w-12"
                        >
                          <EyeOff className="h-3.5 w-3.5 opacity-20 animate-pulse" />
                        </motion.div>
                      ) : (
                        <span className="text-xs font-black tracking-tight">{totalPoints.toLocaleString()} PTS</span>
                      )}
                    </button>
                  </motion.div>

                  {isProfilePage && (
                    <motion.div 
                      style={{ 
                        opacity: profileOpacity, 
                        y: profileY, 
                        scale: profileScale
                      }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="flex items-center gap-3 bg-card/60 backdrop-blur-3xl px-5 py-2 rounded-2xl border border-primary/5 shadow-2xl pointer-events-auto">
                        <ProfileAvatar imageUrl={profile?.profileImage} points={totalPoints} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-sm font-black tracking-tight">@{profile?.username || "Esprit"}</span>
                          <div className="flex items-center gap-1">
                            <Shield className={cn("h-2 w-2", currentTitle.color)} />
                            <span className={cn("text-[7px] font-black uppercase tracking-[0.2em] opacity-60", currentTitle.color)}>
                              {currentTitle.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          animate={{
            x: ["-100%", "300%"],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 3
          }}
          className="absolute bottom-0 left-[30%] w-10 h-[1px] bg-gradient-to-r from-transparent via-primary/10 to-transparent z-10"
        />
      </motion.header>

      {/* Vision de la Prospérité - Plein Écran Adaptatif */}
      <AnimatePresence>
        {showPointsVisionOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(20px)" }}
            className="fixed inset-0 z-[10000] bg-background/90 backdrop-blur-[40px] overflow-y-auto"
            onClick={() => setShowPointsVisionOverlay(false)}
          >
            {/* Background éthéré fixe */}
            <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary/20 blur-[120px]" 
              />
            </div>

            <div className="min-h-full w-full flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">
              <motion.div
                initial={{ scale: 0.8, y: 40, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  y: 0, 
                  opacity: 1,
                  transition: { type: "spring", damping: 20, stiffness: 100, delay: 0.1 }
                }}
                exit={{ scale: 0.8, y: 20, opacity: 0 }}
                className="w-full max-w-sm space-y-10 sm:space-y-12 text-center py-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-6">
                  <div className="relative mx-auto w-24 h-24">
                    <motion.div 
                      animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-3xl"
                    />
                    <div className="relative h-full w-full bg-card rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-2xl">
                      <Zap className="h-10 w-10 text-primary" />
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-10px] border border-dashed border-primary/20 rounded-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Oracle de la Valeur</p>
                    <h2 className="text-3xl font-black italic tracking-tight uppercase">Énergie Matérialisée</h2>
                  </div>
                </div>

                <div className="p-8 sm:p-10 bg-primary/5 rounded-[3.5rem] border border-primary/10 shadow-inner space-y-8 relative overflow-hidden group">
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
                  />
                  
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Votre Lumière</p>
                    <p className="text-4xl font-black tabular-nums">{totalPoints.toLocaleString()} <span className="text-xs opacity-20">PTS</span></p>
                  </div>

                  <div className="h-px w-12 bg-primary/10 mx-auto" />

                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Prospérité Terrestre</p>
                    <p className="text-5xl font-black text-primary tabular-nums tracking-tighter">
                      {fcfaValue.toLocaleString()} <span className="text-sm opacity-40">FCFA</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[9px] font-medium opacity-40 px-8 leading-relaxed italic">
                    "Chaque point de lumière est un pas vers l'abondance. La pensée se transforme en réalité."
                  </p>
                  <Button 
                    onClick={() => setShowPointsVisionOverlay(false)}
                    className="w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl shadow-primary/20"
                  >
                    Refermer le Portail
                  </Button>
                </div>
              </motion.div>

              {/* Indicateur de bas de page interne au scroll */}
              <div className="py-8 flex items-center gap-4 opacity-20">
                <div className="h-px w-12 bg-primary/20" />
                <Sparkles className="h-4 w-4" />
                <div className="h-px w-12 bg-primary/20" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
