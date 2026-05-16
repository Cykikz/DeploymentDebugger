// Agent 1 — Prompt Sanitizer
// Input Guard - cleans and structures user input before pipeline
// Based on: 01-prompt-sanitizer.md

import { z } from 'zod';
import type { SanitizerOutput } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are a prompt sanitizer for a DevOps debugging tool. Your ONLY job is to rewrite the user's raw input into a clean, structured task description.

Rules:
1. Fix all grammar, spelling, and punctuation errors
2. Infer the most likely technical intent from context clues
3. Add likely context the user didn't state (e.g. if they say "vercel fail", infer: "Vercel deployment failure — likely causes: missing env var, build command mismatch, missing prod dependency")
4. Output a clean task description in 3–5 sentences maximum
5. If the intent is completely unresolvable (no error type, no platform, no file mentioned), output a JSON object with a single "clarification_question" field containing ONE question — never more than one
6. NEVER explain what you are doing
7. NEVER add preamble or sign-off
8. Output ONLY the cleaned prompt string, or the JSON clarification object

Output format when intent is clear:
"[Cleaned, structured task description in plain technical English]"

Output format when intent is unresolvable:
{"clarification_question": "Where is it failing — during deployment, at runtime, or locally during build?"}`;

// Zod schemas for validation
const CleanedOutputSchema = z.object({
  type: z.literal('cleaned'),
  prompt: z.string(),
});

const ClarificationOutputSchema = z.object({
  type: z.literal('clarification'),
  question: z.string(),
});

const SanitizerOutputSchema = z.union([
  CleanedOutputSchema,
  ClarificationOutputSchema,
]);

export async function runSanitizer(rawInput: string): Promise<SanitizerOutput> {
  try {
    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nUser input:\n${rawInput}`;
    const response = await askBob({
      prompt,
      agent: 'sanitizer',
      context: { rawInput }
    });

    const text = response.content;

    // Try to parse as JSON first (clarification case)
    try {
      const parsed = JSON.parse(text);
      if ('clarification_question' in parsed) {
        return {
          type: 'clarification',
          question: parsed.clarification_question,
        };
      }
    } catch {
      // Not JSON, treat as cleaned prompt
    }

    // If not JSON, it's a cleaned prompt
    return {
      type: 'cleaned',
      prompt: text.trim(),
    };
  } catch (error) {
    console.error('Sanitizer error:', error);
    // Fallback: return the raw input as cleaned
    return {
      type: 'cleaned',
      prompt: rawInput,
    };
  }
}

// Helper function to detect if input is a raw log
export function isRawLog(input: string): boolean {
  const logIndicators = [
    /error:/i,
    /\d{4}-\d{2}-\d{2}/,  // timestamp
    /at .+:\d+:\d+/,       // stack trace
    /\[.*\]/,              // log level brackets
    /npm ERR!/,
    /ENOENT|EACCES|EPERM/,
  ];

  return logIndicators.some(pattern => pattern.test(input));
}

// Helper to detect non-English input
export function detectLanguage(input: string): 'english' | 'other' {
  // Simple heuristic: check for common non-ASCII characters
  const hasNonAscii = /[^\x00-\x7F]/.test(input);
  return hasNonAscii ? 'other' : 'english';
}

// Made with Bob
