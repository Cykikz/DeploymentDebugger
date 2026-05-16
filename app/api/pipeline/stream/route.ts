// SSE API Route - Pipeline Stream
// Real-time agent pipeline execution with Server-Sent Events
// Based on: IMPLEMENTATION_PLAN.md Phase 4

import { NextRequest } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import type { AgentEvent, MemoryBrief, ChatMessage } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PipelineRequest {
  raw_input: string;
  session_memory: MemoryBrief | null;
  messages: ChatMessage[];
  current_turn: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: PipelineRequest = await req.json();
    const { raw_input, session_memory, messages, current_turn } = body;

    // Validate input
    if (!raw_input || typeof raw_input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: raw_input is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE events
    const sendEvent = (event: AgentEvent | { type: string; [key: string]: any }) => {
      const data = JSON.stringify(event);
      writer.write(encoder.encode(`data: ${data}\n\n`));
    };

    // Run pipeline in background
    (async () => {
      try {
        const result = await runPipeline({
          rawInput: raw_input,
          sessionMemory: session_memory,
          messages: messages || [],
          currentTurn: current_turn || 0,
          onEvent: (event) => {
            // Stream each agent event to the client
            sendEvent(event);
          },
        });

        // Send completion event
        sendEvent({
          type: 'complete',
          success: result.success,
          content: result.content,
          tokensUsed: result.tokensUsed,
          memoryCompressed: result.memoryCompressed,
          error: result.error,
        });

        // Close the stream
        await writer.close();
      } catch (error) {
        console.error('Pipeline execution error:', error);
        
        // Send error event
        sendEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        });

        await writer.close();
      }
    })();

    // Return SSE response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Health check endpoint
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'DebugBOB Pipeline API',
      version: '1.0.0',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Made with Bob
