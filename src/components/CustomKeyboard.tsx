
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Delete, ArrowUp, Check, ChevronDown, Smile, Dog, Pizza, 
  Bike, Plane, Lightbulb, Heart, Flag, Sparkles, User, Footprints,
  Gamepad2, Music2, Coffee, Ghost, Sun, Car
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type KeyboardLayout = "alpha" | "numeric" | "emoji";

/**
 * @fileOverview Oracle du Parsing d'Emojis.
 * Convertit une chaîne brute d'emojis en un tableau d'objets avec leurs codes Hex pour le rendu 3D.
 */
function parseEmojiString(raw: string) {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|[\u2600-\u27BF]\uFE0F?|[\uD83C-\uD83E][\uDC00-\uDFFF](?:\u200D[\uD83C-\uD83E][\uDC00-\uDFFF])*)/gu;
  const matches = raw.match(emojiRegex) || [];
  const unique = Array.from(new Set(matches));
  
  return unique.map(emoji => ({
    char: emoji,
    hex: Array.from(emoji)
      .map(c => c.codePointAt(0)?.toString(16))
      .filter(h => h && h !== 'fe0f')
      .join('-')
  }));
}

// --- LES ARCHIVES DE L'ORACLE (CATÉGORIE PERSONNES COMPLÈTE) ---
const RAW_EMOJI_PEOPLE = "😀😃😄😁😆🥹😅😂🤣🥲☺️😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳🙂‍↕️😏😒🙂‍↔️😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😶‍🌫️😱😨😰😥😓🤗🤔🫣🤭🫢🫡🤫🫠🤥😶🫥😐🫤😑🫨😬🙄😯😦😧😮😲🥱🫩😴🤤😪😮‍💨😵😵‍💫🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾🫶🤲👐🙌👏🤝👍👎👊✊🤛🤜🫷🫸🤞✌️🫰🤟🤘👌🤌🤏🫳🫴👈👉👆👇☝️✋🤚🖐️🖖👋🤙🫲🫱💪🦾🖕✍️🙏🫵🦶🦵🦿💄💋👄🫦🦷👅👂🦻👃🫆👣👁️👀🫀🫁🧠🗣️👤👥🫂👶👧🧒👦👩🧑👨👩‍🦱🧑‍🦱👨‍🦱👩‍🦰🧑‍🦰👨‍🦰👱‍♀️👱👱‍♂️👩‍🦳🧑‍🦳👨‍🦳👩‍🦲🧑‍🦲👨‍🦲🧔‍♀️🧔🧔‍♂️👵🧓👴👲👳‍♀️👳👳‍♂️🧕👮‍♀️👮👮‍♂️👷‍♀️👷👷‍♂️💂‍♀️💂🏻💂‍♂️🕵️‍♀️🕵️🕵️‍♂️👩‍⚕️🧑‍⚕️👨‍⚕️👩‍🌾🧑‍🌾👨‍🌾👩‍🍳🧑‍🍳👨‍🍳👩‍🎓🧑‍🎓👨‍🎓👩‍🎤🧑‍🎤👨‍🎤👩‍🏫🧑‍🏫👨‍🏫👩‍🏭🧑‍🏭👨‍🏭👩‍💻🧑‍💻👨‍💻👩‍💼🧑‍💼👨‍💼👩‍🔧🧑‍🔧👨‍🔧👩‍🔬🧑‍🔬👨‍🔬👩‍🎨🧑‍🎨👨‍🎨👩‍🚒🧑‍🚒👨‍🚒👩‍✈️🧑‍✈️👨‍✈️👩‍🚀🧑‍🚀👨‍🚀👩‍⚖️🧑‍⚖️👨‍⚖️👰‍♀️👰👰‍♂️🤵‍♀️🤵🤵‍♂️👸🫅🤴🥷🦸‍♀️🦸🦸‍♂️🦹‍♀️🦹🦹‍♂️🤶🧑‍🎄🎅🧙‍♀️🧙🧙‍♂️🧝‍♀️🧝🧝‍♂️🧌🧛‍♀️🧛🧛‍♂️🧟‍♀️🧟🧟‍♂️🧞‍♀️🧞🧞‍♂️🧜‍♀️🧜🧜‍♂️🧚‍♀️🧚🧚‍♂️👼🤰🫄🫃🤱👩‍🍼🧑‍🍼👨‍🍼🙇‍♀️🙇🙇‍♂️💁‍♀️💁💁‍♂️🙅‍♀️🙅🙅‍♂️🙆‍♀️🙆🙆‍♂️🙋‍♀️🙋🙋‍♂️🧏‍♀️🧏🧏‍♂️🤦‍♀️🤦🤦‍♂️🤷‍♀️🤷🤷‍♂️🙎‍♀️🙎🙎‍♂️🙍‍♀️🙍🙍‍♂️💇‍♀️💇💇‍♂️💆‍♀️💆💆‍♂️🧖‍♀️🧖🧖‍♂️💅🤳💃🕺👯‍♀️👯👯‍♂️🕴️👩‍🦽🧑‍🦽👨‍🦽👩‍🦼🧑‍🦼👨‍🦼🚶‍♀️🚶🚶‍♂️👩‍🦯🧑‍🦯👨‍🦯🧎‍♀️🧎🧎‍♂️🏃‍♀️🏃🏃‍♂️🧍‍♀️🧍🧍‍♂️👫👭👬👩‍❤️‍👨👩‍❤️‍👩💑👨‍❤️‍👨👩‍❤️‍💋‍👨👩‍❤️‍💋‍👩💏👨‍❤️‍💋‍👨🪢🧶🧵🪡🧥🥼🦺👚👕👖🩲🩳👔👗👙🩱👘🥻🩴🥿👠👡👢👞👟🥾🧦🧤🧣🎩🧢👒🎓⛑️🪖👑💍👝👛👜💼🎒🧳👓🕶️🥽🌂";
const RAW_NATURE = "🐶🐱🦁🐯🦊🐻🐼🐨🐸🦄🐉🦖🐳🐙🦋🐝🌸🔥🌵🌴🪐🌈🍄🌊🌍☀️🌙⭐⚡✨❄️💨🌪️🌱🌲🌳🍃🍂🍁🍂";
const RAW_FOOD = "🍎🍌🍉🍓🥑🍕🍔🍟🌮 sushi 🍣🍦🍰 donut 🍩 popcorn 🍿 🍺🍷☕ croissant 🥐 pretzel 🥨 cheese 🧀 egg 🥚🍭 bento 🍱 onigiri 🍙 ramen 🍜 curry 🍛";
const RAW_ACTIVITIES = "⚽🏀🏈🎾🥊🎮🎯🎲🎸🎨🎬🎤🏆🥇🛹🚲🧩 bowling 🎳 saxophone 🎷 violin 🎻 kite 🪁 billiard 🎱 controller 🎮 joystick 🕹️ theater 🎭 ticket 🎟️";

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
      className="flex items-center justify-center aspect-square rounded-xl bg-primary/[0.03] border border-primary/5 hover:bg-primary/10 hover:border-primary/10 transition-all p-1 group overflow-hidden relative"
    >
      {stage === 'text' ? (
        <span className="text-lg">{emoji}</span>
      ) : (
        <img 
          src={getUrl()} 
          alt={emoji} 
          className="w-full h-full object-contain transition-transform group-hover:scale-110 relative z-10" 
          loading="lazy"
          onError={() => {
            if (stage === 'animated') setStage('static');
            else if (stage === 'static') setStage('text');
          }}
        />
      )}
    </button>
  );
}

export function CustomKeyboard() {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [layout, setLayout] = useState<KeyboardLayout>("alpha");
  const [isShift, setIsShift] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  
  const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backspaceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categories = useMemo(() => [
    { id: "people", icon: Smile, items: parseEmojiString(RAW_EMOJI_PEOPLE) },
    { id: "nature", icon: Dog, items: parseEmojiString(RAW_NATURE) },
    { id: "food", icon: Pizza, items: parseEmojiString(RAW_FOOD) },
    { id: "activities", icon: Gamepad2, items: parseEmojiString(RAW_ACTIVITIES) },
    { id: "objects", icon: Lightbulb, items: parseEmojiString("💡📱💻📷🔭💎🛡️⚔️🗝️💊🧪🧱🎈🎁✉️💵💳") },
    { id: "symbols", icon: Heart, items: parseEmojiString("❤️🧡💛💚💙💜🖤✨⚡❄️⚛️♾️☯️🔱✅❌🧿🔔") }
  ], []);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        if (window.innerWidth < 768) {
          target.setAttribute("inputmode", "none");
          setActiveInput(target);
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

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

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
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[10002] px-2 pb-safe-area-inset-bottom pointer-events-none"
        >
          <div className="flex flex-col items-center mb-2">
            <button 
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => { haptic.medium(); activeInput?.blur(); setIsVisible(false); }}
              className="h-8 w-16 bg-card/40 backdrop-blur-3xl rounded-full border border-primary/5 flex items-center justify-center shadow-lg pointer-events-auto"
            >
              <ChevronDown className="h-4 w-4 opacity-40" />
            </button>
          </div>

          <div className="max-w-md mx-auto bg-card/60 backdrop-blur-[45px] border-t border-x border-primary/5 rounded-t-[2.5rem] p-3 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.4)] pointer-events-auto overflow-hidden h-[280px]">
            <AnimatePresence mode="wait">
              {layout === "emoji" ? (
                <motion.div 
                  key="emoji-layout"
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  className="flex flex-col h-full"
                >
                  <div className="flex justify-between items-center gap-1 mb-4 px-1 overflow-x-auto no-scrollbar py-1">
                    {categories.map((cat, idx) => (
                      <button
                        key={cat.id}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => { haptic.light(); setEmojiCategory(idx); }}
                        className={cn(
                          "flex items-center justify-center min-w-[44px] h-11 rounded-xl transition-all",
                          emojiCategory === idx ? "bg-primary text-primary-foreground shadow-lg scale-110" : "bg-primary/5 text-primary/40"
                        )}
                      >
                        <cat.icon className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-8 gap-2 p-1">
                    {categories[emojiCategory].items.map((emoji, idx) => (
                      <KeyboardEmoji 
                        key={`${emojiCategory}-${idx}`} 
                        emoji={emoji.char} 
                        hex={emoji.hex} 
                        onClick={(char) => handleKeyPress(char)} 
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4 h-12">
                    <button onPointerDown={(e) => e.preventDefault()} onClick={() => setLayout("alpha")} className="flex-[2] bg-primary/10 text-primary font-black text-[10px] uppercase rounded-xl">abc</button>
                    <button onPointerDown={(e) => e.preventDefault()} onClick={() => handleKeyPress("space")} className="flex-[4] bg-card/40 border border-primary/5 rounded-xl flex items-center justify-center"><div className="w-16 h-1.5 bg-primary/20 rounded-full" /></button>
                    <button onPointerDown={(e) => { e.preventDefault(); startBackspace(); }} onPointerUp={stopBackspace} onPointerLeave={stopBackspace} className="flex-[2] bg-primary/5 text-primary/60 rounded-xl flex items-center justify-center"><Delete className="h-5 w-5" /></button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key={layout}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-2 h-full justify-center"
                >
                  {(layout === "alpha" ? ALPHA_KEYS : NUMERIC_KEYS).map((row, i) => (
                    <div key={i} className="flex justify-center gap-1.5 h-12">
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
                              isSpecial ? "bg-primary/5 text-primary/60 text-[10px] uppercase tracking-widest px-3" : "bg-card/40 border border-primary/5 text-lg flex-1 shadow-sm",
                              key === "space" && "flex-[4]",
                              key === "enter" && "flex-[2] bg-primary text-primary-foreground shadow-xl",
                              key === "shift" && isShift && "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                            )}
                          >
                            {key === "shift" ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <motion.div animate={{ y: isShift ? -1 : 0, scale: isShift ? 1.15 : 1 }}><ArrowUp className={cn("h-5 w-5", isShift ? "stroke-[3px]" : "stroke-2")} /></motion.div>
                                {isShift && <motion.div initial={{ width: 0 }} animate={{ width: 12 }} className="h-0.5 bg-current rounded-full" />}
                              </div>
                            ) : key === "backspace" ? <Delete className="h-5 w-5" /> : key === "enter" ? <Check className="h-5 w-5" /> : key === "emoji-switch" ? (
                              <div className="relative"><Smile className="h-5 w-5" /><motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-1 -right-1"><Sparkles className="h-2 w-2 text-primary" /></motion.div></div>
                            ) : key === "space" ? <div className="w-16 h-1 bg-current opacity-20 rounded-full" /> : (layout === "alpha" && isShift ? key.toUpperCase() : key)}
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
