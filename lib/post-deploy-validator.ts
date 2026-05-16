// Post-Deployment Validator - Phase 2 Automation
// See 11-phase2-automation.md for full specification

export type ValidationResult = {
  success: boolean;
  attempts: number;
  rolled_back?: boolean;
};

export async function validateDeployment(
  deploymentUrl: string,
  previousTag: string,
  maxAttempts = 3
): Promise<ValidationResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Wait for Vercel to finish (~2 minutes average)
    await waitForVercelDeployment(deploymentUrl, 180_000);

    try {
      const health = await fetch(`${deploymentUrl}/api/health`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (health.ok) return { success: true, attempts: attempt };
    } catch {
      // deployment still not responding
    }

    if (attempt < maxAttempts) {
      // Brief pause before retrying
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }

  return { success: false, attempts: maxAttempts, rolled_back: false };
}

async function waitForVercelDeployment(
  deploymentUrl: string,
  timeoutMs: number
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(deploymentUrl, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.status !== 404) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

// Made with Bob
