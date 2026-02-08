
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Copy, X } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Oracle du Menu de Sélection.
 * Une interface flottante cinématique qui apparaît lors de la sélection de texte.
 * Offre les commandes de base (Couper, Copier, Annuler) avec une esthétique moderne.
 */

export function TextSelectionMenu() {
  const [menuData, setMenuData] = useState<{ x: number; y: number; text: string } | null>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    
    // On n'affiche le menu que si du texte est réellement sélectionné
    if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
      setMenuData(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Positionner le menu au centre horizontal de la sélection et juste au-dessus
      setMenuData({
        x: rect.left + rect.width / 2,
        y: rect.top - 12,
        text: selection.toString()
      });
    } catch (e) {
      setMenuData(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    // On ferme aussi le menu si on clique ailleurs sans changer la sélection
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.selection-menu-container')) {
        // Laisser selectionchange gérer la fermeture si nécessaire
      }
    };
    
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [handleSelectionChange]);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!menuData) return;
    
    haptic.light();
    navigator.clipboard.writeText(menuData.text);
    
    // Dissiper la sélection après l'action
    window.getSelection()?.removeAllRanges();
    setMenuData(null);
  };

  const handleCut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!menuData) return;
    
    haptic.medium();
    navigator.clipboard.writeText(menuData.text);
    
    const activeElement = document.activeElement;
    // Si nous sommes dans un champ de saisie, on retire le texte physiquement
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      const val = activeElement.value;
      const newVal = val.substring(0, start) + val.substring(end);
      
      // Utilisation du Native Setter pour la compatibilité React/State
      const prototype = activeElement instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      
      if (nativeSetter) {
        nativeSetter.call(activeElement, newVal);
      } else {
        activeElement.value = newVal;
      }
      
      // Repositionner le curseur et notifier les listeners
      activeElement.setSelectionRange(start, start);
      activeElement.dispatchEvent(new Event("input", { bubbles: true }));
      activeElement.dispatchEvent(new Event("change", { bubbles: true }));
    }
    
    window.getSelection()?.removeAllRanges();
    setMenuData(null);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptic.light();
    window.getSelection()?.removeAllRanges();
    setMenuData(null);
  };

  return (
    <AnimatePresence>
      {menuData && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 10, scale: 0.9, x: "-50%" }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          style={{ 
            position: "fixed", 
            left: menuData.x, 
            top: menuData.y,
            zIndex: 10003,
            transform: "translate(-50%, -100%)"
          }}
          className="selection-menu-container pointer-events-auto"
        >
          <div className="flex items-center gap-0.5 p-1 bg-card/80 backdrop-blur-3xl border border-primary/10 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
            <button 
              onPointerDown={(e) => e.preventDefault()} // Empêcher la perte de focus
              onClick={handleCut}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-primary/5 active:bg-primary/10 transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest group"
            >
              <Scissors className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
              <span>Couper</span>
            </button>
            
            <div className="w-[1px] h-4 bg-primary/10 mx-0.5" />
            
            <button 
              onPointerDown={(e) => e.preventDefault()}
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-primary/5 active:bg-primary/10 transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest group"
            >
              <Copy className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
              <span>Copier</span>
            </button>
            
            <div className="w-[1px] h-4 bg-primary/10 mx-0.5" />
            
            <button 
              onPointerDown={(e) => e.preventDefault()}
              onClick={handleCancel}
              className="flex items-center justify-center w-10 h-10 hover:bg-destructive/5 active:bg-destructive/10 transition-colors rounded-xl text-destructive group"
            >
              <X className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
          
          {/* Indicateur visuel (flèche) */}
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-card/80 mx-auto mt-[-1px]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
