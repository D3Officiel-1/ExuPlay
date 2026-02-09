
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smile, Dog, Pizza, Plane, Heart, Gamepad2, LayoutGrid, Flag, 
  Search, X, Delete
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
import { EmojiOracle } from "./EmojiOracle";

const BASE_HEIGHT = 320;

/**
 * @fileOverview Voûte des Essences v4.0.
 * Désormais un sélecteur d'emojis pur, laissant le clavier natif gérer le texte.
 */
export function CustomKeyboard() {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(BASE_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState("");
  const [isEmojiSearchActive, setIsEmojiSearchActive] = useState(false);
  
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const keyboardRef = useRef<HTMLDivElement>(null);

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

  const insertText = useCallback((text: string) => {
    if (!activeInput) return;
    haptic.light();
    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const value = activeInput.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    const newCursorPos = start + Array.from(text).length;

    const prototype = activeInput instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (nativeSetter) nativeSetter.call(activeInput, newValue);
    else activeInput.value = newValue;

    activeInput.setSelectionRange(newCursorPos, newCursorPos);
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
    activeInput.dispatchEvent(new Event("change", { bubbles: true }));
  }, [activeInput]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        setActiveInput(target);
        // On n'affiche pas automatiquement pour ne pas gêner le clavier natif
      }
    };
    const handleFocusOut = () => {
      // Garder l'input actif en mémoire mais ne pas fermer violemment
    };
    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const handleResizeStart = (e: React.PointerEvent) => {
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = keyboardHeight;
    haptic.medium();
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isResizing) return;
      const deltaY = e.clientY - resizeStartY.current;
      const newHeight = Math.max(200, Math.min(window.innerHeight * 0.7, resizeStartHeight.current - deltaY));
      setKeyboardHeight(newHeight);
    };
    const handleUp = () => { if (isResizing) { setIsResizing(false); haptic.light(); } };
    if (isResizing) { window.addEventListener("pointermove", handleMove); window.addEventListener("pointerup", handleUp); } 
    return () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
  }, [isResizing]);

  return (
    <div className="fixed bottom-24 right-6 z-[10002] pointer-events-none">
      <AnimatePresence>
        {activeInput && (
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            onClick={() => { haptic.medium(); setIsVisible(!isVisible); }}
            className="pointer-events-auto h-14 w-14 rounded-2xl bg-card/80 backdrop-blur-3xl border border-primary/10 shadow-2xl flex items-center justify-center text-primary"
          >
            {isVisible ? <X className="h-6 w-6" /> : <Smile className="h-6 w-6" />}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && activeInput && (
          <motion.div
            ref={keyboardRef}
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9 }}
            className="absolute bottom-20 right-0 w-[85vw] max-w-sm pointer-events-auto"
          >
            <div 
              style={{ height: `${keyboardHeight}px` }}
              className="bg-card/90 backdrop-blur-[45px] border border-primary/10 rounded-[2.5rem] shadow-[0_20px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-4"
            >
              <div 
                onPointerDown={handleResizeStart}
                className="h-1.5 w-12 bg-primary/10 rounded-full mx-auto mb-4 cursor-ns-resize shrink-0"
              />

              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                  <input 
                    placeholder="Chercher..." 
                    value={emojiSearchQuery}
                    onChange={(e) => setEmojiSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-primary/5 border-none rounded-xl text-xs font-bold focus:ring-1 focus:ring-primary/20 outline-none"
                  />
                </div>
                {emojiSearchQuery && (
                  <button onClick={() => setEmojiSearchQuery("")} className="p-2 opacity-40"><Delete className="h-4 w-4" /></button>
                )}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {emojiSearchQuery ? (
                  <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-6 gap-2 p-1">
                    {filteredEmojis.map((e, i) => (
                      <button key={i} onClick={() => insertText(e.char)} className="flex items-center justify-center aspect-square bg-primary/5 rounded-xl text-lg">
                        <EmojiOracle text={e.char} forceStatic />
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar shrink-0 p-1 bg-primary/5 rounded-2xl">
                      {categories.map((cat, idx) => (
                        <button key={cat.id} onClick={() => { haptic.light(); setEmojiCategory(idx); }} className={cn("flex items-center justify-center h-10 w-10 rounded-xl transition-all", emojiCategory === idx ? "bg-primary text-primary-foreground shadow-lg" : "text-primary/30")}>
                          <cat.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-6 gap-2 p-1">
                      {categories[emojiCategory].items.map((e, idx) => (
                        <button key={idx} onClick={() => insertText(e.char)} className="flex items-center justify-center aspect-square bg-primary/[0.03] border border-primary/5 hover:bg-primary/10 rounded-xl text-lg">
                          <EmojiOracle text={e.char} forceStatic />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
