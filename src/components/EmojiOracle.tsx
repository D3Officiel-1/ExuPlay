
"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface EmojiOracleProps {
  text: string;
  className?: string;
  emojiClassName?: string;
}

/**
 * @fileOverview EmojiOracle - Le Sceau de Transmutation.
 * Détecte les emojis unicode et les remplace par leurs versions 3D animées (Noto Emoji).
 */
export function EmojiOracle({ text, className, emojiClassName }: EmojiOracleProps) {
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

  const nodes = useMemo(() => {
    if (!text) return [];
    
    const parts = [];
    let lastIndex = 0;
    let match;

    // Réinitialiser le regex pour éviter les problèmes de stateful regex
    emojiRegex.lastIndex = 0;

    while ((match = emojiRegex.exec(text)) !== null) {
      // Texte avant l'emoji
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const emoji = match[0];
      // Conversion unicode vers hex pour le CDN Noto
      const hex = Array.from(emoji)
        .map(c => c.codePointAt(0)?.toString(16))
        .filter(Boolean)
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
            // Fallback vers l'emoji texte si l'animation 3D n'existe pas pour cette variante
            (e.target as HTMLImageElement).style.display = 'none';
            const span = document.createElement('span');
            span.innerText = emoji;
            (e.target as HTMLImageElement).parentNode?.insertBefore(span, e.target as HTMLImageElement);
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
