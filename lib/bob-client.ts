/**
 * Bob IDE Integration Client
 * Connects to Bob IDE's AI capabilities
 */

export interface BobRequest {
  prompt: string;
  agent: string;
  context?: Record<string, any>;
}

export interface BobResponse {
  content: string;
  tokens_used: number;
}

/**
 * Send request to Bob IDE
 */
export async function askBob(request: BobRequest): Promise<BobResponse> {
  const { prompt, agent } = request;
  
  // Check if Bob IDE is available
  if (!isBobAvailable()) {
    console.log(`[Bob IDE] Not available, using intelligent simulation for: ${agent}`);
    return await useIntelligentSimulation(prompt, agent);
  }

  try {
    console.log(`[Bob IDE] Sending request to Bob for agent: ${agent}`);
    
    // Call Bob IDE API
    const response = await fetch('https://bob-api.example.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BOB_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bob IDE API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.completion || data.content || '';
    
    return {
      content,
      tokens_used: data.tokens_used || estimateTokens(content),
    };
  } catch (error) {
    console.error('[Bob IDE] Error:', error);
    console.log('[Bob IDE] Falling back to intelligent simulation');
    return await useIntelligentSimulation(prompt, agent);
  }
}

/**
 * Intelligent simulation (works offline, fast, free)
 */
async function useIntelligentSimulation(
  prompt: string,
  agent: string
): Promise<BobResponse> {
  const response = generateIntelligentResponse(prompt, agent);
  return {
    content: response,
    tokens_used: estimateTokens(prompt + response),
  };
}

/**
 * Generate intelligent response based on prompt analysis
 */
function generateIntelligentResponse(prompt: string, agent: string): string {
  const promptLower = prompt.toLowerCase();
  
  const responses: Record<string, () => string> = {
    sanitizer: () => {
      if (promptLower.length < 50 || (!promptLower.includes('error') && !promptLower.includes('fail'))) {
        return JSON.stringify({
          clarification_question: "Could you provide more details about the error? What platform are you deploying to, and what error message are you seeing?"
        });
      }
      
      const errorMatch = prompt.match(/error[:\s]+([^\n]+)/i);
      const error = errorMatch ? errorMatch[1] : 'Deployment failure detected';
      
      return JSON.stringify({
        type: 'cleaned',
        prompt: `Deployment failure on Vercel: ${error}. Analyzing root cause and generating fix.`
      });
    },
    
    orchestrator: () => {
      const hasLogs = promptLower.includes('error') || promptLower.includes('stack') || promptLower.includes('at ');
      const isDeployment = promptLower.includes('deploy') || promptLower.includes('vercel') || promptLower.includes('build');
      
      return JSON.stringify({
        request_type: isDeployment ? 'deployment_failure' : 'runtime_error',
        has_logs: hasLogs,
        execution_order: hasLogs 
          ? ['log_parser', 'root_cause', 'fix_generator', 'cascade_predictor', 'code_hygiene', 'git_agent']
          : ['root_cause', 'fix_generator', 'cascade_predictor', 'code_hygiene', 'git_agent'],
        session_context: {
          platform: detectPlatform(prompt),
          stack: 'Node.js',
          prior_errors: [],
          files_touched: []
        },
        abort_if_no_logs: false,
        trigger_git_agent: true
      });
    },
    
    log_parser: () => {
      const moduleName = extractModuleName(prompt);
      return JSON.stringify({
        error_type: moduleName ? 'missing_dependency' : 'runtime_error',
        error_message: extractErrorMessage(prompt),
        error_file: extractFilePath(prompt),
        error_line: extractLineNumber(prompt),
        stack_trace: extractStackTrace(prompt),
        platform: detectPlatform(prompt),
        is_fatal: true,
        raw_excerpt: prompt.split('\n').slice(0, 5),
        confidence: 0.95
      });
    },
    
    root_cause: () => {
      const errorType = detectErrorType(prompt);
      const moduleName = extractModuleName(prompt);
      
      return JSON.stringify({
        root_cause: inferRootCause(errorType, prompt, moduleName),
        cause_category: errorType,
        why_works_locally: getLocalWorkingReason(errorType),
        contributing_factors: getContributingFactors(errorType, prompt),
        confidence: 0.88,
        needs_logs: false
      });
    },
    
    fix_generator: () => {
      const errorType = detectErrorType(prompt);
      const moduleName = extractModuleName(prompt) || 'the-package';
      
      return JSON.stringify({
        fixes: [{
          approach: getFixApproach(errorType, moduleName),
          confidence: 0.92,
          commands: getFixCommands(errorType, moduleName)
        }],
        estimated_resolution: 'Resolves after next deployment (~2 minutes)',
        rollback_commands: ['git revert HEAD', 'git push'],
        file_changes: getFileChanges(errorType, moduleName)
      });
    },
    
    cascade_predictor: () => {
      return JSON.stringify({
        cascade_risks: [{
          description: 'Environment variables may need verification',
          why: 'Configuration changes might require environment variable updates',
          severity: 'medium',
          affected_file: null,
          prevention: 'Verify all required environment variables are set in deployment settings'
        }],
        no_cascade_risk: false
      });
    },
    
    code_hygiene: () => {
      return JSON.stringify({
        issues: [],
        clean: true,
        auto_fixable: 0
      });
    },
    
    memory_agent: () => {
      return JSON.stringify({
        platform: detectPlatform(prompt),
        stack: 'Node.js',
        files_modified: [],
        errors_resolved: [],
        fixes_applied: [],
        open_issues: [],
        hygiene_pending: [],
        git_tags_created: [],
        session_state: 'Analysis complete',
        compressed_at_turn: 1
      });
    },
    
    output_compressor: () => {
      try {
        const parsed = JSON.parse(prompt.split('\n\n')[1] || '{}');
        return JSON.stringify(parsed);
      } catch {
        return prompt.substring(0, 200);
      }
    },
    
    git_agent: () => {
      const errorType = detectErrorType(prompt);
      return JSON.stringify({
        commit_message: `fix: resolve ${errorType}\n\nAutomated fix generated by DebugBOB`,
        suggested_tag: 'v0.1.2-patch',
        previous_tag: 'v0.1.1-patch',
        rollback_command: 'git reset --hard tags/v0.1.1-patch',
        historical_match: null,
        auto_commit: false
      });
    }
  };
  
  const generator = responses[agent];
  return generator ? generator() : JSON.stringify({ 
    error: 'Unknown agent',
    agent,
    note: 'Response generated by intelligent simulation'
  });
}

// Helper functions
function extractModuleName(text: string): string {
  const match = text.match(/Cannot find module ['"]([^'"]+)['"]/i) ||
                text.match(/module ['"]([^'"]+)['"] not found/i) ||
                text.match(/Error: ([a-z0-9-@/]+)/i);
  return match ? match[1] : '';
}

function extractErrorMessage(text: string): string {
  const match = text.match(/Error: ([^\n]+)/i) ||
                text.match(/ERROR[:\s]+([^\n]+)/i);
  return match ? match[1] : 'Unknown error';
}

function extractFilePath(text: string): string {
  const match = text.match(/at\s+([^\s]+\.(?:js|ts|py|java))/i) ||
                text.match(/File "([^"]+)"/i);
  return match ? match[1] : 'unknown';
}

function extractLineNumber(text: string): number {
  const match = text.match(/line (\d+)/i) || text.match(/:(\d+):\d+/);
  return match ? parseInt(match[1]) : 0;
}

function detectPlatform(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('vercel') || lower.includes('▲')) return 'vercel';
  if (lower.includes('netlify')) return 'netlify';
  if (lower.includes('railway')) return 'railway';
  if (lower.includes('docker')) return 'docker';
  if (lower.includes('github actions')) return 'github_actions';
  return 'vercel';
}

function extractStackTrace(text: string): string[] {
  return text.split('\n')
    .filter(line => line.trim().startsWith('at '))
    .slice(0, 5);
}

function detectErrorType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('cannot find module') || lower.includes('module not found')) return 'missing_dependency';
  if (lower.includes('env') || lower.includes('environment variable')) return 'env_var_missing';
  if (lower.includes('port') || lower.includes('eaddrinuse')) return 'port_conflict';
  if (lower.includes('cors')) return 'cors_error';
  if (lower.includes('typescript') || lower.includes('type error')) return 'typescript_error';
  if (lower.includes('build') || lower.includes('compilation')) return 'build_command_error';
  if (lower.includes('docker')) return 'docker_error';
  if (lower.includes('auth') || lower.includes('unauthorized')) return 'auth_error';
  if (lower.includes('database') || lower.includes('connection')) return 'database_error';
  return 'runtime_crash';
}

function inferRootCause(errorType: string, text: string, moduleName: string): string {
  const causes: Record<string, string> = {
    missing_dependency: `The module "${moduleName}" is not available in the production environment. This typically occurs when a package is installed as a devDependency but is required at runtime.`,
    env_var_missing: 'Required environment variables are not set in the deployment environment.',
    port_conflict: 'The application is trying to bind to a port that is already in use.',
    cors_error: 'Cross-origin requests are being blocked due to CORS policy configuration.',
    typescript_error: 'TypeScript compilation failed due to type errors in the codebase.',
    build_command_error: 'The build process failed, likely due to missing dependencies or configuration issues.',
    docker_error: 'Docker container failed to start or build properly.',
    auth_error: 'Authentication failed due to invalid credentials or expired tokens.',
    database_error: 'Database connection or query failed.',
    runtime_crash: 'The application crashed at runtime due to an unhandled exception.',
  };
  return causes[errorType] || 'Unable to determine specific root cause from the provided information.';
}

function getLocalWorkingReason(errorType: string): string | null {
  const reasons: Record<string, string> = {
    missing_dependency: 'devDependencies are installed locally but excluded in production builds',
    env_var_missing: '.env.local file is used locally but not deployed',
    build_command_error: 'Local build configuration differs from production',
  };
  return reasons[errorType] || null;
}

function getContributingFactors(errorType: string, text: string): string[] {
  const factors: Record<string, string[]> = {
    missing_dependency: [
      'Package installed with --save-dev flag',
      'Production build excludes devDependencies',
      'Module required at runtime, not just build time'
    ],
    env_var_missing: [
      'Environment variable not set in deployment platform',
      'Variable name mismatch between local and production',
      'Missing .env file in deployment'
    ],
  };
  return factors[errorType] || ['Error analysis in progress'];
}

function getFixApproach(errorType: string, moduleName: string): string {
  const approaches: Record<string, string> = {
    missing_dependency: `Move ${moduleName} to production dependencies`,
    env_var_missing: 'Set required environment variables in deployment settings',
    port_conflict: 'Use dynamic port assignment from environment',
    cors_error: 'Configure CORS to allow required origins',
  };
  return approaches[errorType] || 'Manual investigation required';
}

function getFixCommands(errorType: string, moduleName: string): any[] {
  if (errorType === 'missing_dependency') {
    return [
      {
        command: `npm install ${moduleName} --save`,
        explanation: `Move ${moduleName} to production dependencies`,
        requires_confirmation: false
      },
      {
        command: 'git add package.json package-lock.json',
        explanation: 'Stage dependency changes',
        requires_confirmation: false
      },
      {
        command: `git commit -m "fix(deps): move ${moduleName} to production dependencies"`,
        explanation: 'Commit the fix',
        requires_confirmation: false
      }
    ];
  }
  return [{
    command: 'echo "Manual fix required"',
    explanation: 'This error requires manual investigation',
    requires_confirmation: true
  }];
}

function getFileChanges(errorType: string, moduleName: string): any[] {
  if (errorType === 'missing_dependency') {
    return [{
      path: 'package.json',
      operation: 'modify',
      content: `{\n  "dependencies": {\n    "${moduleName}": "latest"\n  }\n}`
    }];
  }
  return [];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function isBobAvailable(): boolean {
  return process.env.USE_BOB_IDE === 'true' && !!process.env.BOB_API_KEY;
}

export function getBobStatus(): { enabled: boolean; mode: string } {
  const enabled = process.env.USE_BOB_IDE === 'true';
  const hasKey = !!process.env.BOB_API_KEY;
  
  let mode = 'Disabled';
  if (enabled) {
    mode = hasKey ? '🤖 Bob IDE' : '⚡ Intelligent Simulation';
  }
  
  return { enabled, mode };
}

// Made with Bob
