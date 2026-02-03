
"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

export function Header() {
  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center bg-background/5 backdrop-blur-xl border-b border-primary/5"
    >
      <div className="max-w-screen-xl mx-auto w-full">
        <Logo layout="horizontal" />
      </div>
    </motion.header>
  );
}
