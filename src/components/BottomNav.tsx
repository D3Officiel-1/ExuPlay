
"use client";

import { motion } from "framer-motion";
import { Trophy, User, ShoppingBag, Medal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const NAV_ITEMS = [
  { name: "Échoppe", href: "/echoppe", icon: ShoppingBag },
  { name: "Défis", href: "/home", icon: Trophy },
  { name: "Hall", href: "/classement", icon: Medal },
  { name: "Profil", href: "/profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-6 pointer-events-none">
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

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => haptic.light()}
                className="relative flex-1 group"
              >
                <div className={cn(
                  "relative flex flex-col items-center justify-center py-2.5 px-2 rounded-[1.75rem] transition-all duration-500",
                  isActive ? "text-primary-foreground" : "text-foreground/30 hover:text-foreground/60"
                )}>
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="relative z-10"
                  >
                    <Icon className={cn(
                      "h-5 w-5 mb-1 transition-all duration-300",
                      isActive ? "stroke-[2.5]" : "stroke-2"
                    )} />
                  </motion.div>
                  
                  <motion.span 
                    className="relative z-10 text-[8px] font-black uppercase tracking-[0.2em] leading-none"
                  >
                    {item.name}
                  </motion.span>

                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary rounded-[1.75rem] shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
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
