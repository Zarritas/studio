// src/app/api/validate-api-key/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { validateApiKey, type ValidateApiKeyInput, type ValidateApiKeyOutput } from '@/ai/flows/validate-api-key-flow';

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as ValidateApiKeyInput;
    const output: ValidateApiKeyOutput = await validateApiKey(input);
    return NextResponse.json(output);
  } catch (error: any) {
    console.error("Error in /api/validate-api-key:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to validate API key', details: error.details || error.stack },
      { status: 500 }
    );
  }
}
