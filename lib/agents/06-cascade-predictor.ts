// Agent 6 — Cascade Predictor
// Next-Failure Oracle - predicts what will break NEXT after the current fix
// Based on: 06-cascade-predictor.md

import { z } from 'zod';
import type { CascadePredictorOutput, FixGeneratorOutput, RootCauseOutput, SessionContext } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are a cascade failure predictor for a DevOps debugging tool. You receive 
a fix plan and session context. Your job is to predict what will fail NEXT 
if the current fix is applied successfully.

Think through:
- What other parts of the codebase depend on what was just fixed?
- What environment conditions might now surface?
- What is typically the second error after this type of first error?

Rules:
- Predict 1–3 next failures maximum
- Each prediction must explain WHY it will happen
- Include severity: "high" | "medium" | "low"
- If no cascade failures are likely, say so explicitly
- Output ONLY valid JSON`;

// Zod schemas
const CascadeRiskSchema = z.object({
  description: z.string(),
  why: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  affected_file: z.string().nullable(),
  prevention: z.string(),
});

const CascadePredictorSchema = z.object({
  cascade_risks: z.array(CascadeRiskSchema),
  no_cascade_risk: z.boolean(),
});

export async function runCascadePredictor(
  fixOutput: FixGeneratorOutput | Record<string, unknown>,
  rootCause: RootCauseOutput | Record<string, unknown>,
  sessionContext: SessionContext
): Promise<CascadePredictorOutput> {
  try {
    const input = {
      fix_output: fixOutput,
      root_cause: rootCause,
      session_context: sessionContext,
    };

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(input, null, 2)}`;
    const response = await askBob({
      prompt,
      agent: 'cascade_predictor',
      context: { fixOutput, rootCause, sessionContext }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = CascadePredictorSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    console.error('Cascade Predictor error:', error);
    
    // Fallback: return no cascade risks
    return {
      cascade_risks: [],
      no_cascade_risk: true,
    };
  }
}

// Helper function to predict common cascade failures
export function predictCommonCascades(errorType: string, platform: string): CascadePredictorOutput {
  const cascades: Record<string, CascadePredictorOutput> = {
    missing_dependency: {
      cascade_risks: [
        {
          description: 'Environment variables may be missing',
          why: 'The fixed dependency likely requires configuration via environment variables that are not set in production',
          severity: 'high',
          affected_file: null,
          prevention: 'Check the package documentation for required environment variables and add them to the deployment dashboard',
        },
      ],
      no_cascade_risk: false,
    },
    env_var_missing: {
      cascade_risks: [
        {
          description: 'API authentication may fail',
          why: 'The missing environment variable was likely an API key or secret, and other API calls may also be missing credentials',
          severity: 'medium',
          affected_file: null,
          prevention: 'Audit all API calls in the codebase and ensure all required credentials are set',
        },
      ],
      no_cascade_risk: false,
    },
  };

  return cascades[errorType] || {
    cascade_risks: [],
    no_cascade_risk: true,
  };
}

// Helper to assess cascade severity
export function assessCascadeSeverity(
  description: string,
  affectedFile: string | null
): 'high' | 'medium' | 'low' {
  // High severity indicators
  if (
    description.toLowerCase().includes('production') ||
    description.toLowerCase().includes('database') ||
    description.toLowerCase().includes('auth') ||
    description.toLowerCase().includes('security')
  ) {
    return 'high';
  }

  // Medium severity indicators
  if (
    description.toLowerCase().includes('api') ||
    description.toLowerCase().includes('config') ||
    affectedFile?.includes('config')
  ) {
    return 'medium';
  }

  return 'low';
}

// Made with Bob
