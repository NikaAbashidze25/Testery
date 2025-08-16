'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing job description acceptance criteria.
 *
 * - analyzeJobDetails - Analyzes the specificity and measurability of job acceptance criteria.
 * - JobDetailCheckInput - The input type for the analyzeJobDetails function.
 * - JobDetailCheckOutput - The return type for the analyzeJobDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JobDetailCheckInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to analyze, including acceptance criteria.'),
});
export type JobDetailCheckInput = z.infer<typeof JobDetailCheckInputSchema>;

const JobDetailCheckOutputSchema = z.object({
  feedback: z
    .string()
    .describe(
      'Feedback on how specific and measurable the acceptance criteria are in the job description.'
    ),
});
export type JobDetailCheckOutput = z.infer<typeof JobDetailCheckOutputSchema>;

export async function analyzeJobDetails(input: JobDetailCheckInput): Promise<JobDetailCheckOutput> {
  return jobDetailCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'jobDetailCheckPrompt',
  input: {schema: JobDetailCheckInputSchema},
  output: {schema: JobDetailCheckOutputSchema},
  prompt: `You are an expert in evaluating job descriptions, especially the acceptance criteria.

  Analyze the following job description and provide feedback on how specific and measurable the acceptance criteria are. Suggest improvements to make them clearer and more objective.

  Job Description: {{{jobDescription}}}`,
});

const jobDetailCheckFlow = ai.defineFlow(
  {
    name: 'jobDetailCheckFlow',
    inputSchema: JobDetailCheckInputSchema,
    outputSchema: JobDetailCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
