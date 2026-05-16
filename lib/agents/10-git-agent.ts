// Agent 10 — Git Lifecycle & Version Control Agent
// Release Manager - handles commits, tags, and rollback preparation
// Based on: 10-git-agent.md

import { z } from 'zod';
import simpleGit from 'simple-git';
import type { GitAgentOutput, FixGeneratorOutput, SessionContext } from '../types';
import { askBob } from '../bob-client';

const git = simpleGit();

const SYSTEM_PROMPT = `You are an expert Release Engineer for the DebugBOB DevOps platform. 
You communicate strictly in structured JSON.

Your input is:
- fix_commands: the exact commands applied by the Fix Generator
- git_diff: the code changes made in this fix
- deployment_error_log: the original error that triggered this fix
- session_context: platform, stack, files modified, prior fixes

Your responsibilities:
1. Analyze the git diff and fix commands to understand what changed
2. Generate a structured commit message in Conventional Commits format
3. Propose a new semantic version tag (patch increment from last tag)
4. Check commit history for similar past fixes and reference them
5. Prepare a rollback command targeting the previous stable tag

Your output must match this exact schema — no markdown, no prose outside JSON:

{
  "commit_message": "fix(scope): short description\\n\\n- What broke\\n- How it was fixed",
  "suggested_tag": "v1.0.2-patch",
  "previous_tag": "v1.0.1-patch",
  "rollback_command": "git reset --hard tags/v1.0.1-patch",
  "historical_match": "Commit #a1b2c3 handled a similar issue by changing env variables. Applied same logic here." or null,
  "auto_commit": true
}`;

// Zod schema
const GitAgentSchema = z.object({
  commit_message: z.string(),
  suggested_tag: z.string(),
  previous_tag: z.string(),
  rollback_command: z.string(),
  historical_match: z.string().nullable(),
  auto_commit: z.boolean(),
});

export async function runGitAgent(
  fixOutput: FixGeneratorOutput,
  sessionContext: SessionContext
): Promise<GitAgentOutput> {
  try {
    // Get git context
    const log = await git.log({ maxCount: 20 }).catch(() => ({ all: [] }));
    const historyContext = log.all.map(c => `${c.hash.slice(0, 7)} ${c.message}`).join('\n');
    
    const diff = await git.diff(['HEAD']).catch(() => '');
    const tags = await git.tags().catch(() => ({ latest: null }));
    const latestTag = tags.latest || 'v0.1.0';

    const input = {
      fix_commands: fixOutput.fixes[0]?.commands || [],
      git_diff: diff || 'No diff available',
      git_history: historyContext || 'No history available',
      session_context: sessionContext,
      latest_tag: latestTag,
    };

    // Use Bob IDE instead of Anthropic API
    const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify(input, null, 2)}`;
    const response = await askBob({
      prompt,
      agent: 'git_agent',
      context: { fixOutput, sessionContext }
    });

    const text = response.content;
    
    // Parse and validate
    const parsed = JSON.parse(text);
    const validated = GitAgentSchema.parse(parsed);

    // Optionally auto-commit if enabled and in Phase 1
    if (validated.auto_commit && process.env.GIT_AUTO_COMMIT === 'true') {
      try {
        await git.add('.');
        await git.commit(validated.commit_message);
        await git.addTag(validated.suggested_tag);
        console.log(`✓ Auto-committed with tag ${validated.suggested_tag}`);
      } catch (error) {
        console.error('Auto-commit failed:', error);
        // Don't throw - return the output anyway
      }
    }
    
    return validated;
  } catch (error) {
    console.error('Git Agent error:', error);
    
    // Fallback: return a basic git output
    return {
      commit_message: 'fix: automated fix applied by DebugBOB',
      suggested_tag: 'v0.1.1-patch',
      previous_tag: 'v0.1.0',
      rollback_command: 'git reset --hard HEAD~1',
      historical_match: null,
      auto_commit: false,
    };
  }
}

// Helper function to increment version tag
export function incrementTag(currentTag: string): string {
  const match = currentTag.match(/v(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 'v0.1.1-patch';
  
  const [, major, minor, patch] = match;
  const newPatch = parseInt(patch) + 1;
  return `v${major}.${minor}.${newPatch}-patch`;
}

// Helper to generate conventional commit message
export function generateCommitMessage(
  errorType: string,
  fix: string,
  files: string[]
): string {
  const scope = files.length > 0 ? files[0].split('/')[0] : 'core';
  const type = 'fix';
  
  return `${type}(${scope}): ${fix}\n\n- Error type: ${errorType}\n- Files modified: ${files.join(', ')}`;
}

// Helper to check if git repo exists
export async function isGitRepo(): Promise<boolean> {
  try {
    await git.status();
    return true;
  } catch {
    return false;
  }
}

// Made with Bob
