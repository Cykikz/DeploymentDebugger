// Agent 5 — Fix Generator
// Solution Builder - generates exact, runnable fix commands
// Based on: 05-fix-generator.md

import { z } from 'zod';
import type { FixGeneratorOutput, RootCauseOutput, SessionContext } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are a fix generator for a DevOps debugging tool. You receive a root cause 
analysis. Your job is to generate exact, runnable fix commands.

Rules:
- Commands must be in the correct execution order
- Each command must include a one-line plain English explanation
- Provide confidence (0–1) for the overall fix
- If multiple fix approaches exist, rank them and include all (max 2 approaches)
- Commands must be platform-appropriate (npm vs yarn vs pnpm, etc.)
- Include git commands if the fix modifies tracked files
- NEVER include destructive commands (rm -rf, DROP TABLE, etc.) without 
  explicit confirmation_required: true flag
- MUST include file_changes array with full file content after fix (required for GitHub API)
- Output ONLY valid JSON`;

// Zod schemas
const FixCommandSchema = z.object({
  command: z.string(),
  explanation: z.string(),
  requires_confirmation: z.boolean(),
});

const FileChangeSchema = z.object({
  path: z.string(),
  operation: z.enum(['modify', 'create', 'delete']),
  content: z.string(),
});

const FixApproachSchema = z.object({
  approach: z.string(),
  confidence: z.number().min(0).max(1),
  commands: z.array(FixCommandSchema),
});

const FixGeneratorSchema = z.object({
  fixes: z.array(FixApproachSchema),
  estimated_resolution: z.string(),
  rollback_commands: z.array(z.string()),
  file_changes: z.array(FileChangeSchema),
});

export async function runFixGenerator(
  rootCause: RootCauseOutput | Record<string, unknown>,
  sessionContext: SessionContext
): Promise<FixGeneratorOutput> {
  try {
    const input = {
      root_cause: rootCause,
      session_context: sessionContext,
    };

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(input, null, 2)}`;
    const response = await askBob({
      prompt,
      agent: 'fix_generator',
      context: { rootCause, sessionContext }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = FixGeneratorSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    console.error('Fix Generator error:', error);
    
    // Fallback: return a generic fix suggestion
    return {
      fixes: [
        {
          approach: 'Manual investigation required',
          confidence: 0.3,
          commands: [
            {
              command: 'echo "Unable to generate automatic fix"',
              explanation: 'The error requires manual investigation',
              requires_confirmation: false,
            },
          ],
        },
      ],
      estimated_resolution: 'Manual investigation required',
      rollback_commands: [],
      file_changes: [],
    };
  }
}

// Helper function to generate common fixes
export function generateCommonFix(errorType: string, errorMessage: string): FixGeneratorOutput {
  const fixes: Record<string, FixGeneratorOutput> = {
    missing_dependency: {
      fixes: [
        {
          approach: 'Move to production dependencies',
          confidence: 0.9,
          commands: [
            {
              command: 'npm install <package> --save',
              explanation: 'Moves package from devDependencies to dependencies',
              requires_confirmation: false,
            },
            {
              command: 'git add package.json package-lock.json',
              explanation: 'Stages the dependency changes',
              requires_confirmation: false,
            },
            {
              command: 'git commit -m "fix: move <package> to production dependencies"',
              explanation: 'Commits with conventional commit message',
              requires_confirmation: false,
            },
          ],
        },
      ],
      estimated_resolution: 'Resolves after next deployment (~2 minutes)',
      rollback_commands: ['git revert HEAD', 'git push'],
      file_changes: [],
    },
    env_var_missing: {
      fixes: [
        {
          approach: 'Add environment variable',
          confidence: 0.85,
          commands: [
            {
              command: 'echo "Add <VAR_NAME>=<value> to deployment environment"',
              explanation: 'Environment variables must be set in deployment dashboard',
              requires_confirmation: false,
            },
          ],
        },
      ],
      estimated_resolution: 'Resolves immediately after env var is set',
      rollback_commands: [],
      file_changes: [],
    },
  };

  return fixes[errorType] || {
    fixes: [
      {
        approach: 'Generic fix',
        confidence: 0.5,
        commands: [
          {
            command: 'echo "Review error logs and documentation"',
            explanation: 'No automatic fix available for this error type',
            requires_confirmation: false,
          },
        ],
      },
    ],
    estimated_resolution: 'Manual investigation required',
    rollback_commands: [],
    file_changes: [],
  };
}

// Made with Bob
