
'use server';

/**
 * @fileOverview Un flux Genkit pour générer des questions de quiz ultra-difficiles, variées et concises.
 *
 * - generateQuiz - Fonction principale pour générer un défi complexe et aléatoire.
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
  points: z.number().default(100).describe('Le nombre de points attribués'),
});

export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `Tu es l'Oracle de l'Inconnu, un expert universel doté d'une culture immense et pointue. 
  Ta mission est de générer une question de quiz ultra-difficile, percutante et très courte.
  
  {{#if theme}}Le thème imposé est : {{{theme}}}.{{else}}Si aucun thème n'est fourni, choisis un domaine totalement aléatoire parmi : Gastronomie mondiale, Géographie précise, Histoire des Entreprises, Sport de haut niveau, Littérature classique, Records insolites, etc.{{/if}}
  
  Instructions impératives :
  1. La question doit être en Français et extrêmement CONCISE (maximum 12-15 mots).
  2. La difficulté doit être maximale : ne pose pas de questions évidentes. Cherche le détail que seul un expert connaît.
  3. Varie les sujets de manière imprévisible : 
     - "Quelle ville est située exactement à l'opposé de X ?"
     - "Quel joueur a marqué à la 89ème minute de la finale de 1994 ?"
     - "Quel ingrédient est le composant principal de tel plat obscur ?"
     - "Quelle entreprise a racheté X en quelle année précise ?"
  4. Les 4 options de réponse doivent être extrêmement plausibles et proches pour induire en erreur (ex: des chiffres ou noms très similaires).
  5. Définis l'index correct (0 pour la première option, 3 pour la dernière).
  6. Ton froid, direct et chirurgical.`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const {output} = await prompt(input);
  if (!output) throw new Error('Échec de la génération du défi');
  return output;
}
