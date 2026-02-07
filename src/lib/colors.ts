/**
 * @fileOverview Oracle de la Palette Sacrée.
 * Définit les harmonies de couleurs et les convertisseurs pour l'application.
 */

export interface AppColor {
  id: string;
  name: string;
  hex: string;
}

export const PRESET_COLORS: AppColor[] = [
  { id: "azure", name: "Azur", hex: "#3b82f6" },
  { id: "emerald", name: "Émeraude", hex: "#10b981" },
  { id: "amber", name: "Ambre", hex: "#f59e0b" },
  { id: "ruby", name: "Rubis", hex: "#e11d48" },
  { id: "amethyst", name: "Améthyste", hex: "#8b5cf6" },
  { id: "obsidian", name: "Obsidienne", hex: "#1f2937" },
];

/**
 * Convertit un Hexadécimal (#RRGGBB) en composantes HSL pour Tailwind.
 * Retourne une chaîne "h s% l%" compatible avec les variables CSS de Shadcn.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number; hslValue: string } {
  // Retirer le # si présent
  hex = hex.replace(/^#/, '');

  // Convertir en RGB
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return {
    h: hDeg,
    s: sPct,
    l: lPct,
    hslValue: `${hDeg} ${sPct}% ${lPct}%`
  };
}

/**
 * Détermine la couleur de contraste (noir ou blanc) basée sur la luminance d'une couleur hex.
 * Retourne une valeur HSL compatible avec Tailwind.
 */
export function getContrastColor(hex: string): string {
  if (hex === 'default') return "0 0% 100%";
  
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Formule de luminance relative standard
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Si la couleur est claire, texte noir (0 0% 0%), sinon texte blanc (0 0% 100%)
  return luminance > 0.5 ? "0 0% 0%" : "0 0% 100%";
}
