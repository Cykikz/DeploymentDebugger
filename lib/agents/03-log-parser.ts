// Agent 3 — Log Parser
// Signal Extractor - extracts structured error data from raw logs
// Based on: 03-log-parser.md

import { z } from 'zod';
import type { LogParserOutput, ErrorType, Platform } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are a log parser for a DevOps debugging tool. You receive raw log output.
Your ONLY job is to extract structured error information.

Extract:
- error_type: classify as one of: missing_dependency | env_var_missing | 
  port_conflict | cors_error | typescript_error | build_command_error | 
  docker_error | auth_error | database_error | runtime_crash | unknown
- error_message: the exact error message text, verbatim
- error_file: the file where the error originates (null if not present)
- error_line: line number (null if not present)
- stack_trace: array of stack frames as strings (empty array if not present)
- platform: detected platform — vercel | docker | github_actions | railway | 
  netlify | local | unknown
- is_fatal: boolean — did this error terminate the process?
- raw_excerpt: the 3–5 most relevant lines from the log, exactly as they appear
- confidence: number 0-1 indicating how confident you are in the classification

Output ONLY valid JSON. No prose. No explanation. No markdown.`;

// Zod schema for validation
const LogParserSchema = z.object({
  error_type: z.enum([
    'missing_dependency',
    'env_var_missing',
    'port_conflict',
    'cors_error',
    'typescript_error',
    'build_command_error',
    'docker_error',
    'auth_error',
    'database_error',
    'runtime_crash',
    'unknown',
  ]),
  error_message: z.string(),
  error_file: z.string().nullable(),
  error_line: z.number().nullable(),
  stack_trace: z.array(z.string()),
  platform: z.enum([
    'vercel',
    'docker',
    'github_actions',
    'railway',
    'netlify',
    'local',
    'unknown',
  ]),
  is_fatal: z.boolean(),
  raw_excerpt: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export async function runLogParser(rawLog: string): Promise<LogParserOutput> {
  try {
    // Truncate log if too long (max 800 tokens ≈ 3200 chars)
    const truncatedLog = rawLog.length > 3200
      ? rawLog.slice(0, 3200) + '\n... (truncated)'
      : rawLog;

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nRaw log:\n${truncatedLog}`;
    const response = await askBob({
      prompt,
      agent: 'log_parser',
      context: { rawLog: truncatedLog }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = LogParserSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    console.error('Log Parser error:', error);
    
    // Fallback: return a basic unknown error
    return {
      error_type: 'unknown',
      error_message: 'Failed to parse log',
      error_file: null,
      error_line: null,
      stack_trace: [],
      platform: 'unknown',
      is_fatal: false,
      raw_excerpt: [rawLog.slice(0, 200)],
      confidence: 0.1,
    };
  }
}

// Helper function to detect platform from log content
export function detectPlatform(log: string): Platform {
  if (log.includes('vercel') || log.includes('▲')) return 'vercel';
  if (log.includes('docker') || log.includes('container')) return 'docker';
  if (log.includes('github') || log.includes('actions/')) return 'github_actions';
  if (log.includes('railway')) return 'railway';
  if (log.includes('netlify')) return 'netlify';
  return 'unknown';
}

// Helper to extract error type from common patterns
export function quickErrorType(log: string): ErrorType {
  if (/cannot find module|module not found/i.test(log)) return 'missing_dependency';
  if (/env|environment variable/i.test(log)) return 'env_var_missing';
  if (/port.*already in use|eaddrinuse/i.test(log)) return 'port_conflict';
  if (/cors|cross-origin/i.test(log)) return 'cors_error';
  if (/typescript|\.ts\(\d+,\d+\)/i.test(log)) return 'typescript_error';
  if (/npm err|yarn error|build failed/i.test(log)) return 'build_command_error';
  if (/docker|container/i.test(log)) return 'docker_error';
  if (/unauthorized|forbidden|401|403/i.test(log)) return 'auth_error';
  if (/database|sql|mongo|postgres/i.test(log)) return 'database_error';
  if (/segmentation fault|core dumped/i.test(log)) return 'runtime_crash';
  return 'unknown';
}

// Made with Bob
