
"use client";

import { motion } from "framer-motion";
import { Trophy, User, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Réglages", href: "/parametres", icon: Settings },
  { name: "Quiz", href: "/quiz", icon: Trophy },
  { name: "Profil", href: "/profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] px-6 pointer-events-none">
      <motion.nav 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md mx-auto pointer-events-auto"
      >
        <div className="relative bg-card/40 backdrop-blur-3xl border border-primary/5 rounded-[2.5rem] p-2 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] flex items-center justify-between">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isQuiz = item.name === "Quiz";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex-1 group",
                  isQuiz && "flex-[1.2]" // Plus d'espace pour le quiz
                )}
              >
                <div className={cn(
                  "relative flex flex-col items-center justify-center py-4 px-2 rounded-[2rem] transition-all duration-500",
                  isActive ? "text-primary-foreground" : "text-foreground/30 hover:text-foreground/60",
                  isQuiz && !isActive && "text-primary opacity-90 scale-105" // Le quiz reste visible même inactif
                )}>
                  {/* Effet d'aura pulsante pour le Quiz uniquement */}
                  {isQuiz && (
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.15, 1],
                        opacity: isActive ? [0.4, 0.2, 0.4] : [0.2, 0, 0.2]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className={cn(
                        "absolute inset-0 rounded-[2rem] blur-xl -z-10",
                        isActive ? "bg-primary/40" : "bg-primary/20"
                      )}
                    />
                  )}

                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="relative z-10"
                  >
                    <Icon className={cn(
                      "h-6 w-6 mb-1.5 transition-all duration-300",
                      isActive ? "stroke-[2.5]" : (isQuiz ? "stroke-[2.2]" : "stroke-2"),
                      isQuiz && !isActive && "text-primary"
                    )} />
                  </motion.div>
                  
                  <motion.span 
                    className={cn(
                      "relative z-10 text-[9px] font-black uppercase tracking-[0.25em] leading-none",
                      isQuiz && !isActive && "text-primary"
                    )}
                  >
                    {item.name}
                  </motion.span>

                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className={cn(
                        "absolute inset-0 bg-primary rounded-[2rem] shadow-[0_8px_24px_rgba(var(--primary-rgb),0.3)]",
                        isQuiz && "shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]"
                      )}
                      transition={{ 
                        type: "spring", 
                        bounce: 0.25, 
                        duration: 0.6,
                        layout: { duration: 0.4 }
                      }}
                    />
                  )}

                  {/* Animation de respiration discrète pour le Quiz */}
                  {isQuiz && !isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 border border-primary/10 rounded-[2rem] pointer-events-none"
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
