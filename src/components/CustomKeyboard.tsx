
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Delete, ArrowUp, Check, ChevronDown, Smile, Dog, Pizza, 
  Plane, Heart, Gamepad2, LayoutGrid, Flag, Sparkles, Wand2,
  Search, X
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
  RAW_FLAGS,
  type EmojiIdentity
} from "@/lib/emoji-library";
import { getSmartSuggestions } from "@/lib/spell-checker";

type KeyboardLayout = "alpha" | "numeric" | "emoji";

const BASE_HEIGHT = 320;

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
  const [keyboardHeight, setKeyboardHeight] = useState(BASE_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  
  // États de recherche d'emojis (Transmutation)
  const [isEmojiSearchActive, setIsEmojiSearchActive] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState("");
  
  const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backspaceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

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

  const allEmojis = useMemo(() => {
    return categories.flatMap(cat => cat.items);
  }, [categories]);

  const filteredEmojis = useMemo(() => {
    const query = emojiSearchQuery.toLowerCase().trim();
    if (!query) return [];
    
    // On cherche dans les mots-clés pré-définis
    return allEmojis.filter(emoji => 
      emoji.keywords.some(kw => kw.includes(query)) ||
      emoji.char === query
    ).slice(0, 40);
  }, [emojiSearchQuery, allEmojis]);

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

  const insertText = useCallback((text: string) => {
    if (!activeInput) return;
    
    activeInput.focus();
    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const value = activeInput.value;
    
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    // Calcul de la position réelle du curseur en tenant compte des paires de substitution
    const newCursorPos = start + text.length;

    const prototype = activeInput instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (nativeSetter) nativeSetter.call(activeInput, newValue);
    else activeInput.value = newValue;

    // Forcer le focus et le positionnement du curseur APRES l'emoji
    setTimeout(() => {
      activeInput.focus();
      activeInput.setSelectionRange(newCursorPos, newCursorPos);
      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      activeInput.dispatchEvent(new Event("change", { bubbles: true }));
      updateSuggestions(activeInput);
    }, 0);
  }, [activeInput, updateSuggestions]);

  const applySuggestion = (suggestion: string) => {
    if (!activeInput) return;
    haptic.medium();

    const value = activeInput.value;
    const start = activeInput.selectionStart || 0;
    const textBefore = value.substring(0, start);
    const words = textBefore.split(/\s/);
    words.pop();
    
    const prefix = words.join(" ");
    const textToInsert = (prefix ? prefix + " " : "") + suggestion + " ";
    
    const newValue = textToInsert + value.substring(start);
    const newCursorPos = textToInsert.length;

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
          setIsEmojiSearchActive(false);
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
    if (isEmojiSearchActive) {
      haptic.light();
      if (key === "backspace" || key === "backspace_continuous") {
        setEmojiSearchQuery(prev => prev.slice(0, -1));
      } else if (key === "enter") {
        setIsEmojiSearchActive(false);
      } else if (key === "space") {
        setEmojiSearchQuery(prev => prev + " ");
      } else if (!["shift", "?123", "abc", "emoji-switch"].includes(key)) {
        const char = (isShift) ? key.toUpperCase() : key.toLowerCase();
        setEmojiSearchQuery(prev => prev + char);
      }
      return;
    }

    if (!activeInput) return;
    if (key !== "backspace_continuous") haptic.light();

    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const value = activeInput.value;

    if (key === "backspace" || key === "backspace_continuous") {
      let newValue = value;
      let newSelectionStart = start;
      if (start === end && start > 0) {
        if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
          try {
            const segmenter = new (Intl as any).Segmenter('fr', { granularity: 'grapheme' });
            const segments = Array.from(segmenter.segment(value.substring(0, start)));
            const lastSegment = (segments[segments.length - 1] as any);
            const segmentLength = lastSegment ? lastSegment.segment.length : 1;
            newValue = value.substring(0, start - segmentLength) + value.substring(end);
            newSelectionStart = start - segmentLength;
          } catch (e) {
            newValue = value.substring(0, start - 1) + value.substring(end);
            newSelectionStart = start - 1;
          }
        } else {
          newValue = value.substring(0, start - 1) + value.substring(end);
          newSelectionStart = start - 1;
        }
      } else {
        newValue = value.substring(0, start) + value.substring(end);
        newSelectionStart = start;
      }
      
      const prototype = activeInput instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (nativeSetter) nativeSetter.call(activeInput, newValue);
      else activeInput.value = newValue;
      activeInput.setSelectionRange(newSelectionStart, newSelectionStart);
      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      activeInput.dispatchEvent(new Event("change", { bubbles: true }));
      updateSuggestions(activeInput);
    } else if (key === "enter") {
      activeInput.blur(); setIsVisible(false);
    } else if (key === "shift") {
      setIsShift(!isShift);
    } else if (key === "?123") {
      setLayout("numeric");
    } else if (key === "abc") {
      setLayout("alpha");
    } else if (key === "emoji-switch") {
      setLayout("emoji");
    } else {
      const char = (isShift && layout === "alpha") ? key.toUpperCase() : key;
      insertText(char);
    }
  }, [activeInput, isShift, layout, updateSuggestions, isEmojiSearchActive, insertText]);

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

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = keyboardHeight;
    haptic.medium();
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isResizing) return;
      const deltaY = e.clientY - resizeStartY.current;
      const maxAllowedHeight = window.innerHeight - 100;
      const newHeight = Math.max(BASE_HEIGHT, Math.min(maxAllowedHeight, resizeStartHeight.current - deltaY));
      setKeyboardHeight(newHeight);
    };

    const handlePointerUp = () => {
      if (isResizing) {
        setIsResizing(false);
        haptic.light();
      }
    };

    if (isResizing) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizing, keyboardHeight]);

  const startEmojiSearch = () => {
    haptic.medium();
    setKeyboardHeight(BASE_HEIGHT);
    setIsEmojiSearchActive(true);
    setEmojiSearchQuery("");
  };

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
          <div className="flex flex-col items-center mb-1 min-h-8">
            <AnimatePresence mode="wait">
              {isEmojiSearchActive ? (
                <motion.div
                  key="results-card"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="w-full max-w-md bg-card/80 backdrop-blur-3xl rounded-2xl border border-primary/10 shadow-2xl p-2 flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto h-16 items-center"
                >
                  {filteredEmojis.length > 0 ? (
                    filteredEmojis.map((emoji, i) => (
                      <button
                        key={i}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => { haptic.light(); insertText(emoji.char); }}
                        className="h-12 w-12 flex-shrink-0 flex items-center justify-center bg-primary/5 rounded-xl text-2xl active:scale-90 transition-transform"
                      >
                        <KeyboardEmoji emoji={emoji.char} hex={emoji.hex} onClick={(char) => insertText(char)} />
                      </button>
                    ))
                  ) : (
                    <div className="w-full text-center py-2 opacity-30 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      {emojiSearchQuery ? "Aucune essence trouvée" : "Cherchez une essence..."}
                    </div>
                  )}
                </motion.div>
              ) : layout === "emoji" && (
                <motion.button 
                  key="resize-handle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onPointerDown={handleResizeStart}
                  onClick={() => { if (!isResizing) { activeInput?.blur(); setIsVisible(false); haptic.medium(); } }}
                  className="h-8 w-16 bg-card/40 backdrop-blur-3xl rounded-full border border-primary/5 flex items-center justify-center shadow-lg pointer-events-auto cursor-ns-resize group active:scale-95 transition-transform"
                >
                  <div className="w-8 h-1 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div 
            style={{ height: `${layout === "emoji" && !isEmojiSearchActive ? keyboardHeight : BASE_HEIGHT}px` }}
            className="max-w-md mx-auto bg-card/60 backdrop-blur-[45px] border-t border-x border-primary/5 rounded-t-[2.5rem] p-3 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.4)] pointer-events-auto overflow-hidden flex flex-col transition-all duration-300 ease-out"
          >
            {layout !== "emoji" && !isEmojiSearchActive && (
              <div className="h-14 mb-1 flex items-center justify-center gap-3 overflow-hidden px-2 shrink-0 border-b border-primary/5">
                <AnimatePresence mode="popLayout">
                  {suggestions.map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(suggestion)}
                      className="px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-[11px] font-black uppercase tracking-wider text-primary shadow-sm hover:bg-primary/10 transition-colors flex items-center gap-2"
                    >
                      <Wand2 className="h-3 w-3 opacity-40" />
                      {suggestion}
                    </motion.button>
                  ))}
                  {suggestions.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-[8px] font-black uppercase tracking-[0.3em]">Précognition</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex-1 flex flex-col justify-end overflow-hidden">
              <AnimatePresence mode="wait">
                {layout === "emoji" ? (
                  <motion.div 
                    key={isEmojiSearchActive ? "emoji-search" : "emoji-standard"}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col h-full overflow-hidden"
                  >
                    {isEmojiSearchActive ? (
                      <div className="flex flex-col h-full gap-2">
                        <div className="h-12 flex items-center gap-3 px-4 bg-primary/5 rounded-2xl border border-primary/10 shrink-0">
                          <Search className="h-4 w-4 opacity-40" />
                          <div className="flex-1 text-sm font-black italic truncate">
                            {emojiSearchQuery || "Recherche..."}
                            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="border-l-2 border-primary ml-0.5" />
                          </div>
                          <button onClick={() => { haptic.light(); setIsEmojiSearchActive(false); }} className="p-2 opacity-40 hover:opacity-100">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex-1 flex flex-col justify-end gap-1 pb-1">
                          {ALPHA_KEYS.map((row, i) => (
                            <div key={i} className="flex justify-center gap-1 h-[22%] min-h-[38px]">
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
                                    className={cn(
                                      "relative flex items-center justify-center rounded-xl font-bold transition-all select-none",
                                      isSpecial ? "bg-primary/10 text-primary/60 text-[9px] uppercase tracking-widest px-2" : "bg-card/40 border border-primary/5 text-base flex-1 shadow-sm",
                                      key === "space" && "flex-[4]",
                                      key === "enter" && "flex-[2] bg-primary text-primary-foreground",
                                      key === "shift" && isShift && "bg-primary text-primary-foreground"
                                    )}
                                  >
                                    {key === "shift" ? <ArrowUp className="h-4 w-4" /> : key === "backspace" ? <Delete className="h-4 w-4" /> : key === "enter" ? <Check className="h-4 w-4" /> : key === "emoji-switch" ? <Smile className="h-4 w-4" /> : key === "space" ? "Space" : (isShift ? key.toUpperCase() : key.toLowerCase())}
                                  </motion.button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-8 gap-1 p-1 mb-2 bg-primary/5 rounded-2xl border border-primary/5 shrink-0">
                          {categories.map((cat, idx) => (
                            <motion.button
                              key={cat.id}
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => { haptic.light(); setEmojiCategory(idx); }}
                              whileTap={{ scale: 0.9 }}
                              className={cn(
                                "relative flex items-center justify-center h-8 rounded-xl transition-colors duration-500",
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
                        
                        <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-8 gap-0 p-1 border-t border-primary/5">
                          {categories[emojiCategory].items.map((emoji, idx) => (
                            <KeyboardEmoji key={idx} emoji={emoji.char} hex={emoji.hex} onClick={(char) => insertText(char)} />
                          ))}
                        </div>

                        <div className="flex gap-2 mt-2 h-14 shrink-0 border-t border-primary/5 pt-2">
                          <button 
                            onPointerDown={(e) => e.preventDefault()} 
                            onClick={() => { haptic.medium(); setLayout("alpha"); }} 
                            className="flex-[2] bg-primary/10 text-primary font-black text-[10px] uppercase rounded-2xl border border-primary/5"
                          >
                            abc
                          </button>
                          <button 
                            onPointerDown={(e) => e.preventDefault()} 
                            onClick={startEmojiSearch} 
                            className="flex-[4] bg-card/40 border border-primary/10 text-primary/40 rounded-2xl flex items-center justify-center shadow-inner active:scale-95 transition-transform"
                          >
                            <Search className="h-5 w-5" />
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
                      </>
                    )}
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
                      <div key={i} className="flex justify-center gap-1 h-[12%] min-h-[40px]">
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
