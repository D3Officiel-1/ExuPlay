"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const LINKS = [
  { name: "Explorer", href: "/random" },
  { name: "Esprits", href: "/philosophes" },
  { name: "Thèmes", href: "/themes" },
  { name: "Favoris", href: "/favoris" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-8">
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative text-[11px] font-bold uppercase tracking-[0.2em] transition-colors",
              isActive ? "text-foreground" : "text-foreground/40 hover:text-foreground/70"
            )}
          >
            {link.name}
            {isActive && (
              <motion.div
                layoutId="nav-underline"
                className="absolute -bottom-1 left-0 right-0 h-px bg-foreground"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
