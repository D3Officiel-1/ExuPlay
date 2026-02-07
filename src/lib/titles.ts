/**
 * @fileOverview Logique des Titres Honorifiques et Thèmes Visuels d'Exu Play.
 * Définit la hiérarchie basée sur la lumière et les styles visuels des sceaux.
 */

export interface HonorTitle {
  name: string;
  minPoints: number;
  color: string;
  bgClass: string;
  borderColor: string;
  glowColor: string;
  description: string;
  auraClass: string;
}

export const TITLES: HonorTitle[] = [
  {
    name: "Adepte",
    minPoints: 0,
    color: "text-muted-foreground",
    bgClass: "bg-muted/10",
    borderColor: "border-primary/10",
    glowColor: "bg-primary/5",
    description: "Un esprit en quête de lumière.",
    auraClass: "opacity-0"
  },
  {
    name: "Initié",
    minPoints: 500,
    color: "text-blue-500",
    bgClass: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glowColor: "bg-blue-500/10",
    description: "La résonance commence à s'ancrer.",
    auraClass: "bg-blue-500/20"
  },
  {
    name: "Sage",
    minPoints: 1500,
    color: "text-purple-500",
    bgClass: "bg-purple-500/10",
    borderColor: "border-purple-500/40",
    glowColor: "bg-purple-500/20",
    description: "La pensée est devenue une seconde nature.",
    auraClass: "bg-purple-500/30"
  },
  {
    name: "Oracle",
    minPoints: 5000,
    color: "text-yellow-500",
    bgClass: "bg-yellow-500/10",
    borderColor: "border-yellow-500/50",
    glowColor: "bg-yellow-500/30",
    description: "Maître absolu du flux de l'éveil.",
    auraClass: "bg-yellow-500/40"
  }
];

export function getHonorTitle(points: number = 0): HonorTitle {
  return [...TITLES].reverse().find(t => points >= t.minPoints) || TITLES[0];
}

export interface VisualTheme {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  auraClass: string;
}

export const THEMES: Record<string, VisualTheme> = {
  "default": {
    id: "default",
    name: "Neutre",
    color: "text-primary",
    borderColor: "border-primary/20",
    auraClass: "bg-primary/30"
  },
  "theme_ruby": {
    id: "theme_ruby",
    name: "Rubis",
    color: "text-red-500",
    borderColor: "border-red-500 ring-2 ring-red-500/20",
    auraClass: "bg-red-600/60 shadow-[0_0_50px_rgba(220,38,38,0.6)]"
  },
  "theme_obsidian": {
    id: "theme_obsidian",
    name: "Obsidienne",
    color: "text-zinc-100",
    borderColor: "border-zinc-200 ring-4 ring-black/80 shadow-2xl",
    auraClass: "bg-white/10 shadow-[0_0_60px_rgba(255,255,255,0.2)]"
  },
  "theme_gold": {
    id: "theme_gold",
    name: "Or Pur",
    color: "text-yellow-400",
    borderColor: "border-yellow-400 border-[3px] ring-4 ring-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.6)]",
    auraClass: "bg-yellow-400/90 shadow-[0_0_100px_rgba(234,179,8,0.9)]"
  }
};

export function getVisualTheme(themeId?: string): VisualTheme {
  return THEMES[themeId || "default"] || THEMES["default"];
}
