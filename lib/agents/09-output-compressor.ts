// Agent 9 — Output Compressor
// Runs between every agent handoff to strip verbose output down to essential signal
// Based on: 09-output-compressor.md

import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are an output compressor for a multi-agent pipeline. You receive the raw 
output of one AI agent and must compress it to the minimum JSON representation 
needed by the next agent.

Rules:
- Remove all prose, explanations, caveats, and markdown
- Remove any restatement of the input
- Remove confidence disclaimers — keep only the confidence score
- Keep all file names, command strings, and error messages verbatim
- Represent everything as a flat or shallow JSON object
- Maximum output: 200 tokens
- Output ONLY valid JSON`;

export async function runOutputCompressor(
  rawOutput: string | Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    // If already an object, stringify it first
    const inputText = typeof rawOutput === 'string'
      ? rawOutput
      : JSON.stringify(rawOutput);

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput to compress:\n${inputText}`;
    const response = await askBob({
      prompt,
      agent: 'output_compressor',
      context: { rawOutput }
    });

    const text = response.content;
    
    // Parse and return the compressed JSON
    const compressed = JSON.parse(text);
    
    return compressed;
  } catch (error) {
    console.error('Output Compressor error:', error);
    // Fallback: return the input as-is if compression fails
    return typeof rawOutput === 'string' ? { raw: rawOutput } : rawOutput;
  }
}

// Helper function to estimate token count (rough approximation)
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

// Validate that compressed output is under token limit
export function validateCompression(
  compressed: Record<string, unknown>,
  maxTokens: number = 200
): boolean {
  const text = JSON.stringify(compressed);
  return estimateTokens(text) <= maxTokens;
}

// Made with Bob
