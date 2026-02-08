
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ArrowUp, Check, ChevronDown, Smile, Dog, Pizza, Bike, Plane, Lightbulb, Heart, Flag, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";

/**
 * @fileOverview Oracle du Clavier 3D Animé v5.5.
 * Une interface de saisie révolutionnaire avec emojis 3D animés et barre de résonance.
 */

type KeyboardLayout = "alpha" | "numeric" | "emoji";

const EMOJI_CATEGORIES = [
  { 
    id: "smilies", 
    icon: Smile, 
    items: [
      { char: "😊", hex: "1f60a" }, { char: "😂", hex: "1f602" }, { char: "🥰", hex: "1f970" }, 
      { char: "😍", hex: "1f60d" }, { char: "🤩", hex: "1f929" }, { char: "😎", hex: "1f60e" }, 
      { char: "🤔", hex: "1f914" }, { char: "🧐", hex: "1f9d0" }, { char: "🥳", hex: "1f973" },
      { char: "😇", hex: "1f607" }, { char: "🤠", hex: "1f920" }, { char: "🤡", hex: "1f921" },
      { char: "👻", hex: "1f47b" }, { char: "👽", hex: "1f47d" }, { char: "👾", hex: "1f47e" },
      { char: "🤖", hex: "1f916" }, { char: "😈", hex: "1f608" }, { char: "👹", hex: "1f479" }
    ]
  },
  { 
    id: "nature", 
    icon: Dog, 
    items: [
      { char: "🐶", hex: "1f436" }, { char: "🐱", hex: "1f431" }, { char: "🐭", hex: "1f42d" }, 
      { char: "🦁", hex: "1f981" }, { char: "🐯", hex: "1f42f" }, { char: "🦊", hex: "1f98a" },
      { char: "🐻", hex: "1f43b" }, { char: "🐨", hex: "1f428" }, { char: "🐸", hex: "1f438" },
      { char: "🐵", hex: "1f435" }, { char: "🦄", hex: "1f984" }, { char: "🐉", hex: "1f409" },
      { char: "🦖", hex: "1f996" }, { char: "🦋", hex: "1f98b" }, { char: "🐙", hex: "1f419" },
      { char: "🐝", hex: "1f41d" }, { char: "🌵", hex: "1f335" }, { char: "🌸", hex: "1f338" }
    ]
  },
  { 
    id: "food", 
    icon: Pizza, 
    items: [
      { char: "🍎", hex: "1f34e" }, { char: "🍌", hex: "1f34c" }, { char: "🍉", hex: "1f349" }, 
      { char: "🍓", hex: "1f353" }, { char: "🥑", hex: "1f951" }, { char: "🍕", hex: "1f355" },
      { char: "🍔", hex: "1f354" }, { char: "🍟", hex: "1f35f" }, { char: "🌮", hex: "1f32e" },
      { char: "🍣", hex: "1f363" }, { char: "🍜", hex: "1f35c" }, { char: "🍦", hex: "1f366" },
      { char: "🍰", hex: "1f370" }, { char: "🍩", hex: "1f369" }, { char: "🍿", hex: "1f37f" },
      { char: "🍺", hex: "1f37a" }, { char: "🍷", hex: "1f377" }, { char: "☕", hex: "2615" }
    ]
  },
  { 
    id: "travel", 
    icon: Plane, 
    items: [
      { char: "🚗", hex: "1f697" }, { char: "🚕", hex: "1f695" }, { char: "🏎️", hex: "1f3ce" }, 
      { char: "🏍️", hex: "1f3cd" }, { char: "🚲", hex: "1f6b2" }, { char: "✈️", hex: "2708" },
      { char: "🚀", hex: "1f680" }, { char: "🛸", hex: "1f6f8" }, { char: "🚢", hex: "1f6a2" },
      { char: "⚓", hex: "2693" }, { char: "🏝️", hex: "1f3dd" }, { char: "🌋", hex: "1f30b" },
      { char: "🏠", hex: "1f3e0" }, { char: "🗼", hex: "1f5fc" }, { char: "🎡", hex: "1f3a1" },
      { char: "⛺", hex: "26fa" }, { char: "🗺️", hex: "1f5fa" }, { char: "🌍", hex: "1f30d" }
    ]
  },
  { 
    id: "objects", 
    icon: Lightbulb, 
    items: [
      { char: "💡", hex: "1f4a1" }, { char: "💻", hex: "1f4bb" }, { char: "📱", hex: "1f4f1" }, 
      { char: "📷", hex: "1f4f7" }, { char: "🎮", hex: "1f3ae" }, { char: "🎧", hex: "1f3a7" },
      { char: "⌚", hex: "231a" }, { char: "💰", hex: "1f4b0" }, { char: "💎", hex: "1f48e" },
      { char: "🛡️", hex: "1f6e1" }, { char: "🔮", hex: "1f52e" }, { char: "🎁", hex: "1f381" },
      { char: "🎈", hex: "1f388" }, { char: "🎨", hex: "1f3a8" }, { char: "🎸", hex: "1f3b8" },
      { char: "🔋", hex: "1f50b" }, { char: "🔑", hex: "1f511" }, { char: "📦", hex: "1f4e6" }
    ]
  },
  { 
    id: "symbols", 
    icon: Heart, 
    items: [
      { char: "❤️", hex: "2764" }, { char: "🔥", hex: "1f525" }, { char: "✨", hex: "2728" }, 
      { char: "⭐", hex: "2b50" }, { char: "⚡", hex: "26a1" }, { char: "💧", hex: "1f4a7" },
      { char: "🌈", hex: "1f308" }, { char: "☀️", hex: "2600" }, { char: "🌙", hex: "1f319" },
      { char: "☁️", hex: "2601" }, { char: "❄️", hex: "2744" }, { char: "🧿", hex: "1f9ff" },
      { char: "✅", hex: "2705" }, { char: "❌", hex: "274c" }, { char: "🛑", hex: "1f6d1" },
      { char: "💯", hex: "1f4af" }, { char: "🔔", hex: "1f514" }, { char: "💤", hex: "1f4a4" }
    ]
  }
];

export function CustomKeyboard() {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [layout, setLayout] = useState<KeyboardLayout>("alpha");
  const [isShift, setIsShift] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [currentText, setCurrentText] = useState("");
  
  const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backspaceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        if (window.innerWidth < 768) {
          target.setAttribute("inputmode", "none");
          setActiveInput(target);
          setCurrentText(target.value);
          setIsVisible(true);
          setLayout(target.type === "tel" || target.type === "number" || target.getAttribute("data-layout") === "numeric" ? "numeric" : "alpha");
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

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target === activeInput) {
        setCurrentText(target.value);
      }
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);
    document.addEventListener("input", handleInput);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
      document.removeEventListener("input", handleInput);
    };
  }, [activeInput]);

  const handleKeyPress = useCallback((key: string) => {
    if (!activeInput) return;
    if (key !== "backspace_continuous") haptic.light();

    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const value = activeInput.value;
    let newValue = value;
    let newSelectionStart = start;

    if (key === "backspace" || key === "backspace_continuous") {
      if (start === end && start > 0) {
        newValue = value.substring(0, start - 1) + value.substring(end);
        newSelectionStart = start - 1;
      } else {
        newValue = value.substring(0, start) + value.substring(end);
        newSelectionStart = start;
      }
    } else if (key === "enter") {
      activeInput.blur(); setIsVisible(false); return;
    } else if (key === "shift") {
      setIsShift(!isShift); return;
    } else if (key === "layout-switch" || key === "?123") {
      setLayout(layout === "alpha" ? "numeric" : "alpha"); return;
    } else if (key === "emoji-switch") {
      setLayout("emoji"); return;
    } else if (key === "abc-switch" || key === "abc") {
      setLayout("alpha"); return;
    } else if (key === "space") {
      newValue = value.substring(0, start) + " " + value.substring(end);
      newSelectionStart = start + 1;
    } else {
      const char = (isShift && layout === "alpha") ? key.toUpperCase() : key;
      newValue = value.substring(0, start) + char + value.substring(end);
      newSelectionStart = start + char.length;
    }

    const prototype = activeInput instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (nativeSetter) nativeSetter.call(activeInput, newValue);
    else activeInput.value = newValue;

    activeInput.setSelectionRange(newSelectionStart, newSelectionStart);
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    setCurrentText(newValue);
  }, [activeInput, isShift, layout]);

  const stopBackspace = useCallback(() => {
    if (backspaceTimeoutRef.current) clearTimeout(backspaceTimeoutRef.current);
    if (backspaceIntervalRef.current) clearInterval(backspaceIntervalRef.current);
    backspaceTimeoutRef.current = null; backspaceIntervalRef.current = null;
  }, []);

  const startBackspace = useCallback(() => {
    stopBackspace(); handleKeyPress("backspace");
    backspaceTimeoutRef.current = setTimeout(() => {
      backspaceIntervalRef.current = setInterval(() => {
        handleKeyPress("backspace_continuous"); haptic.light();
      }, 75);
    }, 500);
  }, [handleKeyPress, stopBackspace]);

  const ALPHA_KEYS = [
    ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
    ["shift", "W", "X", "C", "V", "B", "N", "'", "backspace"],
    ["?123", "emoji-switch", "space", "enter"]
  ];

  const NUMERIC_KEYS = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["@", "#", "&", "_", "-", "(", ")", "/", ":", ";"],
    ["shift", "+", "*", "\"", "'", "!", "?", "=", "backspace"],
    ["abc", "emoji-switch", "space", "enter"]
  ];

  const getEmojiUrl = (hex: string) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/512.gif`;

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
          {/* Barre de Résonance (Aperçu animé) */}
          <div className="flex flex-col items-center mb-2">
            <AnimatePresence mode="wait">
              {currentText && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-6 py-3 bg-card/60 backdrop-blur-3xl rounded-2xl border border-primary/10 shadow-2xl mb-2 max-w-[85vw] overflow-hidden whitespace-nowrap pointer-events-auto"
                >
                  <p className="text-sm font-bold text-center">
                    <EmojiOracle text={currentText} />
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button 
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => { haptic.medium(); activeInput?.blur(); setIsVisible(false); }}
              className="h-8 w-16 bg-card/40 backdrop-blur-3xl rounded-full border border-primary/5 flex items-center justify-center shadow-lg pointer-events-auto"
            >
              <ChevronDown className="h-4 w-4 opacity-40" />
            </button>
          </div>

          <div className="max-w-md mx-auto bg-card/60 backdrop-blur-[45px] border-t border-x border-primary/5 rounded-t-[2.5rem] p-3 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.4)] pointer-events-auto overflow-hidden">
            <AnimatePresence mode="wait">
              {layout === "emoji" ? (
                <motion.div 
                  key="emoji-layout"
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col h-[280px]"
                >
                  <div className="flex justify-between items-center gap-1 mb-4 px-1 overflow-x-auto no-scrollbar py-1">
                    {EMOJI_CATEGORIES.map((cat, idx) => {
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => { haptic.light(); setEmojiCategory(idx); }}
                          className={cn(
                            "flex items-center justify-center min-w-[44px] h-11 rounded-xl transition-all",
                            emojiCategory === idx ? "bg-primary text-primary-foreground shadow-lg scale-110" : "bg-primary/5 text-primary/40 hover:bg-primary/10"
                          )}
                        >
                          <CatIcon className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-6 gap-3 p-1">
                    {EMOJI_CATEGORIES[emojiCategory].items.map((emoji, idx) => (
                      <motion.button
                        key={idx}
                        whileTap={{ scale: 0.85 }}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => handleKeyPress(emoji.char)}
                        className="flex items-center justify-center aspect-square rounded-[1.5rem] bg-primary/5 hover:bg-primary/10 transition-all p-2 group"
                      >
                        <picture className="w-full h-full">
                          <source srcSet={getEmojiUrl(emoji.hex)} type="image/gif" />
                          <img 
                            src={getEmojiUrl(emoji.hex)} 
                            alt={emoji.char} 
                            className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform"
                            loading="lazy"
                          />
                        </picture>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4 h-12">
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => setLayout("alpha")}
                      className="flex-[2] bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest rounded-xl shadow-inner"
                    >
                      abc
                    </button>
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => handleKeyPress("space")}
                      className="flex-[4] bg-card/40 border border-primary/5 rounded-xl flex items-center justify-center shadow-sm"
                    >
                      <div className="w-16 h-1.5 bg-primary/20 rounded-full" />
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); startBackspace(); }}
                      onPointerUp={stopBackspace}
                      onPointerLeave={stopBackspace}
                      className="flex-[2] bg-primary/5 text-primary/60 rounded-xl flex items-center justify-center"
                    >
                      <Delete className="h-5 w-5" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key={layout}
                  initial={{ opacity: 0, x: layout === "alpha" ? -20 : 20, filter: "blur(5px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: layout === "alpha" ? 20 : -20, filter: "blur(5px)" }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-2"
                >
                  {(layout === "alpha" ? ALPHA_KEYS : NUMERIC_KEYS).map((row, i) => (
                    <div key={i} className="flex justify-center gap-1.5 h-12">
                      {row.map((key) => {
                        const isSpecial = ["shift", "backspace", "enter", "?123", "abc", "space", "emoji-switch"].includes(key);
                        return (
                          <motion.button
                            key={key}
                            tabIndex={-1}
                            whileTap={{ scale: 0.92, backgroundColor: "rgba(var(--primary-rgb), 0.1)" }}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              if (key === "backspace") startBackspace();
                              else handleKeyPress(key);
                            }}
                            onPointerUp={() => { if (key === "backspace") stopBackspace(); }}
                            onPointerLeave={() => { if (key === "backspace") stopBackspace(); }}
                            className={cn(
                              "relative flex items-center justify-center rounded-xl font-bold transition-all select-none",
                              isSpecial ? "bg-primary/5 text-primary/60 text-[10px] uppercase tracking-widest px-3" : "bg-card/40 border border-primary/5 text-lg flex-1 shadow-sm",
                              key === "space" && "flex-[4]",
                              key === "enter" && "flex-[2] bg-primary text-primary-foreground shadow-xl",
                              key === "shift" && isShift && "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]",
                              !isSpecial && "active:shadow-inner"
                            )}
                          >
                            {key === "shift" ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <motion.div animate={{ y: isShift ? -1 : 0, scale: isShift ? 1.15 : 1 }}>
                                  <ArrowUp className={cn("h-5 w-5", isShift ? "stroke-[3px]" : "stroke-2")} />
                                </motion.div>
                                <AnimatePresence>
                                  {isShift && <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 12, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="h-0.5 bg-current rounded-full" />}
                                </AnimatePresence>
                              </div>
                            ) : key === "backspace" ? (
                              <Delete className="h-5 w-5" />
                            ) : key === "enter" ? (
                              <Check className="h-5 w-5" />
                            ) : key === "emoji-switch" ? (
                              <div className="relative">
                                <Smile className="h-5 w-5" />
                                <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-1 -right-1"><Sparkles className="h-2 w-2 text-primary" /></motion.div>
                              </div>
                            ) : key === "space" ? (
                              <div className="w-16 h-1 bg-current opacity-20 rounded-full" />
                            ) : (
                              layout === "alpha" && isShift ? key.toUpperCase() : key
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
