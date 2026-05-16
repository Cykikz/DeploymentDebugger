// Agent 4 — Root Cause Agent
// Reasoner - determines WHY the error occurred, not just what it says
// Based on: 04-root-cause.md

import { z } from 'zod';
import type { RootCauseOutput, LogParserOutput, SessionContext } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are a root cause analysis agent for a DevOps debugging tool. You receive 
a structured error signal and session context. Your job is to reason about 
WHY the error occurred — not just what it says.

Think through:
1. Why does this error occur in this environment but not locally? (if applicable)
2. What underlying condition created this error?
3. What is the exact chain of events that led to this failure?

Rules:
- Be specific. "Missing dependency" is not a root cause. "axios was installed 
  with --save-dev and is therefore excluded from the production build" is.
- Use the session context to connect this error to prior errors if relevant
- Give your confidence as a score 0–1
- Output ONLY valid JSON. No prose outside the JSON fields.`;

// Zod schema for validation
const RootCauseSchema = z.object({
  root_cause: z.string(),
  cause_category: z.string(),
  why_works_locally: z.string().nullable(),
  contributing_factors: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  needs_logs: z.boolean(),
});

export async function runRootCause(
  errorData: LogParserOutput | Record<string, unknown>,
  sessionContext: SessionContext
): Promise<RootCauseOutput> {
  try {
    const input = {
      error_data: errorData,
      session_context: sessionContext,
    };

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(input, null, 2)}`;
    const response = await askBob({
      prompt,
      agent: 'root_cause',
      context: { errorData, sessionContext }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = RootCauseSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    console.error('Root Cause error:', error);
    
    // Fallback: return a generic root cause
    return {
      root_cause: 'Unable to determine specific root cause. The error occurred but the underlying condition is unclear.',
      cause_category: 'unknown',
      why_works_locally: null,
      contributing_factors: [],
      confidence: 0.2,
      needs_logs: true,
    };
  }
}

// Helper function to infer root cause from error type
export function inferRootCause(errorType: string, errorMessage: string): string {
  const patterns: Record<string, string> = {
    missing_dependency: 'A required package is not installed or is installed in the wrong dependency category (devDependencies vs dependencies)',
    env_var_missing: 'An environment variable is referenced in code but not set in the deployment environment',
    port_conflict: 'The application is trying to bind to a port that is already in use by another process',
    cors_error: 'The server is not configured to allow cross-origin requests from the frontend domain',
    typescript_error: 'TypeScript compilation failed due to type errors or configuration issues',
    build_command_error: 'The build script failed, likely due to missing dependencies or incorrect build configuration',
    docker_error: 'Docker container failed to start or build, possibly due to incorrect Dockerfile or missing dependencies',
    auth_error: 'Authentication failed due to invalid credentials, expired tokens, or misconfigured auth settings',
    database_error: 'Database connection or query failed, possibly due to incorrect connection string or missing database',
    runtime_crash: 'The application crashed at runtime due to an unhandled exception or memory issue',
  };

  return patterns[errorType] || 'Unknown error type - unable to infer root cause';
}

// Helper to determine if error would work locally
export function wouldWorkLocally(errorType: string, platform: string): boolean {
  // Errors that typically work locally but fail in production
  const productionOnlyErrors = [
    'missing_dependency', // devDependencies work locally
    'env_var_missing',    // .env.local works locally
    'build_command_error', // different build configs
  ];

  return productionOnlyErrors.includes(errorType) && platform !== 'local';
}

// Made with Bob
