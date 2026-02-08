
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ArrowUp, Check, ChevronDown, Smile } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Oracle du Clavier Sacré v3.0.
 * Une interface de saisie sur-mesure, cinématique et immersive.
 * Touche Shift réimaginée, AZERTY purifié (sans . ni ,).
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
        // Empêcher le clavier système uniquement sur mobile
        if (window.innerWidth < 768) {
          target.setAttribute("inputmode", "none");
          setActiveInput(target);
          setIsVisible(true);
          
          if (target.type === "tel" || target.type === "number" || target.getAttribute("data-layout") === "numeric") {
            setLayout("numeric");
          } else {
            setLayout("alpha");
          }
        }
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")) {
          setIsVisible(false);
        }
      }, 150);
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
    let newValue = value;
    let newSelectionStart = start;

    if (key === "backspace") {
      if (start === end && start > 0) {
        newValue = value.substring(0, start - 1) + value.substring(end);
        newSelectionStart = start - 1;
      } else {
        newValue = value.substring(0, start) + value.substring(end);
        newSelectionStart = start;
      }
    } else if (key === "enter") {
      activeInput.blur();
      setIsVisible(false);
      return;
    } else if (key === "shift") {
      setIsShift(!isShift);
      return;
    } else if (key === "layout-switch") {
      setLayout(layout === "alpha" ? "numeric" : "alpha");
      return;
    } else if (key === "emoji") {
      newValue = value.substring(0, start) + "😊" + value.substring(end);
      newSelectionStart = start + 2;
    } else if (key === "space") {
      newValue = value.substring(0, start) + " " + value.substring(end);
      newSelectionStart = start + 1;
    } else {
      const char = isShift ? key.toUpperCase() : key.toLowerCase();
      newValue = value.substring(0, start) + char + value.substring(end);
      newSelectionStart = start + 1;
    }

    const prototype = activeInput instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    
    if (nativeSetter) {
      nativeSetter.call(activeInput, newValue);
    } else {
      activeInput.value = newValue;
    }

    activeInput.setSelectionRange(newSelectionStart, newSelectionStart);
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
  }, [activeInput, isShift, layout]);

  // Disposition AZERTY purifiée (sans . ni ,)
  const ALPHA_KEYS = [
    ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
    ["shift", "W", "X", "C", "V", "B", "N", "'", "backspace"],
    ["?123", "emoji", "space", "enter"]
  ];

  // Disposition Numérique & Symboles purifiée
  const NUMERIC_KEYS = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["@", "#", "&", "_", "-", "(", ")", "/", ":", ";"],
    ["+", "*", "\"", "'", "!", "?", "=", "%", "backspace"],
    ["abc", "emoji", "space", "enter"]
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
          <div className="flex justify-center mb-2">
            <button 
              onPointerDown={(e) => e.preventDefault()}
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
                    const isSpecial = ["shift", "backspace", "enter", "?123", "abc", "space", "emoji"].includes(key);
                    
                    return (
                      <motion.button
                        key={key}
                        tabIndex={-1}
                        whileTap={{ scale: 0.92, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => handleKeyPress(
                          key === "?123" || key === "abc" ? "layout-switch" : key
                        )}
                        className={cn(
                          "relative flex items-center justify-center rounded-xl font-bold transition-all select-none",
                          isSpecial ? "bg-primary/5 text-primary/60 text-xs px-3" : "bg-card/40 border border-primary/5 text-lg flex-1 shadow-sm",
                          key === "space" && "flex-[4]",
                          key === "enter" && "flex-[2] bg-primary text-primary-foreground",
                          key === "shift" && isShift && "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]",
                          !isSpecial && "active:shadow-inner"
                        )}
                      >
                        {key === "shift" ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <motion.div
                              animate={{ 
                                y: isShift ? -1 : 0,
                                scale: isShift ? 1.15 : 1
                              }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                              <ArrowUp className={cn("h-5 w-5", isShift ? "stroke-[3px]" : "stroke-2")} />
                            </motion.div>
                            <AnimatePresence>
                              {isShift && (
                                <motion.div 
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: 12, opacity: 1 }}
                                  exit={{ width: 0, opacity: 0 }}
                                  className="h-0.5 bg-current rounded-full"
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        ) : key === "backspace" ? (
                          <Delete className="h-5 w-5" />
                        ) : key === "enter" ? (
                          <Check className="h-5 w-5" />
                        ) : key === "emoji" ? (
                          <Smile className="h-5 w-5" />
                        ) : key === "space" ? (
                          <div className="w-12 h-1 bg-current opacity-20 rounded-full" />
                        ) : key === "?123" ? (
                          <span className="text-[10px] font-black tracking-tight uppercase">?123</span>
                        ) : key === "abc" ? (
                          <span className="text-[10px] font-black tracking-tight uppercase">abc</span>
                        ) : (
                          layout === "alpha" && isShift ? key.toUpperCase() : key
                        )}
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
