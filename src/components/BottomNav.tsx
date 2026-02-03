
"use client";

import { motion } from "framer-motion";
import { Trophy, User, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Quiz", href: "/quiz", icon: Trophy },
  { name: "Profil", href: "/profil", icon: User },
  { name: "Paramètres", href: "/parametres", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[100] px-6 pointer-events-none">
      <motion.nav 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md mx-auto pointer-events-auto"
      >
        <div className="bg-card/40 backdrop-blur-3xl border border-primary/5 rounded-[2.5rem] p-2 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.2)] flex items-center justify-between">
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
                  "flex flex-col items-center justify-center py-3 px-2 rounded-[2rem] transition-all duration-500",
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/40 hover:text-foreground/70"
                )}>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className={cn("h-6 w-6 mb-1", isActive ? "stroke-[2.5]" : "stroke-2")} />
                  </motion.div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                    {item.name}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-primary rounded-[2rem] -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
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
