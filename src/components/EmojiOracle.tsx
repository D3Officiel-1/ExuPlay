
"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface EmojiOracleProps {
  text: string;
  className?: string;
  emojiClassName?: string;
}

/**
 * @fileOverview EmojiOracle - Le Sceau de Transmutation v2.0.
 * Détecte les emojis unicode (y compris les séquences complexes) 
 * et les remplace par leurs versions 3D animées (Noto Emoji).
 */
export function EmojiOracle({ text, className, emojiClassName }: EmojiOracleProps) {
  // Regex robuste pour capturer les emojis simples et les séquences complexes (ZWJ, teint de peau, etc.)
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|[\u2600-\u27BF]\uFE0F?|[\uD83C-\uD83E][\uDC00-\uDFFF](?:\u200D[\uD83C-\uD83E][\uDC00-\uDFFF])*)/gu;

  const nodes = useMemo(() => {
    if (!text) return [];
    
    const parts = [];
    let lastIndex = 0;
    let match;

    // Réinitialiser le regex
    emojiRegex.lastIndex = 0;

    while ((match = emojiRegex.exec(text)) !== null) {
      // Texte avant l'emoji
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const emoji = match[0];
      
      // Conversion unicode vers hex pour le CDN Noto
      // On filtre fe0f (variant selector) qui cause souvent des 404 sur les versions animées
      const hex = Array.from(emoji)
        .map(c => c.codePointAt(0)?.toString(16))
        .filter(h => h && h !== 'fe0f')
        .join('-');

      parts.push(
        <img 
          key={match.index}
          src={`https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/512.gif`}
          alt={emoji}
          className={cn(
            "inline-block h-[1.25em] w-[1.25em] align-middle translate-y-[-0.1em] mx-[0.05em] select-none",
            emojiClassName
          )}
          loading="lazy"
          onError={(e) => {
            // Fallback vers l'emoji texte si l'animation 3D n'existe pas
            const target = e.target as HTMLImageElement;
            const parent = target.parentNode;
            if (parent) {
              const span = document.createElement('span');
              span.innerText = emoji;
              parent.insertBefore(span, target);
              target.style.display = 'none';
            }
          }}
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
