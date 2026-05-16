// Agent 8 — Context Memory Agent
// Session Compressor - compresses conversation history to prevent context bloat
// Based on: 08-memory-agent.md

import { z } from 'zod';
import type { MemoryBrief, ChatMessage } from '../types';
import { askBob } from '../bob-client';

const SYSTEM_PROMPT = `You are a context compression agent for a DevOps debugging tool. You receive 
the full conversation history of a debug session.

Your job: compress it into a structured session brief that captures everything 
the downstream agents need to know, in the minimum number of tokens.

Extract:
- platform: what stack/platform is being debugged
- files_modified: which files have been changed in this session
- errors_resolved: list of errors that were successfully fixed
- fixes_applied: list of commands that were run
- open_issues: errors or risks that are still unresolved
- hygiene_pending: code hygiene issues found but not yet fixed
- git_tags_created: list of version tags created by the Git Agent this session
- session_state: one sentence describing the current state

Rules:
- Output ONLY valid JSON
- Maximum 400 tokens total output
- Be ruthless: if something isn't needed for future debugging, omit it
- Preserve exact file names, command names, and error messages — these must 
  not be paraphrased
- Do NOT include full stack traces — one-line summaries only`;

// Zod schema
const MemoryBriefSchema = z.object({
  platform: z.string().nullable(),
  stack: z.string().nullable(),
  files_modified: z.array(z.string()),
  errors_resolved: z.array(z.string()),
  fixes_applied: z.array(z.string()),
  open_issues: z.array(z.string()),
  hygiene_pending: z.array(z.string()),
  git_tags_created: z.array(z.string()),
  session_state: z.string(),
  compressed_at_turn: z.number(),
});

export async function runMemoryAgent(
  messages: ChatMessage[],
  currentTurn: number
): Promise<MemoryBrief> {
  try {
    // Convert messages to a compact format for compression
    const conversationSummary = messages.map(msg => ({
      role: msg.role,
      timestamp: msg.timestamp,
      content: msg.role === 'user' ? msg.raw_input : msg.content,
    }));

    const input = {
      conversation_history: conversationSummary,
      current_turn: currentTurn,
    };

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(input, null, 2)}`;
    const response = await askBob({
      prompt,
      agent: 'memory_agent',
      context: { messages, currentTurn }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = MemoryBriefSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    console.error('Memory Agent error:', error);
    
    // Fallback: return an empty brief
    return {
      platform: null,
      stack: null,
      files_modified: [],
      errors_resolved: [],
      fixes_applied: [],
      open_issues: [],
      hygiene_pending: [],
      git_tags_created: [],
      session_state: 'Session in progress',
      compressed_at_turn: currentTurn,
    };
  }
}

// Helper function to check if compression is needed
export function shouldCompress(tokenCount: number, tokenBudget: number): boolean {
  return tokenCount > tokenBudget * 0.6; // Compress at 60% threshold
}

// Helper to estimate token count from messages
export function estimateMessageTokens(messages: ChatMessage[]): number {
  const totalChars = messages.reduce((sum, msg) => {
    const contentStr = JSON.stringify(msg.content || msg.raw_input || '');
    return sum + contentStr.length;
  }, 0);
  
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(totalChars / 4);
}

// Helper to extract key information from messages
export function extractKeyInfo(messages: ChatMessage[]): {
  platform: string | null;
  filesModified: string[];
  errorsResolved: string[];
} {
  let platform: string | null = null;
  const filesModified: Set<string> = new Set();
  const errorsResolved: Set<string> = new Set();

  for (const msg of messages) {
    if (msg.content) {
      // Extract platform
      if (msg.content.log_parser?.platform) {
        platform = msg.content.log_parser.platform;
      }

      // Extract files from fix generator
      if (msg.content.fix_generator?.file_changes) {
        msg.content.fix_generator.file_changes.forEach(fc => {
          filesModified.add(fc.path);
        });
      }

      // Extract resolved errors from root cause
      if (msg.content.root_cause?.root_cause) {
        errorsResolved.add(msg.content.root_cause.root_cause);
      }
    }
  }

  return {
    platform,
    filesModified: Array.from(filesModified),
    errorsResolved: Array.from(errorsResolved),
  };
}

// Made with Bob
