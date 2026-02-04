
'use server';

/**
 * @fileOverview Un flux Genkit pour générer des questions de quiz ultra-difficiles sur la Côte d'Ivoire.
 *
 * - generateQuiz - Fonction principale pour générer un défi complexe ancré dans le contexte Ivoirien.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  theme: z.string().optional().describe('Un thème optionnel pour orienter la question (ex: Sport, Cuisine, Entreprises)'),
});

export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  question: z.string().describe('La question concise et complexe générée'),
  options: z.array(z.string()).length(4).describe('Quatre options de réponse précises et trompeuses'),
  correctIndex: z.number().min(0).max(3).describe('L\'index de la réponse exacte (0-3)'),
  points: z.number().min(1).max(100).describe('Le nombre de points attribués, le plus petit possible en fonction de la complexité (max 100)'),
});

export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `Tu es l'Oracle de l'Inconnu, expert absolu de la Terre d'Éburnie. Ta mission est de générer une épreuve de savoir sur la Côte d'Ivoire.
  
  Instructions impératives :
  1. La question doit porter EXCLUSIVEMENT sur la Côte d'Ivoire (Vie, Culture, Phénomènes de société, Politique, Économie, Stars, Joueurs, Artistes, Dirigeants).
  2. La question doit être en Français et extrêmement CONCISE (maximum 12-15 mots).
  3. La difficulté doit être maximale : cherche le détail technique, le chiffre précis ou le fait historique que seul un expert ivoirien absolu connaîtrait.
  4. Génère de manière autonome un sujet aléatoire parmi les domaines cités, sans assistance externe.
  5. Les 4 options de réponse doivent être extrêmement plausibles, précises et proches (chiffres exacts, noms similaires) pour induire en erreur.
  6. Définis l'index correct (0-3).
  7. Attribue un nombre de points (champ 'points') proportionnel à la difficulté, mais garde-le le plus PETIT possible sans JAMAIS dépasser 100 pts.
  8. Ton froid, direct et chirurgical.`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const {output} = await prompt(input);
  if (!output) throw new Error('Échec de la génération du défi');
  return output;
}
