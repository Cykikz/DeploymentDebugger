// Rollback Handler - Phase 2 Automation
// See 11-phase2-automation.md for full specification

import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

export type RollbackResult = {
  rolled_back_to: string;
  redeploy_triggered: boolean;
  message: string;
};

export async function executeRollback(
  previousTag: string,
  owner: string,
  repo: string,
  branch: string
): Promise<RollbackResult> {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      installationId: process.env.GITHUB_INSTALLATION_ID,
    },
  });

  // Get commit SHA at previous stable tag
  const tagRef = await octokit.git.getRef({
    owner,
    repo,
    ref: `tags/${previousTag}`,
  });
  const sha = tagRef.data.object.sha;

  // Force-reset branch to that SHA
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha,
    force: true,
  });

  // Vercel picks up the force push and redeploys at the last stable commit

  return {
    rolled_back_to: previousTag,
    redeploy_triggered: true,
    message: `Reverted to ${previousTag}. Vercel redeployment triggered.`,
  };
}

// Made with Bob
