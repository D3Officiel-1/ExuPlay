
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ArrowUp, Check, Hash, Languages, ChevronDown } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Oracle du Clavier Sacré.
 * Une interface de saisie sur-mesure, cinématique et immersive.
 */

type KeyboardLayout = "alpha" | "numeric";

export function CustomKeyboard() {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [layout, setLayout] = useState<KeyboardLayout>("alpha");
  const [isShift, setIsShift] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Écouter les focus pour déclencher le clavier
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        // Empêcher le clavier système de force
        target.setAttribute("inputmode", "none");
        setActiveInput(target);
        setIsVisible(true);
        
        // Déterminer le layout
        if (target.type === "tel" || target.type === "number" || target.getAttribute("data-layout") === "numeric") {
          setLayout("numeric");
        } else {
          setLayout("alpha");
        }
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // On attend un peu pour voir si un autre input prend le focus
      setTimeout(() => {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          setIsVisible(false);
        }
      }, 100);
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    if (!activeInput) return;
    haptic.light();

    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const value = activeInput.value;

    if (key === "backspace") {
      if (start === end && start > 0) {
        activeInput.value = value.substring(0, start - 1) + value.substring(end);
        activeInput.setSelectionRange(start - 1, start - 1);
      } else {
        activeInput.value = value.substring(0, start) + value.substring(end);
        activeInput.setSelectionRange(start, start);
      }
    } else if (key === "enter") {
      activeInput.blur();
      setIsVisible(false);
    } else if (key === "shift") {
      setIsShift(!isShift);
      return;
    } else if (key === "layout-switch") {
      setLayout(layout === "alpha" ? "numeric" : "alpha");
      return;
    } else {
      const char = isShift ? key.toUpperCase() : key.toLowerCase();
      activeInput.value = value.substring(0, start) + char + value.substring(end);
      activeInput.setSelectionRange(start + 1, start + 1);
    }

    // Déclencher l'événement 'input' pour que React/Firebase voient le changement
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
  }, [activeInput, isShift, layout]);

  const ALPHA_KEYS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["shift", "Z", "X", "C", "V", "B", "N", "M", "backspace"],
    ["123", "space", "enter"]
  ];

  const NUMERIC_KEYS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["ABC", "0", "backspace"],
    ["enter"]
  ];

  const rows = layout === "alpha" ? ALPHA_KEYS : NUMERIC_KEYS;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[10002] px-2 pb-safe-area-inset-bottom pointer-events-none"
        >
          {/* Header du clavier pour fermeture rapide */}
          <div className="flex justify-center mb-2">
            <button 
              onClick={() => { haptic.medium(); activeInput?.blur(); setIsVisible(false); }}
              className="h-8 w-16 bg-card/40 backdrop-blur-3xl rounded-full border border-primary/5 flex items-center justify-center shadow-lg pointer-events-auto"
            >
              <ChevronDown className="h-4 w-4 opacity-40" />
            </button>
          </div>

          <div className="max-w-md mx-auto bg-card/60 backdrop-blur-[45px] border-t border-x border-primary/5 rounded-t-[2.5rem] p-3 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.4)] pointer-events-auto">
            <div className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <div key={i} className="flex justify-center gap-1.5 h-12">
                  {row.map((key) => {
                    const isSpecial = ["shift", "backspace", "enter", "123", "ABC", "space"].includes(key);
                    const isLong = key === "space" || key === "enter";
                    
                    return (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.92, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
                        onClick={() => handleKeyPress(
                          key === "123" || key === "ABC" ? "layout-switch" : key
                        )}
                        className={cn(
                          "relative flex items-center justify-center rounded-xl font-bold transition-colors select-none",
                          isSpecial ? "bg-primary/5 text-primary/60 text-xs px-3" : "bg-card/40 border border-primary/5 text-lg flex-1",
                          key === "space" && "flex-[3]",
                          key === "enter" && "flex-[1.5] bg-primary text-primary-foreground",
                          key === "shift" && isShift && "bg-primary text-primary-foreground opacity-100",
                          !isSpecial && "shadow-sm active:shadow-inner"
                        )}
                      >
                        {key === "shift" && <ArrowUp className={cn("h-5 w-5", isShift ? "fill-current" : "")} />}
                        {key === "backspace" && <Delete className="h-5 w-5" />}
                        {key === "enter" && <Check className="h-5 w-5" />}
                        {key === "space" && <div className="w-12 h-1 bg-current opacity-20 rounded-full" />}
                        {key === "123" && <Hash className="h-4 w-4" />}
                        {key === "ABC" && <Languages className="h-4 w-4" />}
                        {!isSpecial && (isShift ? key.toUpperCase() : key.toLowerCase())}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
