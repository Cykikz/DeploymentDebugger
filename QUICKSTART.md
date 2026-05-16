# DebugBOB Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your keys
```

**Required variables:**
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Get from https://console.anthropic.com/keys
GITHUB_TOKEN=ghp_...          # Get from https://github.com/settings/tokens
```

### Step 3: Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 4: Test the System

**Option A: Use the UI**
1. Paste an error log in the input box
2. Watch the agents run in real-time (left sidebar)
3. See the fix commands appear

**Option B: Test the API directly**
```bash
curl -X POST http://localhost:3000/api/pipeline/stream \
  -H "Content-Type: application/json" \
  -d '{
    "raw_input": "vercel deploy fail after push but local working",
    "session_memory": null,
    "messages": [],
    "current_turn": 0
  }'
```

---

## 📝 Example Error Logs to Try

### 1. Missing Dependency
```
Error: Cannot find module 'axios'
Require stack:
- /var/task/api/client.js
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1039:15)
```

### 2. Environment Variable Missing
```
Error: API_KEY is not defined
    at Object.<anonymous> (/app/config.js:12:15)
```

### 3. Port Conflict
```
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1740:16)
```

### 4. CORS Error
```
Access to fetch at 'https://api.example.com/data' from origin 'https://myapp.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

---

## 🎯 What to Expect

When you submit an error, you'll see:

1. **Agent Pipeline (Left Sidebar)**
   - Dots change color as agents run
   - Gray → Amber (running) → Teal (done)

2. **Chat Area (Center)**
   - Your input appears
   - Root cause analysis
   - Fix commands with explanations
   - Cascade warnings (what might break next)

3. **Metrics (Right Sidebar)**
   - Token usage percentage
   - Session information
   - Memory compression status

---

## 🔧 Troubleshooting

### "Failed to process request"
- Check that `ANTHROPIC_API_KEY` is set in `.env.local`
- Verify the API key is valid

### Agents stuck on "running"
- Check browser console for errors
- Verify the API endpoint is accessible
- Check that all dependencies are installed

### TypeScript errors
```bash
pnpm tsc --noEmit
```

### Build errors
```bash
# Clean and rebuild
rm -rf .next
pnpm build
```

---

## 📊 Understanding the Output

### Root Cause
The "why" behind the error, not just what it says.

**Example:**
> "axios was installed with --save-dev, placing it in devDependencies. Production builds exclude devDependencies, so the module is present locally but missing in the Vercel deployment."

### Fix Commands
Exact, runnable commands in the correct order.

**Example:**
```bash
npm install axios --save
git add package.json package-lock.json
git commit -m "fix: move axios to production dependencies"
git push
```

### Cascade Predictions
What will likely break NEXT after this fix.

**Example:**
> "API_KEY is referenced in api/client.js but is not set as an environment variable in the Vercel dashboard."

---

## 🎨 Customization

### Change Autonomy Level
In `.env.local`:
```bash
DEBUGBOB_AUTONOMY_LEVEL=2  # 1=notify | 2=PR | 3=auto
```

### Adjust Token Budget
In `lib/pipeline.ts`:
```typescript
const TOKEN_BUDGET = 100000;  // Adjust as needed
```

### Enable Demo Mode
In `.env.local`:
```bash
DEMO_MODE=true
```

---

## 📚 Next Steps

1. **Read the full README** for architecture details
2. **Check IMPLEMENTATION_STATUS.md** for what's built
3. **Explore the agent specs** in the markdown files
4. **Build Phase 2** for full automation (Vercel webhooks, auto-deploy)

---

## 🆘 Need Help?

- Check the agent logs in the browser console
- Review the API response in Network tab
- Verify environment variables are loaded
- Ensure all dependencies are installed

---

**You're ready to debug! 🎉**