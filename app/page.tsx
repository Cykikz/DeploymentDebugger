'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/session-store';
import { DEMO_MESSAGES } from '@/lib/demo-data';
import type { AgentEvent, ChatMessage } from '@/lib/types';

export default function Home() {
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';
  
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [agentOutputs, setAgentOutputs] = useState<Record<string, any>>({});
  const [bobStatus, setBobStatus] = useState<{ enabled: boolean; mode: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check Bob IDE status on mount
  useEffect(() => {
    fetch('/api/bob-status')
      .then(res => res.json())
      .then(data => setBobStatus(data))
      .catch(() => setBobStatus({ enabled: false, mode: 'Status unavailable' }));
  }, []);

  const {
    messages,
    agents,
    token_count,
    token_budget,
    memory_brief,
    updateAgentStatus,
    addMessage,
    incrementTokens,
    setMemoryBrief,
  } = useSessionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      raw_input: input,
      content: null,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setInput('');
    setIsProcessing(true);

    try {
      // Use demo endpoint if in demo mode
      const endpoint = isDemoMode ? '/api/pipeline/demo' : '/api/pipeline/stream';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_input: input,
          session_memory: memory_brief,
          messages: messages,
          current_turn: messages.length,
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n\n').filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = JSON.parse(line.slice(6));

          if ('agent' in data) {
            // Agent event
            const event = data as AgentEvent;
            updateAgentStatus(event.agent, event.status);
            
            // Store agent output when done
            if (event.status === 'done' && event.output) {
              setAgentOutputs(prev => ({
                ...prev,
                [event.agent]: event.output
              }));
            }
            
            if (event.tokens_used) {
              incrementTokens(event.tokens_used);
            }
          } else if (data.type === 'complete') {
            // Pipeline complete
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: data.content,
              timestamp: Date.now(),
            };
            addMessage(assistantMessage);

            if (data.memoryCompressed && data.content.memory_brief) {
              setMemoryBrief(data.content.memory_brief);
            }
          } else if (data.type === 'error') {
            console.error('Pipeline error:', data.message);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const tokenPercentage = (token_count / token_budget) * 100;

  // Load demo messages on mount if in demo mode
  useEffect(() => {
    if (isDemoMode && messages.length === 0) {
      DEMO_MESSAGES.forEach(msg => {
        addMessage({
          id: crypto.randomUUID(),
          role: msg.role,
          raw_input: msg.role === 'user' ? msg.content : undefined,
          content: msg.role === 'assistant' ? {
            agents_run: ['sanitizer', 'orchestrator', 'log_parser', 'root_cause', 'fix_generator', 'cascade_predictor', 'code_hygiene', 'git_agent'],
            root_cause: {
              root_cause: msg.content,
              cause_category: 'dependency_misconfiguration',
              why_works_locally: 'devDependencies are installed locally',
              contributing_factors: ['--save-dev flag used', 'Vercel excludes devDependencies'],
              confidence: 0.92,
              needs_logs: false
            }
          } : null,
          timestamp: msg.timestamp,
        });
      });
    }
  }, [isDemoMode, messages.length, addMessage]);

  return (
    <div className="min-h-screen relative">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Topbar */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center glow">
                <span className="text-white font-bold text-lg">DB</span>
              </div>
              <div>
                <h1 className="text-xl font-bold glow-text">DebugBOB</h1>
                <p className="text-xs text-gray-400">
                  {isDemoMode && <span className="text-cyan-400">Demo Mode</span>}
                  {!isDemoMode && bobStatus && (
                    <span className={bobStatus.enabled ? 'text-green-400' : 'text-amber-400'}>
                      {bobStatus.enabled ? '🤖 Bob IDE Active' : '⚠️ Simulated Mode'}
                    </span>
                  )}
                  {!isDemoMode && !bobStatus && <span>AI DevOps Assistant</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass px-4 py-2 rounded-lg">
              <span className="text-xs text-gray-400">Context</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      tokenPercentage > 80
                        ? 'bg-red-400 glow'
                        : tokenPercentage > 60
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-300">{tokenPercentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-[240px_1fr_240px] gap-6 h-[calc(100vh-140px)]">
          {/* Left Panel - Agent Status */}
          <div className="glass rounded-2xl p-5 overflow-y-auto animate-slide-up">
            <h2 className="text-sm font-semibold mb-4 text-gray-300 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow" />
              Agent Pipeline
            </h2>
            <div className="space-y-2">
              {Object.entries(agents).map(([name, status]) => (
                <div key={name} className="space-y-2">
                  <button
                    onClick={() => setExpandedAgent(expandedAgent === name ? null : name)}
                    className="w-full glass-hover rounded-lg px-3 py-2 flex items-center gap-3 group"
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-all ${
                        status === 'idle'
                          ? 'bg-gray-500'
                          : status === 'running'
                          ? 'bg-amber-400 animate-pulse glow'
                          : status === 'done'
                          ? 'bg-cyan-400 glow'
                          : 'bg-red-400 glow'
                      }`}
                    />
                    <span className="text-sm text-gray-200 flex-1 font-medium text-left">{name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      status === 'running' ? 'bg-amber-500/20 text-amber-300' :
                      status === 'done' ? 'bg-cyan-500/20 text-cyan-300' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {status}
                    </span>
                    {agentOutputs[name] && (
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedAgent === name ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Expanded agent output */}
                  {expandedAgent === name && agentOutputs[name] && (
                    <div className="glass rounded-lg p-3 ml-5 animate-slide-up">
                      <pre className="text-xs text-gray-300 overflow-x-auto">
                        {JSON.stringify(agentOutputs[name], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Panel - Chat */}
          <div className="glass rounded-2xl flex flex-col animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center mt-32">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center glow">
                    <span className="text-white font-bold text-3xl">DB</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-3 glow-text">
                    Welcome to DebugBOB
                  </h2>
                  <p className="text-gray-400">Paste your error logs or describe the deployment issue</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`animate-slide-up ${
                      msg.role === 'user'
                        ? 'ml-12'
                        : 'mr-12'
                    }`}
                  >
                    <div className={`glass-hover rounded-xl p-5 ${
                      msg.role === 'user' ? 'bg-cyan-500/5' : 'bg-white/5'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-gray-200">{msg.raw_input}</p>
                      ) : (
                        <div className="space-y-4">
                          {msg.content?.root_cause && (
                            <div>
                              <h3 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                                <div className="w-1 h-4 bg-cyan-400 rounded-full glow" />
                                Root Cause
                              </h3>
                              <p className="text-gray-200 leading-relaxed">
                                {msg.content.root_cause.root_cause}
                              </p>
                            </div>
                          )}
                        {msg.content?.fix_generator && (
                          <div>
                            <h3 className="text-sm font-semibold text-teal-400 mb-1">
                              Fix Commands
                            </h3>
                            <div className="space-y-2">
                              {msg.content.fix_generator.fixes[0]?.commands.map(
                                (cmd, i) => (
                                  <div
                                    key={i}
                                    className="bg-gray-900 rounded p-2 font-mono text-sm"
                                  >
                                    <code className="text-amber-400">
                                      {cmd.command}
                                    </code>
                                    <p className="text-gray-500 text-xs mt-1">
                                      {cmd.explanation}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-white/5 p-5">
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste error logs or describe the issue..."
                  className="flex-1 glass rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 resize-none focus:border-cyan-400/50 transition-all"
                  rows={3}
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all glow disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing
                    </span>
                  ) : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel - Metrics */}
          <div className="glass rounded-2xl p-5 overflow-y-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-sm font-semibold mb-4 text-gray-300 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow" />
              Session Metrics
            </h2>
            <div className="space-y-4">
              <div className="glass-hover rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-2">Token Usage</div>
                <div className="text-2xl font-bold text-cyan-400 glow-text">
                  {token_count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  of {token_budget.toLocaleString()}
                </div>
                <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      tokenPercentage > 80
                        ? 'bg-red-400 glow'
                        : tokenPercentage > 60
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                  />
                </div>
              </div>
              {memory_brief && (
                <div className="glass-hover rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-2">Platform</div>
                  <div className="text-sm font-medium text-gray-200">{memory_brief.platform || 'N/A'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
