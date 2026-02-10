/**
 * @fileOverview Règles fondamentales du Double de l'Éveil.
 * Ce fichier contient la logique synchrone partagée entre le client et le serveur.
 */

export type DoubleColor = 'red' | 'green' | 'blue';

/**
 * Détermine la couleur d'une tuile selon la loi du Double.
 * 0 = Bleu (Singularité x14)
 * 1-7 = Rouge (Force x2)
 * 8-14 = Vert (Force x2)
 */
export const getTileColorSync = (n: number): DoubleColor => {
  if (n === 0) return 'blue';
  return n <= 7 ? 'red' : 'green';
};
