
/**
 * @fileOverview This file defines a Genkit flow to suggest closing inactive tabs based on user usage patterns.
 *
 * - suggestInactiveTabsClosure - A function that suggests closing inactive tabs.
 * - SuggestInactiveTabsClosureInput - The input type for the suggestInactiveTabsClosure function.
 * - SuggestInactiveTabsClosureOutput - The return type for the suggestInactiveTabsClosure function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestInactiveTabsClosureInputSchema = z.object({
  tabActivityData: z
    .string()
    .describe(
      'A string containing data about the user activity on each tab. Should include tab title, URL, and last active timestamp.'
    ),
  userPreferences: z
    .string()
    .optional()
    .describe('Optional string describing user preferences for tab management.'),
});
export type SuggestInactiveTabsClosureInput = z.infer<typeof SuggestInactiveTabsClosureInputSchema>;

const SuggestInactiveTabsClosureOutputSchema = z.object({
  tabsToClose: z
    .array(z.string())
    .describe('An array of tab URLs that the AI suggests closing.'),
  reasoning: z.string().describe('The AI reasoning behind the tab closure suggestions.'),
});
export type SuggestInactiveTabsClosureOutput = z.infer<typeof SuggestInactiveTabsClosureOutputSchema>;

export async function suggestInactiveTabsClosure(
  input: SuggestInactiveTabsClosureInput
): Promise<SuggestInactiveTabsClosureOutput> {
  return suggestInactiveTabsClosureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestInactiveTabsClosurePrompt',
  input: {schema: SuggestInactiveTabsClosureInputSchema},
  output: {schema: SuggestInactiveTabsClosureOutputSchema},
  prompt: `You are a browser extension AI that helps users manage their open tabs by suggesting inactive tabs for closure.

You will receive data about the user's open tabs and their activity, as well as optional user preferences.

Based on this information, you will determine which tabs are likely to be inactive and suggest closing them to reduce clutter and improve browser performance. You must return a list of URLs and the reasoning for closing the tabs.

Tab Activity Data:
{{{tabActivityData}}}

User Preferences (optional):
{{{userPreferences}}}

Consider the time since last activity, the type of tab (e.g., social media, news, documentation), and any user preferences provided.

Format your output as a JSON object with "tabsToClose" (an array of URLs to close) and "reasoning" (a string explaining the suggestions).
`,
});

const suggestInactiveTabsClosureFlow = ai.defineFlow(
  {
    name: 'suggestInactiveTabsClosureFlow',
    inputSchema: SuggestInactiveTabsClosureInputSchema,
    outputSchema: SuggestInactiveTabsClosureOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
