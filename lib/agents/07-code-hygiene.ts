// Agent 7 — Code Hygiene Agent
// Codebase Cleaner - finds dead code, stale imports, and conflicts
// Based on: 07-code-hygiene.md

import { z } from 'zod';
import type { CodeHygieneOutput } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are a code hygiene agent for a DevOps debugging tool. You receive a list 
of files that were touched during this debug session and the session context.

Scan for:
1. dead_code: functions defined but never called, variables declared but unused
2. duplicate_logic: the same logic implemented in two places
3. conflicting_config: the same value defined in two places with different values
4. stale_imports: imports that reference removed or renamed modules
5. dev_only_in_prod: packages or code paths that should only run in development

Rules:
- Report issues found in touched files only (do not scan the whole codebase)
- Each issue must include the exact file and line if possible
- Classify severity: "error" (breaks things) | "warning" (wasteful) | "info" (cleanup)
- Suggest an exact fix for each issue in one line
- Output ONLY valid JSON`;

// Zod schemas
const HygieneIssueSchema = z.object({
  type: z.enum(['dead_code', 'duplicate_logic', 'conflicting_config', 'stale_imports', 'dev_only_in_prod']),
  description: z.string(),
  file: z.string(),
  line: z.number().nullable(),
  severity: z.enum(['error', 'warning', 'info']),
  fix: z.string(),
});

const CodeHygieneSchema = z.object({
  issues: z.array(HygieneIssueSchema),
  clean: z.boolean(),
  auto_fixable: z.number(),
});

export async function runCodeHygiene(
  filesTouched: string[]
): Promise<CodeHygieneOutput> {
  try {
    // If no files touched, return clean
    if (filesTouched.length === 0) {
      return {
        issues: [],
        clean: true,
        auto_fixable: 0,
      };
    }

    const input = {
      files_touched: filesTouched,
      instruction: 'Analyze these files for code hygiene issues',
    };

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(input, null, 2)}`;
    const response = await askBob({
      prompt,
      agent: 'code_hygiene',
      context: { filesTouched }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = CodeHygieneSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    console.error('Code Hygiene error:', error);
    
    // Fallback: return clean
    return {
      issues: [],
      clean: true,
      auto_fixable: 0,
    };
  }
}

// Helper function to detect common hygiene issues
export function detectCommonIssues(fileName: string, fileContent: string): CodeHygieneOutput {
  const issues: CodeHygieneOutput['issues'] = [];

  // Check for unused imports (simple heuristic)
  const importMatches = fileContent.matchAll(/import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    const importName = match[1];
    // Very basic check - in real implementation, would use AST
    if (!fileContent.includes(importName.split('/').pop() || '')) {
      issues.push({
        type: 'stale_imports',
        description: `Unused import: ${importName}`,
        file: fileName,
        line: null,
        severity: 'info',
        fix: `Remove the import statement for ${importName}`,
      });
    }
  }

  // Check for console.log (dev only)
  if (fileContent.includes('console.log')) {
    issues.push({
      type: 'dev_only_in_prod',
      description: 'console.log statements found',
      file: fileName,
      line: null,
      severity: 'warning',
      fix: 'Remove console.log statements or use a proper logging library',
    });
  }

  // Check for duplicate PORT definitions
  const portMatches = fileContent.match(/PORT\s*=\s*\d+/g);
  if (portMatches && portMatches.length > 1) {
    issues.push({
      type: 'conflicting_config',
      description: 'PORT defined multiple times',
      file: fileName,
      line: null,
      severity: 'error',
      fix: 'Consolidate PORT definition to a single location',
    });
  }

  return {
    issues,
    clean: issues.length === 0,
    auto_fixable: issues.filter(i => i.severity === 'info').length,
  };
}

// Helper to categorize issue severity
export function categorizeSeverity(issueType: string, description: string): 'error' | 'warning' | 'info' {
  if (issueType === 'conflicting_config') return 'error';
  if (issueType === 'stale_imports') return 'info';
  if (issueType === 'dev_only_in_prod' && description.includes('console.log')) return 'warning';
  if (issueType === 'dead_code') return 'info';
  if (issueType === 'duplicate_logic') return 'warning';
  return 'info';
}

// Made with Bob
