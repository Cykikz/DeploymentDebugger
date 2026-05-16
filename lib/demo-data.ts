// Demo mode - pre-recorded session data for testing UI without API calls

export const DEMO_SESSION = {
  raw_input: "Vercel deployment failed after pushing to main. Error: Cannot find module 'axios'. Works fine locally.",
  
  agents: [
    {
      name: 'sanitizer',
      duration: 850,
      output: {
        cleaned_input: "Vercel deployment failure: Cannot find module 'axios' in production, works locally",
        platform: 'vercel',
        error_type: 'module_not_found',
        confidence: 0.95
      }
    },
    {
      name: 'orchestrator',
      duration: 1200,
      output: {
        route: 'deployment_error',
        requires_agents: ['log_parser', 'root_cause', 'fix_generator', 'cascade_predictor', 'code_hygiene'],
        reasoning: 'Module missing in production but present locally suggests dependency configuration issue'
      }
    },
    {
      name: 'log_parser',
      duration: 1500,
      output: {
        error_type: 'MODULE_NOT_FOUND',
        module_name: 'axios',
        file_path: '/var/task/api/client.js',
        line_number: 3,
        stack_trace: [
          'at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1039:15)',
          'at Function.Module._load (node:internal/modules/cjs/loader:885:27)',
          'at Module.require (node:internal/modules/cjs/loader:1105:19)'
        ],
        platform_context: {
          platform: 'vercel',
          node_version: '18.x',
          build_command: 'npm run build',
          environment: 'production'
        }
      }
    },
    {
      name: 'root_cause',
      duration: 2100,
      output: {
        root_cause: "axios was installed with --save-dev flag, placing it in devDependencies. Vercel production builds exclude devDependencies by default, so the module is present in local node_modules but missing in the deployed environment.",
        confidence: 0.92,
        evidence: [
          'Module works locally (devDependencies installed)',
          'Fails in Vercel production (devDependencies excluded)',
          'Error occurs at runtime, not build time'
        ],
        category: 'dependency_misconfiguration'
      }
    },
    {
      name: 'fix_generator',
      duration: 2400,
      output: {
        fixes: [
          {
            commands: [
              {
                command: 'npm install axios --save',
                explanation: 'Move axios from devDependencies to dependencies',
                order: 1
              },
              {
                command: 'git add package.json package-lock.json',
                explanation: 'Stage the dependency changes',
                order: 2
              },
              {
                command: 'git commit -m "fix(deps): move axios to production dependencies"',
                explanation: 'Commit with conventional commit format',
                order: 3
              },
              {
                command: 'git push origin main',
                explanation: 'Deploy the fix to trigger Vercel rebuild',
                order: 4
              }
            ],
            confidence: 0.94,
            estimated_time_minutes: 2,
            rollback_command: 'npm install axios --save-dev && git checkout package.json package-lock.json'
          }
        ],
        file_changes: [
          {
            path: 'package.json',
            operation: 'modify' as const,
            content: '{\n  "dependencies": {\n    "axios": "^1.6.0"\n  }\n}'
          }
        ]
      }
    },
    {
      name: 'cascade_predictor',
      duration: 1800,
      output: {
        cascade_risks: [
          {
            description: 'API_KEY environment variable is referenced in api/client.js but may not be set in Vercel dashboard',
            severity: 'medium' as const,
            likelihood: 0.65,
            prevention: 'Verify API_KEY is set in Vercel Project Settings → Environment Variables before deploying',
            affected_files: ['api/client.js']
          }
        ],
        next_likely_failure: 'Environment variable missing after axios fix is deployed',
        confidence: 0.71
      }
    },
    {
      name: 'code_hygiene',
      duration: 1600,
      output: {
        issues: [
          {
            type: 'unused_import',
            file: 'api/client.js',
            line: 5,
            description: 'lodash imported but never used',
            severity: 'warning' as const,
            fix: 'Remove unused import'
          }
        ],
        files_analyzed: ['api/client.js', 'api/utils.js'],
        conflicts_detected: []
      }
    },
    {
      name: 'git_agent',
      duration: 1100,
      output: {
        commit_message: 'fix(deps): move axios to production dependencies\n\n- axios was installed with --save-dev, excluding it from Vercel production builds\n- Moved to dependencies with npm install axios --save\n- Triggered by Cannot find module \'axios\' at runtime',
        suggested_tag: 'v0.1.2-patch',
        previous_tag: 'v0.1.1-patch',
        rollback_command: 'git reset --hard tags/v0.1.1-patch',
        historical_match: null,
        auto_commit: true
      }
    }
  ],
  
  total_tokens: 6420,
  session_id: 'demo-session-001',
  timestamp: Date.now()
};

export const DEMO_MESSAGES = [
  {
    role: 'user' as const,
    content: DEMO_SESSION.raw_input,
    timestamp: Date.now() - 15000
  },
  {
    role: 'assistant' as const,
    content: '**Root Cause Analysis**\n\naxios was installed with --save-dev flag, placing it in devDependencies. Vercel production builds exclude devDependencies by default, so the module is present in local node_modules but missing in the deployed environment.\n\n**Confidence:** 92%',
    timestamp: Date.now() - 10000
  },
  {
    role: 'assistant' as const,
    content: '**Fix Commands**\n\n```bash\nnpm install axios --save\ngit add package.json package-lock.json\ngit commit -m "fix(deps): move axios to production dependencies"\ngit push origin main\n```\n\n**Estimated Time:** 2 minutes\n**Confidence:** 94%',
    timestamp: Date.now() - 8000
  },
  {
    role: 'assistant' as const,
    content: '**⚠️ Cascade Warning**\n\nAPI_KEY environment variable is referenced in api/client.js but may not be set in Vercel dashboard.\n\n**Prevention:** Verify API_KEY is set in Vercel Project Settings → Environment Variables before deploying.\n\n**Severity:** Medium (65% likelihood)',
    timestamp: Date.now() - 6000
  }
];

// Made with Bob
