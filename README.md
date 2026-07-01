# Abstrabit — GitHub Automation Bot

A full-stack web application that lets users connect their GitHub repositories, receive webhooks, and automate actions (labeling, commenting, Slack notifications) based on configurable rules — with optional AI-powered issue/PR triage.

**Live URL:** [https://abstrabit-bot.netlify.app](https://abstrabit-bot.netlify.app)  
**Server:** Deployed on [Render](https://render.com)

---

## Features

- **GitHub OAuth Sign-in** — Authenticate with your GitHub account
- **Multi-repo Support** — Connect multiple repositories
- **Webhook Processing** — Receives `issues`, `pull_request`, `push`, and all other GitHub event types
- **Configurable Rules** — Create rules with event type matching, JavaScript conditions, and template interpolation
- **GitHub Actions** — Automatically add labels or post comments on issues/PRs
- **Slack Notifications** — Send messages to Slack channels via Incoming Webhooks
- **AI Triage** — Auto-summarize issues/PRs, suggest labels, and assign priority using DeepSeek (via OpenRouter)
- **Event Dashboard** — View all received events, their processing status, AI analysis, and error logs
- **Retry Support** — Failed events can be retried from the dashboard (with exponential backoff)

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Client     │────▶│   Server (API)   │────▶│  PostgreSQL  │
│  (React/Vite)│     │  (Express/Node)  │     │   (Neon)     │
└─────────────┘     └──────────────────┘     └──────────────┘
                           │    ▲
                           │    │  Webhooks
                           ▼    │
                    ┌──────────────────┐
                    │    GitHub API     │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │   Slack / AI     │
                    └──────────────────┘
```

**Server modules:**
- `auth` — GitHub OAuth flow & session management
- `repo` — Repository connection/disconnection & webhook registration
- `webhook` — Webhook ingestion, signature verification, rule engine dispatch
- `rule` — CRUD for automation rules, condition matching
- `event` — Event storage, dashboard queries, retry
- `action` — GitHub (label/comment) and Slack action executors
- `integrations/ai` — OpenRouter/DeepSeek AI triage

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- pnpm (`npm i -g pnpm`)
- A PostgreSQL database (e.g., [Neon](https://neon.tech) free tier)
- A GitHub OAuth App ([create one here](https://github.com/settings/developers))
- (Optional) A Slack workspace with an [Incoming Webhook](https://api.slack.com/messaging/webhooks)
- (Optional) An [OpenRouter](https://openrouter.ai) API key for AI triage

### 1. Clone the repo

```bash
git clone https://github.com/RND2002/abstrabit-github-automation-bot.git
cd abstrabit-github-automation-bot
```

### 2. Server Setup

```bash
cd server
pnpm install

# Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# Generate Prisma client
pnpm run db:generate

# Push schema to the database
pnpm run db:push

# Start the dev server
pnpm run local
```

The server starts on `http://localhost:8000`.

### 3. Client Setup

```bash
cd client
pnpm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env — set VITE_API_URL=http://localhost:8000

# Start the dev server
pnpm run dev
```

The client starts on `http://localhost:5173`.

### 4. Expose your local server (for webhooks)

GitHub webhooks require a public URL. Use [ngrok](https://ngrok.com) or a similar tunnel:

```bash
ngrok http 8000
```

Update your `.env.local`:
```
API_URL="https://your-ngrok-url.ngrok-free.dev"
GITHUB_REDIRECT_URI="https://your-ngrok-url.ngrok-free.dev/api/auth/callback"
```

And update your GitHub OAuth App's **Authorization callback URL** to match.

---

## Environment Variables

### Server (`server/.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | ✅ |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | ✅ |
| `GITHUB_REDIRECT_URI` | OAuth callback URL | ✅ |
| `FRONTEND_URL` | Client app URL (for CORS + redirects) | ✅ |
| `ENCRYPTION_KEY` | AES-256 key for token encryption (≥32 chars) | ✅ |
| `SESSION_SECRET` | Session signing secret (≥32 chars) | ✅ |
| `WEBHOOK_SECRET` | GitHub webhook signature secret (≥8 chars) | ✅ |
| `API_URL` | Public server URL (where GitHub sends webhooks) | Optional |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI triage | Optional |

### Client (`client/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | ✅ |

See `.env.example` in both directories for templates.

---

## Testing the Full Flow

1. Open the client at `http://localhost:5173`
2. Click **Sign in with GitHub** — you'll be redirected to GitHub OAuth
3. After auth, you'll see your repositories — click **Connect** on one
4. Go to the repo's settings page and add a Slack Webhook URL
5. Create a rule (e.g., event: `issues`, condition: `payload.action === 'opened'`, action: `SLACK_MESSAGE`)
6. Open a new issue on the connected GitHub repo
7. Check the **Events** dashboard — you should see the event logged with status `PROCESSED`
8. Check your Slack channel for the notification

---

## Deployment

- **Server:** Deployed on [Render](https://render.com) (free tier, Web Service)
  - Build command: `pnpm install && pnpm run db:generate && pnpm run build`
  - Start command: `node dist/server.js`
  - Environment variables set in Render dashboard
- **Client:** Deployed on [Netlify](https://netlify.com) (free tier)
  - Build command: `cd client && pnpm install && pnpm run build`
  - Publish directory: `client/dist`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TailwindCSS, React Hook Form |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM |
| Auth | GitHub OAuth, AES-256-GCM encrypted sessions |
| AI | OpenRouter (DeepSeek Chat) |
| Hosting | Render (server), Netlify (client) |
