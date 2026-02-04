'use server';

/**
 * @fileOverview Un flux Genkit pour générer des questions de quiz ultra-difficiles et précises.
 *
 * - generateQuiz - Fonction principale pour générer un défi complexe.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  theme: z.string().optional().describe('Un thème optionnel pour orienter la question (ex: Technologie, Histoire des Entreprises)'),
});

export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  question: z.string().describe('La question complexe générée'),
  options: z.array(z.string()).length(4).describe('Quatre options de réponse précises et proches'),
  correctIndex: z.number().min(0).max(3).describe('L\'index de la réponse exacte (0-3)'),
  points: z.number().default(100).describe('Le nombre de points attribués'),
});

export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `Tu es un Maître de la Précision, un expert en culture générale, technologie et faits historiques pointus. 
  Ta mission est de générer une question de quiz ultra-difficile, portant sur des faits précis, des dates exactes, des statistiques industrielles ou des données techniques pour tester les esprits les plus affûtés.
  
  {{#if theme}}Le thème imposé est : {{{theme}}}.{{/if}}
  
  Instructions :
  1. La question doit être en Français.
  2. Ne génère PAS de philosophie. Concentre-toi sur des sujets concrets et complexes : 
     - Histoire exacte des entreprises (ex: "Quelle est la date exacte de création de la société Orange sous son nom actuel ?")
     - Spécifications techniques records (ex: "Quelle est la capacité de densité énergétique maximale atteinte par une batterie Li-ion commerciale en 2024 ?")
     - Faits géopolitiques ou scientifiques obscurs mais vérifiables.
  3. La difficulté doit être maximale : les 4 options de réponse doivent être extrêmement plausibles et proches les unes des autres (ex: des dates à quelques jours d'intervalle, ou des chiffres techniques très similaires).
  4. Définis l'index correct (0 pour la première option, 3 pour la dernière).
  5. Rends le ton froid, technique et exigeant.`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const {output} = await prompt(input);
  if (!output) throw new Error('Échec de la génération du défi');
  return output;
}
