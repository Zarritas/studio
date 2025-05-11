'use server';
/**
 * @fileOverview A Genkit flow to validate a Google Gemini API key.
 *
 * - validateApiKey - A function that attempts a simple API call to check key validity.
 * - ValidateApiKeyInput - The input type for the validateApiKey function.
 * - ValidateApiKeyOutput - The return type for the validateApiKey function.
 */

import { genkit, type GenkitError } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

export const ValidateApiKeyInputSchema = z.object({
  apiKey: z.string().min(1, { message: 'API key cannot be empty' }),
});
export type ValidateApiKeyInput = z.infer<typeof ValidateApiKeyInputSchema>;

export const ValidateApiKeyOutputSchema = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
});
export type ValidateApiKeyOutput = z.infer<typeof ValidateApiKeyOutputSchema>;

export async function validateApiKey(
  input: ValidateApiKeyInput
): Promise<ValidateApiKeyOutput> {
  try {
    // Create a temporary Genkit instance with the provided API key
    const tempAi = genkit({
      plugins: [googleAI({ apiKey: input.apiKey })],
      // No specific model needed at instance level for this test
    });

    // Attempt a simple, low-cost generation request
    await tempAi.generate({
      model: 'googleai/gemini-1.5-flash-latest', // Using a common and efficient model
      prompt: 'Say "hello"', // A very simple prompt
      config: { temperature: 0.1 }, // Minimal config to reduce variability
    });

    return { isValid: true };
  } catch (e) {
    const error = e as GenkitError;
    console.error('API Key validation failed:', error.message, error.details); // Log server-side for debugging

    let userFriendlyError = 'Invalid API Key or API error.';
    if (error.details?.reason === 'API_KEY_INVALID' || error.message?.includes('API key not valid') || error.message?.includes('provide an API key')) {
      userFriendlyError = 'The provided API Key is not valid. Please check it and try again.';
    } else if (error.details?.reason === 'USER_LOCATION_INVALID' || error.message?.includes('permission denied')) {
        userFriendlyError = 'Permission denied or region not supported. The API key might lack necessary permissions or use from your region is restricted.';
    } else if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND') || error.message?.includes('EAI_AGAIN')) {
        userFriendlyError = 'Network error. Could not reach Google API services. Please check your internet connection.';
    } else if (error.status === 'UNAUTHENTICATED') {
        userFriendlyError = 'Authentication failed. The API key is likely invalid or missing required permissions.';
    }
    // Add more specific error handling based on observed error messages/codes
    return { isValid: false, error: userFriendlyError };
  }
}
