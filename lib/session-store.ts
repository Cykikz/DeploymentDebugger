// Session Store
// Zustand-based state management for DebugBOB sessions
// Based on: IMPLEMENTATION_PLAN.md Phase 5

import { create } from 'zustand';
import type {
  SessionState,
  AgentName,
  AgentStatus,
  ChatMessage,
  MemoryBrief,
} from './types';

interface SessionActions {
  updateAgentStatus: (agent: AgentName, status: AgentStatus) => void;
  addMessage: (message: ChatMessage) => void;
  setMemoryBrief: (brief: MemoryBrief) => void;
  incrementTokens: (count: number) => void;
  addFileTouched: (file: string) => void;
  resetSession: () => void;
  setTrigger: (trigger: 'manual' | 'vercel_webhook') => void;
}

const initialState: SessionState = {
  session_id: crypto.randomUUID(),
  turn: 0,
  trigger: 'manual',
  agents: {
    sanitizer: 'idle',
    orchestrator: 'idle',
    log_parser: 'idle',
    root_cause: 'idle',
    fix_generator: 'idle',
    cascade_predictor: 'idle',
    code_hygiene: 'idle',
    memory_agent: 'idle',
    output_compressor: 'idle',
    git_agent: 'idle',
    autonomy_engine: 'idle',
  },
  messages: [],
  memory_brief: null,
  files_touched: [],
  token_count: 0,
  token_budget: 100000,
  autonomy_level: 2, // Default to PR mode
};

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  ...initialState,

  updateAgentStatus: (agent, status) =>
    set((state) => ({
      agents: { ...state.agents, [agent]: status },
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      turn: state.turn + 1,
    })),

  setMemoryBrief: (brief) =>
    set({ memory_brief: brief }),

  incrementTokens: (count) =>
    set((state) => ({
      token_count: state.token_count + count,
    })),

  addFileTouched: (file) =>
    set((state) => ({
      files_touched: state.files_touched.includes(file)
        ? state.files_touched
        : [...state.files_touched, file],
    })),

  resetSession: () =>
    set({
      ...initialState,
      session_id: crypto.randomUUID(),
    }),

  setTrigger: (trigger) =>
    set({ trigger }),
}));

// Selectors for optimized re-renders
export const selectAgentStatus = (agent: AgentName) => (state: SessionState & SessionActions) =>
  state.agents[agent];

export const selectTokenPercentage = (state: SessionState & SessionActions) =>
  (state.token_count / state.token_budget) * 100;

export const selectIsMemoryCompressed = (state: SessionState & SessionActions) =>
  state.memory_brief !== null;

export const selectLastMessage = (state: SessionState & SessionActions) =>
  state.messages[state.messages.length - 1];

// Helper to get agent status color
export function getAgentStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'idle':
      return 'text-gray-400';
    case 'running':
      return 'text-amber-500';
    case 'done':
      return 'text-teal-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-400';
  }
}

// Helper to get agent status label
export function getAgentStatusLabel(status: AgentStatus): string {
  switch (status) {
    case 'idle':
      return 'idle';
    case 'running':
      return 'running...';
    case 'done':
      return 'done';
    case 'error':
      return 'failed';
    default:
      return 'idle';
  }
}

// Made with Bob
