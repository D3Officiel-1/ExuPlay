
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
    <div className="fixed bottom-4 left-0 right-0 z-[100] px-6 pointer-events-none">
      <motion.nav 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md mx-auto pointer-events-auto"
      >
        <div className="relative bg-card/40 backdrop-blur-3xl border border-primary/5 rounded-[2rem] p-1.5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] flex items-center justify-between">
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
                  isQuiz && "flex-[1.2]" 
                )}
              >
                <div className={cn(
                  "relative flex flex-col items-center justify-center py-2.5 px-2 rounded-[1.75rem] transition-all duration-500",
                  isActive ? "text-primary-foreground" : "text-foreground/30 hover:text-foreground/60",
                  isQuiz && !isActive && "text-primary opacity-90 scale-105"
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
                        "absolute inset-0 rounded-[1.75rem] blur-xl -z-10",
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
                      "h-5 w-5 mb-1 transition-all duration-300",
                      isActive ? "stroke-[2.5]" : (isQuiz ? "stroke-[2.2]" : "stroke-2"),
                      isQuiz && !isActive && "text-primary"
                    )} />
                  </motion.div>
                  
                  <motion.span 
                    className={cn(
                      "relative z-10 text-[8px] font-black uppercase tracking-[0.2em] leading-none",
                      isQuiz && !isActive && "text-primary"
                    )}
                  >
                    {item.name}
                  </motion.span>

                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className={cn(
                        "absolute inset-0 bg-primary rounded-[1.75rem] shadow-[0_6px_20px_rgba(var(--primary-rgb),0.25)]",
                        isQuiz && "shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)]"
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
                      className="absolute inset-0 border border-primary/10 rounded-[1.75rem] pointer-events-none"
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
