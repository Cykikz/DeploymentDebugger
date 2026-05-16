// Fetch Vercel Deployment Logs
// See 11-phase2-automation.md for full specification

export async function fetchVercelLogs(deploymentId: string): Promise<string> {
  const response = await fetch(
    `https://api.vercel.com/v2/deployments/${deploymentId}/events`,
    {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Vercel logs: ${response.statusText}`);
  }

  const events = await response.json();

  return events
    .filter((e: any) => e.type === 'stderr' || e.type === 'error')
    .map((e: any) => e.payload?.text ?? '')
    .join('\n');
}

// Made with Bob
