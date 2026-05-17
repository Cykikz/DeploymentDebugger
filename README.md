# DebugBOB

> AI-powered autonomous DevOps debugging agent. Paste a broken log → 10 agents analyze, fix, commit, and redeploy. Zero terminal required.

##  What It Does

DebugBOB runs a 10-agent pipeline that automatically diagnoses and fixes deployment failures:

1. **Prompt Sanitizer** — Cleans user input, handles grammar/language barriers
2. **Orchestrator** — Routes tasks to appropriate agents
3. **Log Parser** — Extracts structured error data from raw logs
4. **Root Cause** — Determines WHY the error occurred
5. **Fix Generator** — Creates exact, runnable fix commands
6. **Cascade Predictor** — Predicts what will break NEXT after the fix
7. **Code Hygiene** — Finds dead code, stale imports, conflicts
8. **Memory Agent** — Compresses session history to prevent context bloat
9. **Output Compressor** — Strips verbose output between agents
10. **Git Agent** — Writes commit messages, creates version tags

##  Quick Start

### Prerequisites

- Node.js 18+ or pnpm
- Anthropic API key ([get one here](https://console.anthropic.com/keys))
- GitHub Personal Access Token (for Git operations)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd debugbob

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Add your API keys to .env.local
# ANTHROPIC_API_KEY=your_key_here
# GITHUB_TOKEN=your_token_here
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

##  Project Structure

```
debugbob/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── pipeline/
│   │       └── stream/route.ts   # SSE endpoint for real-time agent updates
│   ├── layout.tsx
│   └── page.tsx
├── lib/                          # Core logic
│   ├── agents/                   # All 10 AI agents
│   │   ├── 01-sanitizer.ts
│   │   ├── 02-orchestrator.ts
│   │   ├── 03-log-parser.ts
│   │   ├── 04-root-cause.ts
│   │   ├── 05-fix-generator.ts
│   │   ├── 06-cascade-predictor.ts
│   │   ├── 07-code-hygiene.ts
│   │   ├── 08-memory-agent.ts
│   │   ├── 09-output-compressor.ts
│   │   ├── 10-git-agent.ts
│   │   └── index.ts
│   ├── pipeline.ts               # Orchestrates all agents
│   ├── session-store.ts          # Zustand state management
│   └── types.ts                  # TypeScript definitions
├── components/                   # React components (to be built)
│   ├── layout/
│   ├── chat/
│   ├── sidebar/
│   └── metrics/
└── .env.example                  # Environment variables template
```

##  Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

```bash
# Required
ANTHROPIC_API_KEY=              # Claude API key
GITHUB_TOKEN=                   # For git operations

# Optional
DEMO_MODE=false                 # Use pre-recorded session
DEBUGBOB_AUTONOMY_LEVEL=2       # 1=notify | 2=PR | 3=auto
```

##  Architecture

### Multi-Agent Pipeline

```
[User Input] → Sanitizer → Orchestrator → Log Parser → Root Cause
                                              ↓
                                         Fix Generator
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                            Cascade Predictor    Code Hygiene
                                    ↓                   ↓
                                    └─────────┬─────────┘
                                              ↓
                                         Git Agent
                                              ↓
                                      (Memory Agent if needed)
```

### Token Optimization

- **Output Compressor** runs between every agent (max 200 tokens)
- **Memory Agent** compresses at 60% token budget threshold
- Total budget: 100,000 tokens per session

### Real-Time Streaming

- Server-Sent Events (SSE) for live agent status updates
- Each agent emits events as it runs
- Frontend updates in real-time

##  Testing

```bash
# Type check
pnpm tsc --noEmit

# Build
pnpm build

# Start production server
pnpm start
```

##  Token Budget

| Agent | Tokens | Purpose |
|-------|--------|---------|
| Sanitizer | ~350 | Clean input |
| Orchestrator | ~670 | Plan execution |
| Log Parser | ~1160 | Extract errors |
| Root Cause | ~630 | Analyze why |
| Fix Generator | ~640 | Create solution |
| Cascade Predictor | ~580 | Predict next failure |
| Code Hygiene | ~540 | Find issues |
| Memory Agent | ~4600 | Compress history |
| Output Compressor | ~900 | Strip verbose output |
| Git Agent | ~770 | Version control |

**Total per run:** ~6,000-10,000 tokens (depending on which agents fire)

##  Security

- Never commit `.env.local` (it's gitignored)
- API keys are server-side only
- No sensitive data in client-side code

##  Roadmap

### Phase 1 (Current)
- ✅ All 10 agents implemented
- ✅ Pipeline runner with token optimization
- ✅ SSE API for real-time updates
- ✅ Session store with Zustand
- 🚧 Frontend components
- 🚧 Demo mode

### Phase 2 (Future)
- Vercel webhook integration
- GitHub App for auto-apply
- Autonomy Engine (Agent 12)
- Post-deploy validation
- Rollback handler

##  License

MIT

##  Contributing

Contributions welcome! Please read the agent specifications in the markdown files before making changes.

---

Built using Next.js, TypeScript, Anthropic Claude, and Zustand
