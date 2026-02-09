
"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface SingleEmojiProps {
  emoji: string;
  hex: string;
  className?: string;
  forceStatic?: boolean;
}

/**
 * @fileOverview SingleEmoji - Rendu individuel avec gestion de stase.
 * Transmute les symboles en essences 3D animées ou statiques selon le contexte.
 */
function SingleEmoji({ emoji, hex, className, forceStatic = false }: SingleEmojiProps) {
  const [stage, setStage] = useState<'animated' | 'static' | 'text'>('animated');

  // Oracle: Les emojis du clavier sont statiques pour la performance.
  // Ceux de l'application s'animent sauf en mode stase.
  const currentStage = forceStatic ? 'static' : stage;

  if (stage === 'text') {
    return <span className={className}>{emoji}</span>;
  }

  const ext = currentStage === 'animated' ? 'gif' : 'webp';
  const src = `https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/512.${ext}`;

  return (
    <img 
      src={src}
      alt={emoji}
      className={cn(
        "inline-block h-[1.25em] w-[1.25em] align-middle translate-y-[-0.1em] mx-[0.05em] select-none",
        className
      )}
      loading="lazy"
      onError={() => {
        if (stage === 'animated') setStage('static');
        else if (stage === 'static') setStage('text');
      }}
    />
  );
}

interface EmojiOracleProps {
  text: string;
  className?: string;
  emojiClassName?: string;
  forceStatic?: boolean;
}

/**
 * @fileOverview EmojiOracle - Détecte les emojis et les transmute en essences 3D.
 */
export function EmojiOracle({ text, className, emojiClassName, forceStatic = false }: EmojiOracleProps) {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|[\u2600-\u27BF]\uFE0F?|[\uD83C-\uD83E][\uDC00-\uDFFF](?:\u200D[\uD83C-\uD83E][\uDC00-\uDFFF])*)/gu;

  const nodes = useMemo(() => {
    if (!text) return [];
    
    const parts = [];
    let lastIndex = 0;
    let match;

    emojiRegex.lastIndex = 0;

    while ((match = emojiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const emoji = match[0];
      const hex = Array.from(emoji)
        .map(c => c.codePointAt(0)?.toString(16))
        .filter(h => h && h !== 'fe0f')
        .join('-');

      parts.push(
        <SingleEmoji 
          key={match.index}
          emoji={emoji}
          hex={hex}
          className={emojiClassName}
          forceStatic={forceStatic}
        />
      );
      
      lastIndex = emojiRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  }, [text, emojiClassName, forceStatic]);

  if (!text) return null;

  return <span className={className}>{nodes}</span>;
}
