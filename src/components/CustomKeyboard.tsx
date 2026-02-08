
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Delete, ArrowUp, Check, ChevronDown, Smile, Dog, Pizza, 
  Plane, Heart, Gamepad2, LayoutGrid, Flag, Sparkles, Wand2
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { 
  parseEmojiString, 
  RAW_EMOJI_PEOPLE, 
  RAW_NATURE, 
  RAW_FOOD, 
  RAW_ACTIVITIES, 
  RAW_PLACES,
  RAW_OBJECTS, 
  RAW_SYMBOLS,
  RAW_FLAGS
} from "@/lib/emoji-library";
import { getSmartSuggestions } from "@/lib/spell-checker";

type KeyboardLayout = "alpha" | "numeric" | "emoji";

function KeyboardEmoji({ emoji, hex, onClick }: { emoji: string, hex: string, onClick: (char: string) => void }) {
  const [stage, setStage] = useState<'animated' | 'static' | 'text'>('animated');

  const getUrl = () => {
    const ext = stage === 'animated' ? 'gif' : 'webp';
    return `https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/512.${ext}`;
  };

  return (
    <button
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => { haptic.light(); onClick(emoji); }}
      className="flex items-center justify-center aspect-square w-full bg-primary/[0.02] border-t border-b border-primary/10 hover:bg-primary/5 transition-all p-1 group overflow-hidden relative active:scale-90"
    >
      {stage === 'text' ? (
        <span className="text-xl">{emoji}</span>
      ) : (
        <img 
          src={getUrl()} 
          alt={emoji} 
          className="w-[85%] h-[85%] object-contain transition-transform group-hover:scale-110 relative z-10" 
          loading="lazy"
          onError={() => {
            if (stage === 'animated') setStage('static');
            else if (stage === 'static') setStage('text');
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function CustomKeyboard() {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [layout, setLayout] = useState<KeyboardLayout>("alpha");
  const [isShift, setIsShift] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backspaceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categories = useMemo(() => [
    { id: "people", icon: Smile, items: parseEmojiString(RAW_EMOJI_PEOPLE) },
    { id: "nature", icon: Dog, items: parseEmojiString(RAW_NATURE) },
    { id: "food", icon: Pizza, items: parseEmojiString(RAW_FOOD) },
    { id: "activities", icon: Gamepad2, items: parseEmojiString(RAW_ACTIVITIES) },
    { id: "places", icon: Plane, items: parseEmojiString(RAW_PLACES) },
    { id: "objects", icon: LayoutGrid, items: parseEmojiString(RAW_OBJECTS) },
    { id: "symbols", icon: Heart, items: parseEmojiString(RAW_SYMBOLS) },
    { id: "flags", icon: Flag, items: parseEmojiString(RAW_FLAGS) }
  ], []);

  const updateSuggestions = useCallback((input: HTMLInputElement | HTMLTextAreaElement) => {
    const value = input.value;
    const selectionEnd = input.selectionStart || 0;
    const textBefore = value.substring(0, selectionEnd);
    const words = textBefore.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.length < 1) {
      setSuggestions([]);
      return;
    }

    const smartMatches = getSmartSuggestions(currentWord, 3);
    setSuggestions(smartMatches);
  }, []);

  const applySuggestion = (suggestion: string) => {
    if (!activeInput) return;
    haptic.medium();

    const value = activeInput.value;
    const start = activeInput.selectionStart || 0;
    const textBefore = value.substring(0, start);
    const words = textBefore.split(/\s/);
    words.pop();
    
    const prefix = words.join(" ");
    const newValue = (prefix ? prefix + " " : "") + suggestion + " " + value.substring(start);
    const newCursorPos = (prefix ? prefix.length + 1 : 0) + suggestion.length + 1;

    const prototype = activeInput instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (nativeSetter) nativeSetter.call(activeInput, newValue);
    else activeInput.value = newValue;

    activeInput.setSelectionRange(newCursorPos, newCursorPos);
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    
    setSuggestions([]);
    activeInput.focus();
  };

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        target.setAttribute("inputmode", "none");
        target.setAttribute("virtualKeyboardPolicy", "manual");
        setActiveInput(target);
        setIsVisible(true);
        if (target.type === "tel" || target.type === "number" || target.getAttribute("data-layout") === "numeric") {
          setLayout("numeric");
        } else {
          setLayout("alpha");
        }
        updateSuggestions(target);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")) {
          setIsVisible(false);
        }
      }, 100);
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [updateSuggestions]);

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
    } else if (key === "?123") {
      setLayout("numeric"); return;
    } else if (key === "abc") {
      setLayout("alpha"); return;
    } else if (key === "emoji-switch") {
      setLayout("emoji"); return;
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
    updateSuggestions(activeInput);
  }, [activeInput, isShift, layout, updateSuggestions]);

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
    ["shift", "W", "X", "C", "V", "B", "N", "backspace"],
    ["?123", "emoji-switch", "space", "enter"]
  ];

  const NUMERIC_KEYS = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["@", "#", "&", "_", "-", "(", ")", "/", ":", ";"],
    ["shift", "+", "*", "\"", "!", "?", "=", "backspace"],
    ["abc", "emoji-switch", "space", "enter"]
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 250 }}
          className="fixed bottom-0 left-0 right-0 z-[10002] px-2 pb-safe-area-inset-bottom pointer-events-none"
        >
          <div className="flex flex-col items-center mb-1">
            <button 
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => { haptic.medium(); activeInput?.blur(); setIsVisible(false); }}
              className="h-6 w-12 bg-card/40 backdrop-blur-3xl rounded-full border border-primary/5 flex items-center justify-center shadow-lg pointer-events-auto"
            >
              <ChevronDown className="h-3 w-3 opacity-40" />
            </button>
          </div>

          <div className="max-w-md mx-auto h-[320px] bg-card/60 backdrop-blur-[45px] border-t border-x border-primary/5 rounded-t-[2.5rem] p-3 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.4)] pointer-events-auto overflow-hidden flex flex-col transition-all duration-500">
            
            {/* Barre de Suggestions - Masquée pour les Emojis */}
            {layout !== "emoji" && (
              <div className="h-10 mb-1 flex items-center justify-center gap-2 overflow-hidden px-2 shrink-0 border-b border-primary/5">
                <AnimatePresence mode="popLayout">
                  {suggestions.map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(suggestion)}
                      className="px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-wider text-primary shadow-sm hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                    >
                      <Wand2 className="h-2.5 w-2.5 opacity-40" />
                      {suggestion}
                    </motion.button>
                  ))}
                  {suggestions.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} className="flex items-center gap-2">
                      <Sparkles className="h-2.5 w-2.5" />
                      <span className="text-[7px] font-black uppercase tracking-[0.3em]">Précognition</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex-1 flex flex-col justify-end overflow-hidden">
              <AnimatePresence mode="wait">
                {layout === "emoji" ? (
                  <motion.div 
                    key="emoji-layout"
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    className="flex flex-col h-full overflow-hidden"
                  >
                    {/* Barre de Catégories Octogonale */}
                    <div className="relative mb-2 h-10 shrink-0">
                      <div className="grid grid-cols-8 gap-1 h-full p-1 relative z-10">
                        {categories.map((cat, idx) => (
                          <motion.button
                            key={cat.id}
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => { haptic.light(); setEmojiCategory(idx); }}
                            whileTap={{ scale: 0.9 }}
                            className={cn(
                              "relative flex items-center justify-center rounded-xl transition-colors duration-500",
                              emojiCategory === idx ? "text-primary-foreground" : "text-primary/30"
                            )}
                          >
                            <cat.icon className="h-3.5 w-3.5 relative z-20" />
                            {emojiCategory === idx && (
                              <motion.div
                                layoutId="active-cat-pill"
                                className="absolute inset-0 bg-primary rounded-xl shadow-lg z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                      <div className="absolute inset-0 bg-primary/5 rounded-2xl border border-primary/5 -z-0" />
                    </div>
                    
                    {/* Grille Scrollable - Middle */}
                    <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-8 gap-0 p-1 border-t border-primary/5">
                      {categories[emojiCategory].items.map((emoji, idx) => (
                        <div key={`${emojiCategory}-${idx}`} className="w-full">
                          <KeyboardEmoji 
                            emoji={emoji.char} 
                            hex={emoji.hex} 
                            onClick={(char) => handleKeyPress(char)} 
                          />
                        </div>
                      ))}
                    </div>

                    {/* Contrôles Fixes - Bottom */}
                    <div className="flex gap-2 mt-2 h-12 shrink-0 border-t border-primary/5 pt-2">
                      <button 
                        onPointerDown={(e) => e.preventDefault()} 
                        onClick={() => { haptic.medium(); setLayout("alpha"); }} 
                        className="flex-[2] bg-primary/10 text-primary font-black text-[9px] uppercase rounded-2xl border border-primary/5"
                      >
                        abc
                      </button>
                      <button 
                        onPointerDown={(e) => e.preventDefault()} 
                        onClick={() => handleKeyPress("space")} 
                        className="flex-[4] bg-card/40 border border-primary/10 rounded-2xl flex items-center justify-center shadow-inner"
                      >
                        <div className="w-12 h-1 bg-primary/20 rounded-full" />
                      </button>
                      <button 
                        onPointerDown={(e) => { e.preventDefault(); startBackspace(); }} 
                        onPointerUp={stopBackspace} 
                        onPointerLeave={stopBackspace} 
                        className="flex-[2] bg-primary/5 text-primary/60 rounded-2xl flex items-center justify-center border border-primary/5"
                      >
                        <Delete className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={layout}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-1.5 h-full justify-end pb-1"
                  >
                    {(layout === "alpha" ? ALPHA_KEYS : NUMERIC_KEYS).map((row, i) => (
                      <div key={i} className="flex justify-center gap-1 h-11">
                        {row.map((key) => {
                          const isSpecial = ["shift", "backspace", "enter", "?123", "abc", "space", "emoji-switch"].includes(key);
                          return (
                            <motion.button
                              key={key}
                              whileTap={{ scale: 0.92 }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                if (key === "backspace") startBackspace();
                                else handleKeyPress(key);
                              }}
                              onPointerUp={() => { if (key === "backspace") stopBackspace(); }}
                              onPointerLeave={() => { if (key === "backspace") stopBackspace(); }}
                              className={cn(
                                "relative flex items-center justify-center rounded-xl font-bold transition-all select-none",
                                isSpecial ? "bg-primary/5 text-primary/60 text-[9px] uppercase tracking-widest px-2" : "bg-card/40 border border-primary/5 text-base flex-1 shadow-sm",
                                key === "space" && "flex-[4]",
                                key === "enter" && "flex-[2] bg-primary text-primary-foreground shadow-xl",
                                key === "shift" && isShift && "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                              )}
                            >
                              {key === "shift" ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <motion.div animate={{ y: isShift ? -1 : 0, scale: isShift ? 1.1 : 1 }}><ArrowUp className={cn("h-4 w-4", isShift ? "stroke-[3px]" : "stroke-2")} /></motion.div>
                                  {isShift && <motion.div initial={{ width: 0 }} animate={{ width: 10 }} className="h-0.5 bg-current rounded-full" />}
                                </div>
                              ) : key === "backspace" ? <Delete className="h-4 w-4" /> : key === "enter" ? <Check className="h-4 w-4" /> : key === "emoji-switch" ? (
                                <Smile className="h-4 w-4" />
                              ) : key === "space" ? <div className="w-12 h-1 bg-current opacity-20 rounded-full" /> : (layout === "alpha" && isShift ? key.toUpperCase() : key)}
                            </motion.button>
                          );
                        })}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
