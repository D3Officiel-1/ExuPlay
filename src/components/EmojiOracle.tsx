
"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface SingleEmojiProps {
  emoji: string;
  hex: string;
  className?: string;
}

/**
 * @fileOverview SingleEmoji - Composant de rendu individuel avec cascade de secours.
 * 1. Tente le GIF animé (3D).
 * 2. Repli sur le WebP statique (3D).
 * 3. Repli final sur le caractère Unicode (Texte).
 */
function SingleEmoji({ emoji, hex, className }: SingleEmojiProps) {
  const [stage, setStage] = useState<'animated' | 'static' | 'text'>('animated');

  if (stage === 'text') {
    return <span className={className}>{emoji}</span>;
  }

  const ext = stage === 'animated' ? 'gif' : 'webp';
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
}

/**
 * @fileOverview EmojiOracle - Le Sceau de Transmutation v3.0.
 * Détecte les emojis unicode et les remplace par leurs versions 3D (animées ou statiques).
 */
export function EmojiOracle({ text, className, emojiClassName }: EmojiOracleProps) {
  // Regex robuste pour capturer les emojis simples et les séquences complexes
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
        />
      );
      
      lastIndex = emojiRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  }, [text, emojiClassName]);

  if (!text) return null;

  return <span className={className}>{nodes}</span>;
}
