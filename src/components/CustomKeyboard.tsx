
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  Delete, ArrowUp, Check, Smile, Dog, Pizza, 
  Plane, Heart, Gamepad2, LayoutGrid, Flag, Sparkles, Wand2,
  Search, X, GripHorizontal, ChevronDown
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

// Stase de Hauteur Unifiée
const BASE_HEIGHT = 280;

function KeyboardEmoji({ emoji, hex, onClick }: { emoji: string, hex: string, onClick: (char: string) => void }) {
  const [stage, setStage] = useState<'animated' | 'static' | 'text'>('animated');

  const getUrl = () => {
    const ext = stage === 'animated' ? 'gif' : 'webp';
    return `https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/512.${ext}`;
  };

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => { haptic.light(); onClick(emoji); }}
      className="flex items-center justify-center aspect-square w-full bg-primary/[0.03] border border-primary/5 hover:bg-primary/10 transition-all p-1.5 group overflow-hidden relative rounded-2xl shadow-sm"
    >
      {stage === 'text' ? (
        <span className="text-2xl">{emoji}</span>
      ) : (
        <img 
          src={getUrl()} 
          alt={emoji} 
          className="w-[90%] h-[90%] object-contain transition-transform group-hover:scale-110 relative z-10" 
          loading="lazy"
          onError={() => {
            if (stage === 'animated') setStage('static');
            else if (stage === 'static') setStage('text');
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
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

  const allEmojis = useMemo(() => categories.flatMap(cat => cat.items), [categories]);

  const filteredEmojis = useMemo(() => {
    const q = emojiSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return allEmojis.filter(emoji => 
      emoji.keywords.some(kw => kw.includes(q)) || emoji.char.includes(q)
    ).slice(0, 40);
  }, [emojiSearchQuery, allEmojis]);

  const updateSuggestions = useCallback((input: HTMLInputElement | HTMLTextAreaElement) => {
    const value = input.value;
    const selectionEnd = input.selectionStart || 0;
    const words = value.substring(0, selectionEnd).split(/\s/);
    const currentWord = words[words.length - 1];
    if (currentWord.length < 1) {
      setSuggestions([]);
      return;
    }
    setSuggestions(getSmartSuggestions(currentWord, 3));
  }, []);

  const insertText = useCallback((text: string) => {
    if (!activeInput) return;
    activeInput.focus();
    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const value = activeInput.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    const newCursorPos = start + text.length;

    const prototype = activeInput instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (nativeSetter) nativeSetter.call(activeInput, newValue);
    else activeInput.value = newValue;

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
    const words = value.substring(0, start).split(/\s/);
    words.pop();
    const textToInsert = (words.length > 0 ? words.join(" ") + " " : "") + suggestion + " ";
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

  useEffect(() => {
    if (isResizing) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isResizing]);

  const handleKeyPress = useCallback((key: string) => {
    if (isEmojiSearchActive) {
      haptic.light();
      if (key === "backspace" || key === "backspace_continuous") setEmojiSearchQuery(prev => prev.slice(0, -1));
      else if (key === "enter") setIsEmojiSearchActive(false);
      else if (key === "space") setEmojiSearchQuery(prev => prev + " ");
      else if (!["shift", "?123", "abc", "emoji-switch"].includes(key)) {
        const char = isShift ? key.toUpperCase() : key.toLowerCase();
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
          const segmenter = new (Intl as any).Segmenter('fr', { granularity: 'grapheme' });
          const segments = Array.from(segmenter.segment(value.substring(0, start)));
          const lastSegment = (segments[segments.length - 1] as any);
          const len = lastSegment ? lastSegment.segment.length : 1;
          newValue = value.substring(0, start - len) + value.substring(end);
          newSelectionStart = start - len;
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
    } else if (key === "shift") setIsShift(!isShift);
    else if (key === "?123") setLayout("numeric");
    else if (key === "abc") setLayout("alpha");
    else if (key === "emoji-switch") {
      setLayout("emoji");
      setKeyboardHeight(BASE_HEIGHT);
    }
    else if (key === "space") insertText(" ");
    else {
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
      backspaceIntervalRef.current = setInterval(() => handleKeyPress("backspace_continuous"), 75);
    }, 500);
  }, [handleKeyPress, stopBackspace]);

  const handleResizeStart = (e: React.PointerEvent) => {
    if (isEmojiSearchActive) return;
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = keyboardHeight;
    haptic.medium();
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isResizing) return;
      const deltaY = e.clientY - resizeStartY.current;
      const maxAllowedHeight = window.innerHeight - 100;
      const newHeight = Math.max(BASE_HEIGHT, Math.min(maxAllowedHeight, resizeStartHeight.current - deltaY));
      setKeyboardHeight(newHeight);
    };
    
    const handleUp = () => { if (isResizing) { setIsResizing(false); haptic.light(); } };
    if (isResizing) { window.addEventListener("pointermove", handleMove); window.addEventListener("pointerup", handleUp); } 
    return () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
  }, [isResizing, keyboardHeight]);

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

  const currentHeight = (layout === "emoji" && !isEmojiSearchActive) ? keyboardHeight : BASE_HEIGHT;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 35, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[10002] px-2 pb-safe-area-inset-bottom pointer-events-none flex flex-col items-center"
        >
          <AnimatePresence>
            {isEmojiSearchActive && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
                className="w-full max-w-md bg-card/80 backdrop-blur-3xl rounded-3xl border border-primary/10 shadow-2xl p-2.5 mb-2 flex gap-3 overflow-x-auto no-scrollbar pointer-events-auto h-20 items-center"
              >
                {filteredEmojis.length > 0 ? (
                  filteredEmojis.map((emoji, i) => (
                    <div key={i} className="h-14 w-14 shrink-0">
                      <KeyboardEmoji emoji={emoji.char} hex={emoji.hex} onClick={(char) => insertText(char)} />
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-2 opacity-30 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {emojiSearchQuery ? "Essence introuvable" : "Cherchez l'Inconnu"}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!isEmojiSearchActive && layout === "emoji" && (
            <motion.div 
              onPointerDown={handleResizeStart}
              onClick={() => { if (!isResizing) { haptic.light(); activeInput?.blur(); setIsVisible(false); } }}
              className="h-8 w-24 bg-card/40 backdrop-blur-[45px] rounded-full border border-primary/10 flex items-center justify-center shadow-lg pointer-events-auto cursor-ns-resize group active:scale-95 transition-transform mb-1"
            >
              <motion.div 
                animate={isResizing ? { width: 40, backgroundColor: "hsl(var(--primary))" } : { width: 32, backgroundColor: "hsl(var(--primary) / 0.2)" }}
                className="h-1 rounded-full transition-all duration-300" 
              />
            </motion.div>
          )}

          <div 
            style={{ 
              height: `${currentHeight}px`,
              transition: isResizing ? 'none' : 'height 0.5s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s'
            }}
            className="w-full max-w-md bg-card/60 backdrop-blur-[55px] border-t border-x border-primary/5 rounded-t-[3rem] p-4 shadow-[0_-20px_100px_-20px_rgba(0,0,0,0.5)] pointer-events-auto overflow-hidden flex flex-col"
          >
            {/* Lumière Prédictive (Suggestions) - Hauteur réduite à h-10 */}
            {layout !== "emoji" && !isEmojiSearchActive && (
              <div className="h-10 mb-2 flex items-center justify-center gap-3 overflow-hidden px-4 shrink-0 border-b border-primary/5">
                <AnimatePresence mode="popLayout">
                  {suggestions.length > 0 ? suggestions.map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 15, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.8 }}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(suggestion)}
                      className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-black uppercase tracking-widest text-primary shadow-sm hover:bg-primary/10 transition-all flex items-center gap-2"
                    >
                      <Wand2 className="h-3 w-3 opacity-40" />
                      {suggestion}
                    </motion.button>
                  )) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.5em]">Précognition Divine</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex-1 flex flex-col justify-end overflow-hidden">
              <AnimatePresence mode="wait">
                {layout === "emoji" ? (
                  <motion.div 
                    key={isEmojiSearchActive ? "search-mode" : "explore-mode"}
                    initial={{ opacity: 0, x: 30, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                    className="flex flex-col h-full overflow-hidden"
                  >
                    {isEmojiSearchActive ? (
                      <div className="flex flex-col h-full gap-4">
                        <div className="h-14 flex items-center gap-4 px-6 bg-primary/5 rounded-[2rem] border border-primary/10 shrink-0">
                          <Search className="h-5 w-5 text-primary opacity-40" />
                          <div className="flex-1 text-base font-black italic truncate text-primary">
                            {emojiSearchQuery || "Quelle essence cherchez-vous ?"}
                            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="border-l-2 border-primary ml-1" />
                          </div>
                          <button onClick={() => { haptic.light(); setIsEmojiSearchActive(false); }} className="p-2 opacity-40 hover:opacity-100 transition-opacity"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="flex-1 flex flex-col justify-end gap-2 pb-2">
                          {ALPHA_KEYS.map((row, i) => (
                            <div key={i} className="flex justify-center gap-1.5 h-[20%]">
                              {row.map((key) => {
                                const isSpecial = ["shift", "backspace", "enter", "?123", "abc", "space", "emoji-switch"].includes(key);
                                return (
                                  <motion.button
                                    key={key}
                                    whileTap={{ scale: 0.9 }}
                                    onPointerDown={(e) => { e.preventDefault(); if (key === "backspace") startBackspace(); else handleKeyPress(key); }}
                                    onPointerUp={() => { if (key === "backspace") stopBackspace(); }}
                                    className={cn(
                                      "relative flex items-center justify-center rounded-2xl font-bold transition-all select-none shadow-sm",
                                      isSpecial ? "bg-primary/10 text-primary/60 text-[10px] uppercase tracking-widest px-3" : "bg-card/40 border border-primary/5 text-lg flex-1",
                                      key === "space" && "flex-[4]",
                                      key === "enter" && "flex-[2] bg-primary text-primary-foreground shadow-xl",
                                      key === "shift" && isShift && "bg-primary text-primary-foreground shadow-lg"
                                    )}
                                  >
                                    {key === "shift" ? <ArrowUp className="h-5 w-5" /> : key === "backspace" ? <Delete className="h-5 w-5" /> : key === "enter" ? <Check className="h-5 w-5" /> : key === "emoji-switch" ? <Smile className="h-5 w-5" /> : key === "space" ? "ESPACE" : (isShift ? key.toUpperCase() : key.toLowerCase())}
                                  </motion.button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="grid grid-cols-8 gap-1.5 p-1.5 mb-4 bg-primary/5 rounded-[2rem] border border-primary/5 shrink-0 relative">
                          <LayoutGroup id="emoji-nav">
                            {categories.map((cat, idx) => (
                              <button
                                key={cat.id}
                                onPointerDown={(e) => e.preventDefault()}
                                onClick={() => { haptic.light(); setEmojiCategory(idx); }}
                                className={cn(
                                  "relative flex items-center justify-center h-10 rounded-2xl transition-colors z-10",
                                  emojiCategory === idx ? "text-primary-foreground" : "text-primary/30"
                                )}
                              >
                                <cat.icon className="h-4 w-4 relative z-20" />
                                {emojiCategory === idx && (
                                  <motion.div
                                    layoutId="active-nav-pill"
                                    className="absolute inset-0 bg-primary rounded-2xl shadow-lg z-10"
                                    transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                                  />
                                )}
                              </button>
                            ))}
                          </LayoutGroup>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-6 gap-3 p-2 bg-primary/[0.02] rounded-3xl border border-primary/5 shadow-inner">
                          {categories[emojiCategory].items.map((emoji, idx) => (
                            <KeyboardEmoji key={idx} emoji={emoji.char} hex={emoji.hex} onClick={(char) => insertText(char)} />
                          ))}
                        </div>

                        <div className="flex gap-3 mt-4 h-16 shrink-0 border-t border-primary/5 pt-3">
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onPointerDown={(e) => e.preventDefault()} 
                            onClick={() => { haptic.medium(); setLayout("alpha"); setKeyboardHeight(BASE_HEIGHT); }} 
                            className="flex-[2] bg-primary/10 text-primary font-black text-xs uppercase tracking-widest rounded-2xl border border-primary/5 shadow-sm active:bg-primary/20"
                          >
                            ABC
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onPointerDown={(e) => e.preventDefault()} 
                            onClick={() => { haptic.medium(); setKeyboardHeight(BASE_HEIGHT); setIsEmojiSearchActive(true); setEmojiSearchQuery(""); }} 
                            className="flex-[4] bg-primary/5 border border-primary/10 text-primary/40 rounded-2xl flex items-center justify-center shadow-inner group overflow-hidden relative"
                          >
                            <Search className="h-6 w-6 group-hover:scale-110 transition-transform relative z-10" />
                            <motion.div animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-primary/10" />
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onPointerDown={(e) => { e.preventDefault(); startBackspace(); }} 
                            onPointerUp={stopBackspace} 
                            onPointerLeave={stopBackspace} 
                            className="flex-[2] bg-primary/5 text-primary/60 rounded-2xl flex items-center justify-center border border-primary/5 shadow-sm active:bg-destructive/5 active:text-destructive"
                          >
                            <Delete className="h-6 w-6" />
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key={layout}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(15px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(15px)" }}
                    transition={{ type: "spring", damping: 30, stiffness: 200 }}
                    className="flex flex-col gap-2 h-full justify-end pb-2"
                  >
                    {(layout === "alpha" ? ALPHA_KEYS : NUMERIC_KEYS).map((row, i) => (
                      <div key={i} className="flex justify-center gap-1.5 h-[18%]">
                        {row.map((key) => {
                          const isSpecial = ["shift", "backspace", "enter", "?123", "abc", "space", "emoji-switch"].includes(key);
                          return (
                            <motion.button
                              key={key}
                              whileTap={{ scale: 0.92 }}
                              onPointerDown={(e) => { e.preventDefault(); if (key === "backspace") startBackspace(); else handleKeyPress(key); }}
                              onPointerUp={() => { if (key === "backspace") stopBackspace(); }}
                              className={cn(
                                "relative flex items-center justify-center rounded-2xl font-black transition-all select-none shadow-sm border",
                                isSpecial ? "bg-primary/5 border-primary/5 text-primary/60 text-[10px] uppercase tracking-widest px-3" : "bg-card/40 border border-primary/5 text-xl flex-1",
                                key === "space" && "flex-[4] bg-primary/5",
                                key === "enter" && "flex-[2] bg-primary text-primary-foreground shadow-xl border-none",
                                key === "shift" && isShift && "bg-primary text-primary-foreground shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)] border-none"
                              )}
                            >
                              {key === "shift" ? (
                                <motion.div animate={{ y: isShift ? -2 : 0, scale: isShift ? 1.15 : 1 }}>
                                  <ArrowUp className={cn("h-5 w-5", isShift ? "stroke-[3px]" : "stroke-2")} />
                                </motion.div>
                              ) : key === "backspace" ? <Delete className="h-5 w-5" /> : key === "enter" ? <Check className="h-5 w-5" /> : key === "emoji-switch" ? (
                                <Smile className="h-5 w-5" />
                              ) : key === "space" ? <div className="w-16 h-1.5 bg-primary/20 rounded-full" /> : (layout === "alpha" && isShift ? key.toUpperCase() : key)}
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
