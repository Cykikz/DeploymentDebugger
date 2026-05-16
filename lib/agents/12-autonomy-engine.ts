// Agent 12 — BOB Autonomy & Decision Engine
// See 12-bob-autonomy.md for full specification

import Anthropic from '@anthropic-ai/sdk';
import type {
  AutonomyDecision,
  FixGeneratorOutput,
  GitAgentOutput,
  CascadePredictorOutput,
} from '../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are the autonomy decision engine for DebugBOB, a fully automated DevOps 
repair system. You receive the outputs of the full agent pipeline and must 
decide whether to act automatically, open a PR, or hold.

Your inputs:
- fix_output: FixGeneratorOutput (from Agent 5)
- git_output: GitAgentOutput (from Agent 10)
- cascade_risks: CascadePredictorOutput (from Agent 6)
- autonomy_level: 1 | 2 | 3 (user's configured setting)
- is_production_branch: boolean
- fix_confidence: number (0–1, from Fix Generator)
- prior_failures_this_session: number

Decision rules:
- If autonomy_level = 1: ALWAYS output action = "notify_only"
- If autonomy_level = 2: ALWAYS output action = "open_pr"
- If autonomy_level = 3:
    - If fix_confidence >= 0.85 AND no high-severity cascade risks: action = "auto_apply"
    - If fix_confidence >= 0.85 AND high-severity cascade risks exist: action = "open_pr" 
      (too risky to auto-push without human seeing the cascade warning)
    - If fix_confidence < 0.85: action = "open_pr"
    - If prior_failures_this_session >= 2: action = "hold"
      (something is wrong that BOB doesn't understand — stop and notify human)
    - If is_production_branch = true AND cascade severity = "high": action = "hold"

Output ONLY valid JSON. No prose.`;

export type AutonomyEngineInput = {
  fix_output: FixGeneratorOutput | null;
  git_output: GitAgentOutput | null;
  cascade_risks: CascadePredictorOutput | null;
  autonomy_level: 1 | 2 | 3;
  is_production_branch: boolean;
  fix_confidence: number;
  prior_failures_this_session: number;
};

export async function runAutonomyEngine(
  input: AutonomyEngineInput
): Promise<AutonomyDecision> {
  const userPrompt = JSON.stringify(input, null, 2);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '{}';

  try {
    const decision = JSON.parse(responseText) as AutonomyDecision;
    return decision;
  } catch (error) {
    // Fallback to safe default
    return {
      action: 'hold',
      reason: 'Failed to parse autonomy decision - defaulting to hold for safety',
      confidence_gate_passed: false,
      cascade_gate_passed: false,
      human_message:
        'BOB encountered an error in the autonomy engine. Manual review required.',
      rollback_armed: false,
      estimated_redeploy_minutes: 0,
    };
  }
}

// Made with Bob
