"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Image from "next/image";

interface FullscreenImageOverlayProps {
  src: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * @fileOverview Un composant d'overlay pour afficher une image en plein écran.
 * Utilise Framer Motion pour des transitions cinématiques.
 */
export function FullscreenImageOverlay({ src, isOpen, onClose }: FullscreenImageOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-2xl flex items-center justify-center p-6 cursor-zoom-out"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -5, filter: "blur(20px)" }}
            animate={{ scale: 1, opacity: 1, rotate: 0, filter: "blur(0px)" }}
            exit={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative aspect-square w-full max-w-md rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-primary/10"
            onClick={(e) => e.stopPropagation()}
          >
            <Image 
              src={src} 
              alt="Profil Fullscreen" 
              fill 
              className="object-cover"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full h-10 w-10 backdrop-blur-md border border-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
