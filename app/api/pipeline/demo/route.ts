import { NextRequest } from 'next/server';
import { DEMO_SESSION } from '@/lib/demo-data';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Simulate agent pipeline with realistic timing
      for (const agent of DEMO_SESSION.agents) {
        // Agent starting
        sendEvent({
          type: 'agent_status',
          agent: agent.name,
          status: 'running',
          tokens_used: 0,
          timestamp: Date.now()
        });

        // Wait for simulated processing time
        await new Promise(resolve => setTimeout(resolve, agent.duration));

        // Agent completed
        sendEvent({
          type: 'agent_status',
          agent: agent.name,
          status: 'done',
          output: agent.output,
          tokens_used: Math.floor(Math.random() * 500) + 300,
          timestamp: Date.now()
        });

        // Small delay between agents
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Send completion event
      sendEvent({
        type: 'complete',
        success: true,
        content: {
          root_cause: DEMO_SESSION.agents.find(a => a.name === 'root_cause')?.output,
          fixes: DEMO_SESSION.agents.find(a => a.name === 'fix_generator')?.output,
          cascade_risks: DEMO_SESSION.agents.find(a => a.name === 'cascade_predictor')?.output,
          git_info: DEMO_SESSION.agents.find(a => a.name === 'git_agent')?.output
        },
        tokensUsed: DEMO_SESSION.total_tokens,
        timestamp: Date.now()
      });

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Made with Bob
