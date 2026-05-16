// Agent 2 — Master Orchestrator
// Pipeline Director - routes tasks and coordinates all specialist agents
// Based on: 02-orchestrator.md

import { z } from 'zod';
import type { OrchestratorPlan, MemoryBrief, AgentName } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are the orchestration agent for DebugBOB, a DevOps debugging system.
You coordinate a pipeline of specialist agents. You do NOT diagnose, fix,
or generate code yourself.

Your inputs:
- sanitized_prompt: string (from Prompt Sanitizer)
- session_memory: object (from Memory Agent — current session state)
- available_agents: string[] (list of agents available to call)

Your job:
1. Classify the request type: "deployment_failure" | "runtime_error" | "build_error" | "dependency_issue" | "config_conflict" | "general_question"
2. Decide which agents to call based on classification
3. Output a structured execution plan as JSON

ALWAYS call Log Parser first if raw logs are present.
ALWAYS call Root Cause after Log Parser.
ALWAYS call Fix Generator after Root Cause.
ALWAYS call Cascade Predictor after Fix Generator.
ALWAYS call Code Hygiene after Fix Generator (runs in parallel with Cascade Predictor).
ALWAYS call Git Agent after Fix Generator when a fix has been committed or applied.
ONLY call Memory Agent if session token count exceeds 60% of budget.
NEVER call an agent twice in the same pipeline run.

Output ONLY valid JSON. No prose. No explanation.`;

// Zod schema
const SessionContextSchema = z.object({
  platform: z.string().nullable(),
  stack: z.string().nullable(),
  prior_errors: z.array(z.string()),
  files_touched: z.array(z.string()),
});

const OrchestratorPlanSchema = z.object({
  request_type: z.enum([
    'deployment_failure',
    'runtime_error',
    'build_error',
    'dependency_issue',
    'config_conflict',
    'general_question',
  ]),
  has_logs: z.boolean(),
  execution_order: z.array(z.enum([
    'sanitizer',
    'orchestrator',
    'log_parser',
    'root_cause',
    'fix_generator',
    'cascade_predictor',
    'code_hygiene',
    'memory_agent',
    'output_compressor',
    'git_agent',
    'autonomy_engine',
  ])),
  parallel_agents: z.array(z.array(z.enum([
    'sanitizer',
    'orchestrator',
    'log_parser',
    'root_cause',
    'fix_generator',
    'cascade_predictor',
    'code_hygiene',
    'memory_agent',
    'output_compressor',
    'git_agent',
    'autonomy_engine',
  ]))).optional(),
  session_context: SessionContextSchema,
  abort_if_no_logs: z.boolean(),
  trigger_git_agent: z.boolean(),
});

export async function runOrchestrator(
  sanitizedPrompt: string,
  sessionMemory: MemoryBrief | null
): Promise<OrchestratorPlan> {
  try {
    const input = {
      sanitized_prompt: sanitizedPrompt,
      session_memory: sessionMemory,
      available_agents: [
        'log_parser',
        'root_cause',
        'fix_generator',
        'cascade_predictor',
        'code_hygiene',
        'git_agent',
        'memory_agent',
      ],
    };

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(input, null, 2)}`;
    const response = await askBob({
      prompt,
      agent: 'orchestrator',
      context: { sanitizedPrompt, sessionMemory }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = OrchestratorPlanSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    console.error('Orchestrator error:', error);
    
    // Fallback: return a default plan
    return {
      request_type: 'general_question',
      has_logs: false,
      execution_order: ['root_cause', 'fix_generator'],
      session_context: {
        platform: sessionMemory?.platform || null,
        stack: sessionMemory?.stack || null,
        prior_errors: sessionMemory?.errors_resolved || [],
        files_touched: sessionMemory?.files_modified || [],
      },
      abort_if_no_logs: false,
      trigger_git_agent: false,
    };
  }
}

// Helper function to detect if input contains logs
export function hasRawLogs(input: string): boolean {
  const logIndicators = [
    /error:/i,
    /\d{4}-\d{2}-\d{2}/,  // timestamp
    /at .+:\d+:\d+/,       // stack trace
    /\[.*\]/,              // log level brackets
    /npm ERR!/,
    /ENOENT|EACCES|EPERM/,
    /failed|failure/i,
  ];

  return logIndicators.some(pattern => pattern.test(input));
}

// Helper to classify request type
export function classifyRequest(prompt: string): OrchestratorPlan['request_type'] {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('deploy') || lower.includes('vercel') || lower.includes('build fail')) {
    return 'deployment_failure';
  }
  if (lower.includes('runtime') || lower.includes('crash') || lower.includes('500')) {
    return 'runtime_error';
  }
  if (lower.includes('build') || lower.includes('compile') || lower.includes('typescript')) {
    return 'build_error';
  }
  if (lower.includes('module') || lower.includes('package') || lower.includes('dependency')) {
    return 'dependency_issue';
  }
  if (lower.includes('config') || lower.includes('env') || lower.includes('port')) {
    return 'config_conflict';
  }
  
  return 'general_question';
}

// Helper to determine execution order
export function determineExecutionOrder(
  requestType: OrchestratorPlan['request_type'],
  hasLogs: boolean
): AgentName[] {
  const order: AgentName[] = [];

  if (hasLogs) {
    order.push('log_parser');
  }

  order.push('root_cause');
  order.push('fix_generator');

  // Cascade and Hygiene run in parallel
  order.push('cascade_predictor');
  order.push('code_hygiene');

  // Git agent runs after fixes are generated
  order.push('git_agent');

  return order;
}

// Made with Bob
