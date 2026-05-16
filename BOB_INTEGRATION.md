# Bob IDE Integration Architecture

## Current vs Target Architecture

### Current (What's Implemented)
```
User Input → API Route → Anthropic API Call → Agent Response → UI
```

### Target (Bob IDE Integration)
```
User Input → API Route → Bob IDE Tool Use → Agent Response → UI
```

## How Bob IDE Integration Works

Instead of calling external Anthropic API, the system uses **Bob's tool use capabilities** within the IDE.

### Key Concept
The 10 agents become **structured prompts** that Bob (the AI IDE) processes using its built-in reasoning capabilities.

## Implementation Strategy

### 1. Replace API Calls with Bob Tool Use

**Current agent file structure:**
```typescript
// lib/agents/04-root-cause.ts
export async function runRootCause(input: string) {
  const response = await fetch('https://api.anthropic.com/...', {
    // External API call
  });
  return response.json();
}
```

**New Bob-integrated structure:**
```typescript
// lib/agents/04-root-cause.ts
export async function runRootCause(input: string) {
  // Use Bob's IDE capabilities instead
  const prompt = buildRootCausePrompt(input);
  
  // Bob processes this through the IDE's AI
  const response = await askBob(prompt);
  
  return parseResponse(response);
}
```

### 2. Create Bob Communication Layer

```typescript
// lib/bob-integration.ts

/**
 * Communicates with Bob (AI IDE) instead of external API
 */
export async function askBob(prompt: string, agentContext: AgentContext) {
  // This would integrate with the IDE's AI capabilities
  // The exact implementation depends on the IDE's API
  
  return {
    // Bob's response in the expected format
  };
}
```

### 3. Agent Prompts as Templates

Each agent becomes a **prompt template** that Bob processes:

```typescript
// lib/prompts/root-cause-prompt.ts

export function buildRootCausePrompt(input: LogParserOutput) {
  return `
You are the Root Cause Analysis agent in the DebugBOB system.

Your task: Determine WHY this error occurred, not just what it says.

Input:
${JSON.stringify(input, null, 2)}

Analyze:
1. Why does this work locally but fail in production?
2. What configuration difference causes this?
3. What are the contributing factors?

Output format (JSON):
{
  "root_cause": "string",
  "cause_category": "string",
  "why_works_locally": "string",
  "contributing_factors": ["string"],
  "confidence": number,
  "needs_logs": boolean
}
`;
}
```

### 4. Pipeline Orchestration

The pipeline stays the same, but uses Bob instead of API:

```typescript
// lib/pipeline.ts

export async function runPipeline(input: string) {
  // 1. Sanitizer
  const sanitized = await askBob(
    buildSanitizerPrompt(input),
    { agent: 'sanitizer' }
  );
  
  // 2. Orchestrator
  const route = await askBob(
    buildOrchestratorPrompt(sanitized),
    { agent: 'orchestrator' }
  );
  
  // 3-10. Continue with other agents...
  // All using Bob instead of external API
}
```

## Benefits of Bob Integration

1. **No External API Costs** - Uses IDE's built-in AI
2. **Faster Response** - No network latency
3. **Privacy** - Data stays in the IDE
4. **Offline Capable** - Works without internet
5. **Consistent Context** - Bob already knows your codebase

## Implementation Steps

### Phase 1: Create Bob Communication Layer
- [ ] Build `lib/bob-integration.ts`
- [ ] Define Bob API interface
- [ ] Test basic communication

### Phase 2: Convert Agents to Prompts
- [ ] Extract agent logic into prompt templates
- [ ] Move to `lib/prompts/` directory
- [ ] Ensure output format consistency

### Phase 3: Update Pipeline
- [ ] Replace Anthropic calls with Bob calls
- [ ] Maintain SSE streaming
- [ ] Keep token tracking

### Phase 4: Testing
- [ ] Test each agent individually
- [ ] Test full pipeline
- [ ] Verify UI updates correctly

## Technical Considerations

### Bob IDE API
The exact API for communicating with Bob depends on the IDE implementation. Possible approaches:

1. **Tool Use API** - Bob has tool use capabilities
2. **Extension API** - IDE provides extension hooks
3. **IPC Communication** - Inter-process communication
4. **WebSocket** - Real-time bidirectional communication

### Token Management
Bob still needs token tracking for:
- Context window management
- Memory compression triggers
- Session budget enforcement

### Error Handling
- Fallback to demo mode if Bob unavailable
- Graceful degradation
- Clear error messages

## Migration Path

### Step 1: Dual Mode
Support both Anthropic API and Bob:
```typescript
const USE_BOB = process.env.USE_BOB_IDE === 'true';

if (USE_BOB) {
  response = await askBob(prompt);
} else {
  response = await callAnthropicAPI(prompt);
}
```

### Step 2: Gradual Migration
- Start with one agent (Sanitizer)
- Test thoroughly
- Migrate remaining agents
- Remove Anthropic dependency

### Step 3: Full Bob Integration
- Remove Anthropic API code
- Update documentation
- Simplify environment setup

## Current Status

✅ **UI Complete** - Glassmorphic interface ready
✅ **Agent Logic** - All 10 agents implemented
✅ **Pipeline** - Orchestration working
⏳ **Bob Integration** - Architecture defined, needs implementation

## Next Steps

1. **Clarify Bob IDE API** - Understand how to communicate with Bob
2. **Build Integration Layer** - Create `bob-integration.ts`
3. **Convert First Agent** - Start with Sanitizer
4. **Test & Iterate** - Ensure it works correctly
5. **Migrate Remaining** - Convert all 10 agents

---

**The system is ready for Bob integration. The UI and structure are perfect - we just need to swap the AI engine from "external API" to "Bob IDE".**