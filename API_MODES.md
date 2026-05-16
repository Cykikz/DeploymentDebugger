# 🤖 DebugBOB API Modes Explained

## Current Status: Intelligent Simulation Mode ⚡

Your system is currently using **Intelligent Simulation** - it analyzes your error prompts and generates appropriate responses, but it's not calling an actual AI API.

## 3 Available Modes

### 1. 🤖 Real Bob IDE API (Recommended)
**Status**: Not configured
**What it does**: Calls Bob's actual AI reasoning engine
**How to enable**:
```bash
# In .env.local:
BOB_API_KEY=your_bob_api_key_here
BOB_API_ENDPOINT=https://bob-api.example.com/v1/chat
```

**Pros**:
- Real AI reasoning from Bob
- Access to your codebase context
- Most accurate responses

**Cons**:
- Requires Bob API access (may not be publicly available yet)
- Need API credentials

---

### 2. 🧠 Claude API (Anthropic)
**Status**: Not configured
**What it does**: Uses Claude AI (same as Bob uses internally)
**How to enable**:
```bash
# In .env.local:
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Pros**:
- Real AI reasoning
- Publicly available API
- High quality responses
- Accurate token counting

**Cons**:
- Costs money ($0.003 per 1K input tokens, $0.015 per 1K output tokens)
- No access to your codebase context
- Requires API key from https://console.anthropic.com

---

### 3. ⚡ Intelligent Simulation (Current)
**Status**: ✅ Active
**What it does**: Analyzes your prompts and generates structured responses
**How it works**:
- Extracts error messages from your input
- Detects platforms (Vercel, Netlify, etc.)
- Identifies error types (missing dependencies, env vars, etc.)
- Generates appropriate fixes based on patterns

**Pros**:
- ✅ No API key needed
- ✅ No costs
- ✅ Fast responses
- ✅ Works offline
- ✅ Good for testing and development

**Cons**:
- ❌ Not actual AI reasoning
- ❌ Pattern-based, not learning
- ❌ May miss edge cases
- ❌ Responses are deterministic

---

## How to Choose

### Use Real Bob API if:
- You have Bob API access
- You want the best possible results
- You need codebase context awareness

### Use Claude API if:
- You don't have Bob API access
- You want real AI reasoning
- You're okay with API costs (~$0.01-0.05 per debug session)
- You need accurate, varied responses

### Use Intelligent Simulation if:
- You're testing/developing
- You don't want to pay for API calls
- You're working with common error patterns
- You want instant responses

---

## Current Mode Detection

The system automatically detects which mode to use:

```typescript
Priority Order:
1. Bob API (if BOB_API_KEY + BOB_API_ENDPOINT set)
2. Claude API (if ANTHROPIC_API_KEY set)
3. Intelligent Simulation (fallback)
```

**Your current setup**:
- ❌ BOB_API_KEY: Not set
- ❌ ANTHROPIC_API_KEY: Not set
- ✅ Intelligent Simulation: Active

---

## How to Enable Claude API (Recommended for Real AI)

### Step 1: Get API Key
1. Go to https://console.anthropic.com
2. Sign up / Log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### Step 2: Add to Environment
```bash
# In .env.local:
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### Step 3: Restart Server
```bash
npm run dev
```

### Step 4: Verify
- Header should show: **"🧠 Claude API Active"**
- Console should show: `[Anthropic API] Using Claude for agent: sanitizer`
- Responses will be real AI reasoning

---

## Cost Estimation (Claude API)

**Per Debug Session**:
- Input: ~2,000-3,000 tokens ($0.006-0.009)
- Output: ~1,500-2,500 tokens ($0.023-0.038)
- **Total: ~$0.03-0.05 per session**

**Monthly (100 sessions)**:
- ~$3-5 per month

**Note**: Intelligent Simulation is free but not actual AI.

---

## Response Quality Comparison

### Intelligent Simulation (Current)
```json
{
  "root_cause": "axios was installed with --save-dev flag...",
  "confidence": 0.92
}
```
✅ Structured and correct for common patterns
❌ Same response every time
❌ No learning or adaptation

### Claude API (Real AI)
```json
{
  "root_cause": "The issue stems from axios being incorrectly categorized as a development dependency. When Vercel builds for production, it excludes devDependencies to optimize bundle size. Since your API client requires axios at runtime, not just during development, this causes the module not found error in the deployed environment...",
  "confidence": 0.94
}
```
✅ Natural language reasoning
✅ Contextual understanding
✅ Varied responses based on nuance

---

## Recommendation

**For Development/Testing**: Keep Intelligent Simulation (current setup)
**For Production/Real Use**: Add Claude API key

The intelligent simulation is actually quite good for common errors! It correctly:
- Identifies missing dependencies
- Detects platform issues
- Generates proper fix commands
- Predicts cascade failures

But if you want **real AI reasoning** that can handle edge cases and provide deeper insights, add the Claude API key.

---

## Status Indicator

The UI header shows which mode is active:

- **"🤖 Bob IDE API Active"** = Using real Bob
- **"🧠 Claude API Active"** = Using Claude AI
- **"⚡ Intelligent Simulation"** = Using pattern matching (current)

---

**Made with Bob** 🤖