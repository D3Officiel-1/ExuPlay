/**
 * @fileOverview Logique des Titres Honorifiques d'Exu Play.
 * Définit la hiérarchie basée sur la lumière accumulée.
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
    auraClass: "bg-blue-500/5 blur-xl"
  },
  {
    name: "Sage",
    minPoints: 1500,
    color: "text-purple-500",
    bgClass: "bg-purple-500/10",
    borderColor: "border-purple-500/40",
    glowColor: "bg-purple-500/20",
    description: "La pensée est devenue une seconde nature.",
    auraClass: "bg-purple-500/10 blur-2xl"
  },
  {
    name: "Oracle",
    minPoints: 5000,
    color: "text-yellow-500",
    bgClass: "bg-yellow-500/10",
    borderColor: "border-yellow-500/50",
    glowColor: "bg-yellow-500/30",
    description: "Maître absolu du flux de l'éveil.",
    auraClass: "bg-yellow-500/20 blur-3xl animate-pulse"
  }
];

export function getHonorTitle(points: number = 0): HonorTitle {
  // On parcourt à l'envers pour trouver le palier le plus haut atteint
  return [...TITLES].reverse().find(t => points >= t.minPoints) || TITLES[0];
}
