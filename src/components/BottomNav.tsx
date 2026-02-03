
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

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex-1 group"
              >
                <div className={cn(
                  "flex flex-col items-center justify-center py-4 px-2 rounded-[2rem] transition-colors duration-500",
                  isActive ? "text-primary-foreground" : "text-foreground/30 hover:text-foreground/60"
                )}>
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="relative z-10"
                  >
                    <Icon className={cn(
                      "h-6 w-6 mb-1.5 transition-all duration-300",
                      isActive ? "stroke-[2.5]" : "stroke-2"
                    )} />
                  </motion.div>
                  
                  <motion.span 
                    className="relative z-10 text-[9px] font-black uppercase tracking-[0.25em] leading-none"
                  >
                    {item.name}
                  </motion.span>

                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary rounded-[2rem] shadow-[0_8px_24px_rgba(var(--primary-rgb),0.3)]"
                      transition={{ 
                        type: "spring", 
                        bounce: 0.25, 
                        duration: 0.6,
                        layout: { duration: 0.4 }
                      }}
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
