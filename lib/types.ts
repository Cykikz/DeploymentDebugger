// DebugBOB Type Definitions
// Based on IMPLEMENTATION_PLAN.md and agent specifications

export type AgentName =
  | 'sanitizer'
  | 'orchestrator'
  | 'log_parser'
  | 'root_cause'
  | 'fix_generator'
  | 'cascade_predictor'
  | 'code_hygiene'
  | 'memory_agent'
  | 'output_compressor'
  | 'git_agent'
  | 'autonomy_engine'; // Phase 2

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export type AgentEvent = {
  agent: AgentName;
  status: AgentStatus;
  output?: Record<string, unknown>;
  tokens_used: number;
  timestamp: number;
};

export type RequestType =
  | 'deployment_failure'
  | 'runtime_error'
  | 'build_error'
  | 'dependency_issue'
  | 'config_conflict'
  | 'general_question';

export type SanitizerOutput =
  | { type: 'cleaned'; prompt: string }
  | { type: 'clarification'; question: string };

export type ErrorType =
  | 'missing_dependency'
  | 'env_var_missing'
  | 'port_conflict'
  | 'cors_error'
  | 'typescript_error'
  | 'build_command_error'
  | 'docker_error'
  | 'auth_error'
  | 'database_error'
  | 'runtime_crash'
  | 'unknown';

export type Platform =
  | 'vercel'
  | 'docker'
  | 'github_actions'
  | 'railway'
  | 'netlify'
  | 'local'
  | 'unknown';

export type LogParserOutput = {
  error_type: ErrorType;
  error_message: string;
  error_file: string | null;
  error_line: number | null;
  stack_trace: string[];
  platform: Platform;
  is_fatal: boolean;
  raw_excerpt: string[];
  confidence: number;
};

export type RootCauseOutput = {
  root_cause: string;
  cause_category: string;
  why_works_locally: string | null;
  contributing_factors: string[];
  confidence: number;
  needs_logs: boolean;
};

export type FixCommand = {
  command: string;
  explanation: string;
  requires_confirmation: boolean;
};

export type FileChange = {
  // Phase 2 addition - required for GitHub API writes
  path: string;
  operation: 'modify' | 'create' | 'delete';
  content: string;
};

export type FixApproach = {
  approach: string;
  confidence: number;
  commands: FixCommand[];
};

export type FixGeneratorOutput = {
  fixes: FixApproach[];
  estimated_resolution: string;
  rollback_commands: string[];
  file_changes: FileChange[]; // Phase 2 addition
};

export type CascadeRisk = {
  description: string;
  why: string;
  severity: 'high' | 'medium' | 'low';
  affected_file: string | null;
  prevention: string;
};

export type CascadePredictorOutput = {
  cascade_risks: CascadeRisk[];
  no_cascade_risk: boolean;
};

export type HygieneIssueType =
  | 'dead_code'
  | 'duplicate_logic'
  | 'conflicting_config'
  | 'stale_imports'
  | 'dev_only_in_prod';

export type HygieneIssue = {
  type: HygieneIssueType;
  description: string;
  file: string;
  line: number | null;
  severity: 'error' | 'warning' | 'info';
  fix: string;
};

export type CodeHygieneOutput = {
  issues: HygieneIssue[];
  clean: boolean;
  auto_fixable: number;
};

export type GitAgentOutput = {
  commit_message: string;
  suggested_tag: string;
  previous_tag: string;
  rollback_command: string;
  historical_match: string | null;
  auto_commit: boolean;
};

// Phase 2 - see 12-bob-autonomy.md for full spec
export type AutonomyDecision = {
  action: 'auto_apply' | 'open_pr' | 'notify_only' | 'hold';
  reason: string;
  confidence_gate_passed: boolean;
  cascade_gate_passed: boolean;
  human_message: string;
  rollback_armed: boolean;
  estimated_redeploy_minutes: number;
};

export type MemoryBrief = {
  platform: string | null;
  stack: string | null;
  files_modified: string[];
  errors_resolved: string[];
  fixes_applied: string[];
  open_issues: string[];
  hygiene_pending: string[];
  git_tags_created: string[];
  session_state: string;
  compressed_at_turn: number;
};

export type SessionContext = {
  platform: string | null;
  stack: string | null;
  prior_errors: string[];
  files_touched: string[];
};

export type OrchestratorPlan = {
  request_type: RequestType;
  has_logs: boolean;
  execution_order: AgentName[];
  parallel_agents?: AgentName[][];
  session_context: SessionContext;
  abort_if_no_logs: boolean;
  trigger_git_agent: boolean;
};

export type SessionState = {
  session_id: string;
  turn: number;
  trigger: 'manual' | 'vercel_webhook'; // Phase 2 addition
  agents: Record<AgentName, AgentStatus>;
  messages: ChatMessage[];
  memory_brief: MemoryBrief | null;
  files_touched: string[];
  token_count: number;
  token_budget: number;
  autonomy_level: 1 | 2 | 3; // Phase 2 addition
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  raw_input?: string;
  sanitized_input?: string;
  content: AssistantContent | null;
  timestamp: number;
};

export type AssistantContent = {
  agents_run: AgentName[];
  log_parser?: LogParserOutput;
  root_cause?: RootCauseOutput;
  fix_generator?: FixGeneratorOutput;
  cascade_predictor?: CascadePredictorOutput;
  code_hygiene?: CodeHygieneOutput;
  git_agent?: GitAgentOutput;
  autonomy_decision?: AutonomyDecision; // Phase 2 addition
};

// Utility types for API responses
export type PipelineResult = {
  success: boolean;
  content: AssistantContent;
  error?: string;
};

export type DeploymentData = {
  project: string;
  deployment_id: string;
  deployment_url: string;
  branch: string;
  commit_sha: string;
  owner: string;
  repo: string;
  error_logs: string;
};

// Made with Bob
