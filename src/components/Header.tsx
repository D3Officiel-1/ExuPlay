
"use client";

import { useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Trophy, User as UserIcon } from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { useIsMobile } from "@/hooks/use-mobile";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export function Header() {
  const { user } = useUser();
  const db = useFirestore();
  const isMobile = useIsMobile();
  const { scrollY } = useScroll();
  const router = useRouter();
  const pathname = usePathname();

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);
  const totalPoints = profile?.totalPoints || 0;

  const isProfilePage = pathname === "/profil";

  // Animations stylées pilotées par le scroll (uniquement sur la page profil)
  const defaultOpacity = useTransform(scrollY, [40, 90], [1, 0]);
  const defaultY = useTransform(scrollY, [40, 90], [0, -25]);
  const defaultScale = useTransform(scrollY, [40, 90], [1, 0.85]);

  const userOpacity = useTransform(scrollY, [70, 110], [0, 1]);
  const userY = useTransform(scrollY, [70, 110], [25, 0]);
  const userScale = useTransform(scrollY, [70, 110], [0.85, 1]);

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
        "fixed top-0 left-0 right-0 z-[60] h-20",
        "flex items-center px-6 md:px-10",
        "bg-background/10 backdrop-blur-3xl",
        "after:absolute after:bottom-0 after:left-[25%] after:right-[25%] after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary/5 after:to-transparent"
      )}
    >
      <div className="max-w-screen-2xl mx-auto w-full relative h-full flex items-center">
        {/* Contenu Standard : App Name & Points */}
        <motion.div 
          style={isProfilePage && isMobile ? { 
            opacity: defaultOpacity, 
            y: defaultY, 
            scale: defaultScale 
          } : {}}
          className="w-full flex items-center justify-between"
        >
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            className="relative"
            onClick={() => router.push("/home")}
          >
            <div className="absolute -inset-2 bg-primary/5 blur-2xl rounded-full opacity-30 pointer-events-none" />
            <Logo layout="horizontal" className="relative z-10 scale-100 origin-left cursor-pointer" />
          </motion.div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center"
          >
            <button 
              onClick={() => router.push("/echange")}
              className="flex items-center gap-3 px-4 py-2 bg-card/40 backdrop-blur-3xl rounded-2xl border border-primary/5 shadow-lg group hover:border-primary/20 hover:bg-primary/5 transition-all duration-500"
            >
              <div className="relative">
                <Trophy className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-500" />
                <motion.div 
                  animate={{ opacity: [0, 1, 0], scale: [1, 1.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 bg-primary/20 rounded-full blur-sm"
                />
              </div>
              <div className="flex items-center leading-none">
                <span className="text-xs font-black tracking-tight">{totalPoints.toLocaleString()} PTS</span>
              </div>
            </button>
          </motion.div>
        </motion.div>

        {/* Contenu Profil : Avatar & Username (Visible au scroll sur mobile dans profil) */}
        {isProfilePage && isMobile && (
          <motion.div 
            style={{ 
              opacity: userOpacity, 
              y: userY, 
              scale: userScale
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
