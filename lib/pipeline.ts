// Pipeline Runner
// Orchestrates all agents with token optimization and SSE streaming
// Based on: IMPLEMENTATION_PLAN.md Phase 3

import {
  runSanitizer,
  runOrchestrator,
  runLogParser,
  runRootCause,
  runFixGenerator,
  runCascadePredictor,
  runCodeHygiene,
  runMemoryAgent,
  runOutputCompressor,
  runGitAgent,
  hasRawLogs,
  shouldCompress,
  estimateMessageTokens,
} from './agents';

import type {
  AgentEvent,
  AgentName,
  AssistantContent,
  MemoryBrief,
  ChatMessage,
} from './types';

// Token budget configuration
const TOKEN_BUDGET = 100000;
const COMPRESSION_THRESHOLD = 0.6; // 60%

/**
 * Estimate token count from text
 * Rough approximation: ~4 characters per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface PipelineOptions {
  rawInput: string;
  sessionMemory: MemoryBrief | null;
  messages: ChatMessage[];
  currentTurn: number;
  onEvent: (event: AgentEvent) => void;
}

export interface PipelineResult {
  success: boolean;
  content: AssistantContent;
  tokensUsed: number;
  memoryCompressed: boolean;
  error?: string;
}

/**
 * Main pipeline runner - orchestrates all agents with token optimization
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { rawInput, sessionMemory, messages, currentTurn, onEvent } = options;
  
  let totalTokens = 0;
  let memoryCompressed = false;

  const emitEvent = (agent: AgentName, status: AgentEvent['status'], output?: Record<string, unknown>, tokens = 0) => {
    totalTokens += tokens;
    onEvent({
      agent,
      status,
      output,
      tokens_used: tokens,
      timestamp: Date.now(),
    });
  };

  try {
    // ============================================================
    // STEP 1: SANITIZER - Clean and structure input
    // ============================================================
    emitEvent('sanitizer', 'running');
    const sanitizerResult = await runSanitizer(rawInput);
    const sanitized = sanitizerResult;
    // Get actual tokens from Bob client (stored in the response)
    const sanitizerTokens = estimateTokens(JSON.stringify(sanitized));
    emitEvent('sanitizer', 'done', sanitized as any, sanitizerTokens);

    // Check if clarification is needed
    if (sanitized.type === 'clarification') {
      return {
        success: true,
        content: {
          agents_run: ['sanitizer'],
        },
        tokensUsed: totalTokens,
        memoryCompressed: false,
      };
    }

    const cleanedPrompt = sanitized.prompt;

    // ============================================================
    // STEP 2: ORCHESTRATOR - Plan execution
    // ============================================================
    emitEvent('orchestrator', 'running');
    const plan = await runOrchestrator(cleanedPrompt, sessionMemory);
    const orchestratorTokens = estimateTokens(JSON.stringify(plan) + cleanedPrompt);
    emitEvent('orchestrator', 'done', plan as any, orchestratorTokens);

    // Initialize result
    const result: AssistantContent = {
      agents_run: ['sanitizer', 'orchestrator'],
    };

    // ============================================================
    // STEP 3: LOG PARSER (if logs present)
    // ============================================================
    let logOutput: any = null;
    if (plan.has_logs || hasRawLogs(rawInput)) {
      emitEvent('log_parser', 'running');
      const rawLogOutput = await runLogParser(rawInput);
      
      // Compress log parser output
      logOutput = await runOutputCompressor(rawLogOutput);
      
      const logParserTokens = estimateTokens(JSON.stringify(rawLogOutput) + rawInput.substring(0, 1000));
      emitEvent('log_parser', 'done', logOutput, logParserTokens);
      result.agents_run.push('log_parser');
      result.log_parser = rawLogOutput;
    }

    // ============================================================
    // STEP 4: ROOT CAUSE - Analyze why it failed
    // ============================================================
    emitEvent('root_cause', 'running');
    const rootCauseInput = logOutput || { sanitized_prompt: cleanedPrompt };
    const rootCauseOutput = await runRootCause(rootCauseInput, plan.session_context);
    
    // Compress root cause output
    const compressedRootCause = await runOutputCompressor(rootCauseOutput);
    
    const rootCauseTokens = estimateTokens(JSON.stringify(rootCauseOutput) + JSON.stringify(rootCauseInput));
    emitEvent('root_cause', 'done', compressedRootCause, rootCauseTokens);
    result.agents_run.push('root_cause');
    result.root_cause = rootCauseOutput;

    // ============================================================
    // STEP 5: FIX GENERATOR - Create solution
    // ============================================================
    emitEvent('fix_generator', 'running');
    const fixOutput = await runFixGenerator(compressedRootCause, plan.session_context);
    
    // Compress fix output
    const compressedFix = await runOutputCompressor(fixOutput);
    
    const fixGeneratorTokens = estimateTokens(JSON.stringify(fixOutput) + JSON.stringify(compressedRootCause));
    emitEvent('fix_generator', 'done', compressedFix, fixGeneratorTokens);
    result.agents_run.push('fix_generator');
    result.fix_generator = fixOutput;

    // ============================================================
    // STEP 6 & 7: CASCADE PREDICTOR + CODE HYGIENE (parallel)
    // ============================================================
    const [cascadeOutput, hygieneOutput] = await Promise.all([
      (async () => {
        emitEvent('cascade_predictor', 'running');
        const output = await runCascadePredictor(compressedFix, compressedRootCause, plan.session_context);
        const cascadeTokens = estimateTokens(JSON.stringify(output) + JSON.stringify(compressedFix));
        emitEvent('cascade_predictor', 'done', output as any, cascadeTokens);
        return output;
      })(),
      (async () => {
        emitEvent('code_hygiene', 'running');
        const output = await runCodeHygiene(plan.session_context.files_touched);
        const hygieneTokens = estimateTokens(JSON.stringify(output) + JSON.stringify(plan.session_context.files_touched));
        emitEvent('code_hygiene', 'done', output as any, hygieneTokens);
        return output;
      })(),
    ]);

    result.agents_run.push('cascade_predictor', 'code_hygiene');
    result.cascade_predictor = cascadeOutput;
    result.code_hygiene = hygieneOutput;

    // ============================================================
    // STEP 8: GIT AGENT (if fix is ready)
    // ============================================================
    if (plan.trigger_git_agent) {
      emitEvent('git_agent', 'running');
      const gitOutput = await runGitAgent(fixOutput, plan.session_context);
      const gitTokens = estimateTokens(JSON.stringify(gitOutput) + JSON.stringify(fixOutput));
      emitEvent('git_agent', 'done', gitOutput as any, gitTokens);
      result.agents_run.push('git_agent');
      result.git_agent = gitOutput;
    }

    // ============================================================
    // STEP 9: MEMORY AGENT (if token budget exceeded)
    // ============================================================
    const currentTokenCount = estimateMessageTokens(messages) + totalTokens;
    if (shouldCompress(currentTokenCount, TOKEN_BUDGET)) {
      emitEvent('memory_agent', 'running');
      const memoryBrief = await runMemoryAgent(messages, currentTurn);
      const memoryTokens = estimateTokens(JSON.stringify(memoryBrief) + JSON.stringify(messages).substring(0, 2000));
      emitEvent('memory_agent', 'done', memoryBrief as any, memoryTokens);
      result.agents_run.push('memory_agent');
      memoryCompressed = true;
    }

    return {
      success: true,
      content: result,
      tokensUsed: totalTokens,
      memoryCompressed,
    };

  } catch (error) {
    console.error('Pipeline error:', error);
    
    return {
      success: false,
      content: {
        agents_run: ['sanitizer'],
      },
      tokensUsed: totalTokens,
      memoryCompressed: false,
      error: error instanceof Error ? error.message : 'Unknown pipeline error',
    };
  }
}

/**
 * Helper to estimate if memory compression is needed before running pipeline
 */
export function needsMemoryCompression(messages: ChatMessage[]): boolean {
  const tokenCount = estimateMessageTokens(messages);
  return shouldCompress(tokenCount, TOKEN_BUDGET);
}

/**
 * Helper to get current token usage percentage
 */
export function getTokenUsagePercentage(messages: ChatMessage[], additionalTokens = 0): number {
  const tokenCount = estimateMessageTokens(messages) + additionalTokens;
  return (tokenCount / TOKEN_BUDGET) * 100;
}

// Made with Bob
