"use client";

import { useMemo } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Trophy, User as UserIcon, X, Bell, AlertTriangle } from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

/**
 * @fileOverview En-tête cinématique du Sanctuaire.
 * Fusionne intelligemment le branding, les points de l'esprit et le système de notifications.
 */
export function Header() {
  const { user } = useUser();
  const db = useFirestore();
  const { scrollY } = useScroll();
  const router = useRouter();
  const pathname = usePathname();
  const { toasts, dismiss } = useToast();

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);
  const totalPoints = profile?.totalPoints || 0;

  const isProfilePage = pathname === "/profil";
  
  const activeToast = toasts.length > 0 ? toasts[0] : null;

  const defaultOpacity = useTransform(scrollY, [40, 90], [1, 0]);
  const defaultY = useTransform(scrollY, [40, 90], [0, -20]);
  const defaultScale = useTransform(scrollY, [40, 90], [1, 0.9]);

  const profileOpacity = useTransform(scrollY, [60, 100], [0, 1]);
  const profileY = useTransform(scrollY, [60, 100], [20, 0]);
  const profileScale = useTransform(scrollY, [60, 100], [0.8, 1]);

  const currentImage = profile?.profileImage;

  return (
    <motion.header 
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        duration: 1, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.1
      }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-20",
        "flex items-center px-6 md:px-10",
        "bg-background/10 backdrop-blur-3xl",
        "after:absolute after:bottom-0 after:left-[25%] after:right-[25%] after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary/5 after:to-transparent"
      )}
    >
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
                  onClick={() => router.push("/echange")}
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
                  <span className="text-xs font-black tracking-tight">{totalPoints.toLocaleString()} PTS</span>
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
                    <div className="relative h-8 w-8 rounded-full overflow-hidden border border-primary/10 bg-primary/5">
                      {currentImage ? (
                        <Image src={currentImage} alt="Profile" fill className="object-cover" />
                      ) : (
                        <UserIcon className="h-4 w-4 text-primary m-auto absolute inset-0" />
                      )}
                    </div>
                    <span className="text-sm font-black tracking-tight">@{profile?.username || "Esprit"}</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
  );
}