"use client";

import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { User as UserIcon, X } from "lucide-react";
import Image from "next/image";

interface ProfilePhotoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null | undefined;
  username: string;
}

/**
 * @fileOverview Sanctuaire Visuel.
 * Un composant dédié à l'affichage cinématique de la photo de profil.
 */
export function ProfilePhotoDialog({ 
  isOpen, 
  onOpenChange, 
  imageUrl, 
  username 
}: ProfilePhotoDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl bg-transparent border-none p-0 overflow-hidden shadow-none ring-0 focus:outline-none [&>button]:hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          exit={{ scale: 0.9, opacity: 0, filter: "blur(20px)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full aspect-square bg-card/20 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden"
        >
          {imageUrl ? (
            <Image 
              src={imageUrl} 
              alt={`Portrait de @${username}`} 
              fill 
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <UserIcon className="h-32 w-32 text-primary opacity-20" />
            </div>
          )}
          
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className="bg-background/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest">@{username}</p>
            </div>
          </div>

          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-6 right-6 h-10 w-10 bg-background/40 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center hover:bg-background/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
