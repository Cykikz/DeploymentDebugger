// Autonomous Pipeline Runner - Phase 2 Automation
// See 11-phase2-automation.md for full specification

import { runPipeline } from './pipeline';
import { runAutonomyEngine } from './agents/12-autonomy-engine';
import { applyFixToGitHub } from './github/apply-fix';
import { validateDeployment } from './post-deploy-validator';
import { executeRollback } from './rollback-handler';
import type { DeploymentData, PipelineResult } from './types';

// SSE broadcast function placeholder - implement based on your SSE setup
function broadcastSSE(deploymentId: string, event: any) {
  // TODO: Implement SSE broadcasting to dashboard
  console.log(`[SSE ${deploymentId}]`, event);
}

// Notification function placeholder
async function notifySlack(eventType: string, data: any) {
  if (!process.env.DEBUGBOB_SLACK_WEBHOOK_URL) return;

  const notifyOn = (process.env.DEBUGBOB_NOTIFY_ON || '').split(',');
  if (!notifyOn.includes(eventType)) return;

  // TODO: Implement Slack notification
  console.log(`[Slack] ${eventType}`, data);
}

export async function runAutonomousPipeline(deploymentData: DeploymentData) {
  try {
    // Step 1: Run the full 10-agent pipeline (same as Phase 1)
    // SSE events stream to dashboard exactly as before
    const pipelineResult = await runPipeline(
      deploymentData.error_logs,
      null, // no prior session memory on webhook trigger
      (event) => broadcastSSE(deploymentData.deployment_id, event)
    );

    if (!pipelineResult.success) {
      broadcastSSE(deploymentData.deployment_id, {
        type: 'error',
        message: 'Pipeline failed',
      });
      return;
    }

    const content = pipelineResult.content;

    // Step 2: Autonomy Engine decides what to do
    const decision = await runAutonomyEngine({
      fix_output: content.fix_generator || null,
      git_output: content.git_agent || null,
      cascade_risks: content.cascade_predictor || null,
      autonomy_level: parseInt(
        process.env.DEBUGBOB_AUTONOMY_LEVEL ?? '2'
      ) as 1 | 2 | 3,
      is_production_branch:
        deploymentData.branch === 'main' ||
        deploymentData.branch === 'master',
      fix_confidence: content.fix_generator?.fixes[0]?.confidence ?? 0,
      prior_failures_this_session: 0,
    });

    // Broadcast decision to dashboard
    broadcastSSE(deploymentData.deployment_id, {
      type: 'decision',
      decision,
    });

    // Step 3: Execute the action
    if (decision.action === 'auto_apply') {
      if (!content.fix_generator || !content.git_agent) {
        broadcastSSE(deploymentData.deployment_id, {
          type: 'error',
          message: 'Missing fix or git data for auto_apply',
        });
        return;
      }

      const applyResult = await applyFixToGitHub({
        owner: deploymentData.owner,
        repo: deploymentData.repo,
        branch: deploymentData.branch,
        commitSha: deploymentData.commit_sha,
        fixCommands: content.fix_generator.fixes[0].commands,
        fileChanges: content.fix_generator.file_changes,
        commitMessage: content.git_agent.commit_message,
        suggestedTag: content.git_agent.suggested_tag,
        mode: 'auto',
        rootCause: content.root_cause?.root_cause,
        cascadeWarnings: content.cascade_predictor?.cascade_risks,
      });

      // Step 4: Wait for Vercel to redeploy and validate
      const validation = await validateDeployment(
        deploymentData.deployment_url,
        content.git_agent.previous_tag,
        3 // max attempts
      );

      if (validation.success) {
        broadcastSSE(deploymentData.deployment_id, {
          type: 'success',
          tag: applyResult.tag,
        });
        await notifySlack('auto_apply_success', {
          ...deploymentData,
          ...applyResult,
        });
      } else {
        // Auto rollback
        await executeRollback(
          content.git_agent.previous_tag,
          deploymentData.owner,
          deploymentData.repo,
          deploymentData.branch
        );
        broadcastSSE(deploymentData.deployment_id, { type: 'rolled_back' });
        await notifySlack('auto_apply_failed', deploymentData);
      }
    } else if (decision.action === 'open_pr') {
      if (!content.fix_generator || !content.git_agent) {
        broadcastSSE(deploymentData.deployment_id, {
          type: 'error',
          message: 'Missing fix or git data for open_pr',
        });
        return;
      }

      const prResult = await applyFixToGitHub({
        owner: deploymentData.owner,
        repo: deploymentData.repo,
        branch: deploymentData.branch,
        commitSha: deploymentData.commit_sha,
        fixCommands: content.fix_generator.fixes[0].commands,
        fileChanges: content.fix_generator.file_changes,
        commitMessage: content.git_agent.commit_message,
        suggestedTag: content.git_agent.suggested_tag,
        mode: 'pr',
        rootCause: content.root_cause?.root_cause,
        cascadeWarnings: content.cascade_predictor?.cascade_risks,
      });

      broadcastSSE(deploymentData.deployment_id, {
        type: 'pr_opened',
        pr_url: prResult.pr_url,
      });
      await notifySlack('pr_opened', {
        ...deploymentData,
        pr_url: prResult.pr_url,
      });
    } else if (decision.action === 'hold') {
      broadcastSSE(deploymentData.deployment_id, {
        type: 'hold',
        reason: decision.reason,
      });
      await notifySlack('hold', { ...deploymentData, reason: decision.reason });
    }

    // notify_only: nothing to execute — dashboard already shows results via SSE
  } catch (error) {
    console.error('Autonomous pipeline error:', error);
    broadcastSSE(deploymentData.deployment_id, {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Made with Bob
