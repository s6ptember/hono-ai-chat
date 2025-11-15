# 🤖 AI Code Review Assistant

Serverless AI-powered code review application built with Hono, Cloudflare Workers, and Groq API.

## ✨ Features

- ⚡ **Ultra-fast**: 1-2 second response time with Groq API
- 🌍 **Edge-first**: Deployed on Cloudflare Workers (200+ locations worldwide)
- 💰 **Free**: 100,000 requests/day on Cloudflare's free tier

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) or [Node.js](https://nodejs.org) 18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Groq API key](https://console.groq.com/keys) (free)

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/s6ptember/hono-ai-chat
cd hono-ai-code-review
```

2. **Install dependencies**

```bash
bun install
# or
npm install
```

3. **Create environment file**

```bash
cp .env.example .env
```

4. **Get Groq API key**

- Visit [console.groq.com/keys](https://console.groq.com/keys)
- Create a free account
- Generate a new API key
- Copy the key to `.env`:

```env
GROQ_API_KEY=gsk_your_key_here
```

5. **Start the development server**

```bash
bun run dev
# or
npm run dev
```

6. **Open in browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy to Cloudflare Workers

### 1. Install Wrangler

```bash
bun install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create KV namespace (optional - for session storage)

```bash
wrangler kv:namespace create SESSIONS
```

Copy the ID from output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your_kv_namespace_id"
```

### 4. Set API key as secret

```bash
wrangler secret put GROQ_API_KEY
# Paste your Groq API key when prompted
```

### 5. Deploy!

```bash
bun run deploy
# or
npm run deploy
```

Your app is now live! 🎉


## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────┐
│  Cloudflare Workers (Edge)  │
│    ┌─────────────────┐     │
│    │   Hono App      │     │
│    ├─────────────────┤     │
│    │ Routes          │     │
│    │ Middleware      │     │
│    │ Services        │     │
│    └─────────────────┘     │
└──────────┬──────────────────┘
           │
           ↓
    ┌──────────────┐
    │  Groq API    │
    │  (AI Model)  │
    └──────────────┘
```

## 📁 Project Structure

```
hono-test/
├── src/
│   ├── routes/           # API routes
│   │   ├── chat.ts       # Code review endpoint
│   │   ├── health.ts     # Health check
│   │   └── pages.ts      # HTML UI
│   ├── services/         # Business logic
│   │   ├── groq.ts       # Groq API integration
│   │   ├── context.ts    # Prompt engineering
│   │   └── session.ts    # Session management
│   ├── middleware/       # HTTP middleware
│   │   ├── cors.ts
│   │   ├── rateLimit.ts
│   │   └── auth.ts
│   ├── utils/           # Utilities
│   │   ├── errors.ts
│   │   └── logger.ts
│   ├── index.ts         # Dev server (Bun)
│   └── worker.ts        # Production (Cloudflare Workers)
├── wrangler.toml        # Cloudflare config
├── package.json
└── tsconfig.json
```

## 🛠️ Tech Stack

- **Framework**: [Hono](https://hono.dev) - Ultrafast web framework for the edge
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com) - Serverless edge platform
- **AI**: [Groq](https://groq.com) - Fast AI inference
- **Frontend**: [Alpine.js](https://alpinejs.dev) + [HTMX](https://htmx.org)
- **Language**: TypeScript
- **Dev Runtime**: [Bun](https://bun.sh)

## 🔧 Available Commands

```bash
# Local development with hot-reload
bun run dev

# Local development with Cloudflare Workers simulation
wrangler dev

# Type checking
bun run type-check

# Deploy to production
bun run deploy

# View live logs
wrangler tail

# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback
```

## 🎨 Customization

### Change AI Model

Edit `src/services/groq.ts`:

```typescript
private model: string = 'llama-3.3-70b-versatile';
// Available models:
// - llama-3.3-70b-versatile (best quality)
// - llama-3.1-8b-instant (faster)
// - mixtral-8x7b-32768 (longer context)
```

### Add Custom Middleware

Create a new file in `src/middleware/` and register it in `src/index.ts` or `src/worker.ts`.

### Modify Prompts

Edit system prompts in `src/services/context.ts` to customize AI behavior.

## 🐛 Troubleshooting

### "Invalid API Key" error

- Check that `GROQ_API_KEY` is set correctly in `.env`
- Verify the key starts with `gsk_`
- Restart the development server

### "Port 3000 already in use"

```bash
lsof -ti:3000 | xargs kill -9
bun run dev
```

### Deployment fails

- Make sure you're logged in: `wrangler whoami`
- Check `wrangler.toml` configuration
- Verify secrets are set: `wrangler secret list`
