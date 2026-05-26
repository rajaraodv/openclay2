# OpenClay — Open-Source Clay.com Clone

An open-source alternative to [Clay.com](https://www.clay.com/) — the GTM data enrichment and workflow automation platform.

> **Built entirely with [Claude Code](https://claude.ai/claude-code)** — Anthropic's AI coding agent (Claude Opus 4.7).

## What is this?

OpenClay replicates Clay.com's full feature set so existing Clay users can migrate seamlessly:

- **Spreadsheet UI** — Canvas-rendered grid (Glide Data Grid) handling 50K+ rows at 60fps
- **Waterfall Enrichment** — Chain 10+ data providers (Apollo, Hunter, Clearbit, etc.) with sequential fallback
- **AI Research Agent** — Multi-model (GPT-4o, Claude, Gemini) web research agent with BYOK
- **Formula Columns** — JavaScript formulas with `{{ColumnRef}}` syntax, Lodash, and 26 built-in functions
- **Column = Behavior Unit** — Every column is configurable: manual input, enrichment, formula, AI agent, or action
- **Dependency DAG** — Columns can reference other columns/tables; execution respects the dependency graph
- **Credit System** — Immutable ledger, optimistic locking, BYOK eliminates data credit costs
- **CRM Integrations** — Salesforce, HubSpot, Pipedrive via Nango (OAuth management)
- **Real-time Progress** — SSE streaming for per-cell enrichment status updates
- **Enterprise Ready** — Multi-tenant with PostgreSQL Row-Level Security, AES-256-GCM encrypted API keys

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Spreadsheet | Glide Data Grid (canvas-rendered) |
| UI | shadcn/ui + Tailwind CSS |
| Database | PostgreSQL 16 (Neon) + Drizzle ORM |
| Cache/Queue | Redis (Upstash) + BullMQ |
| AI | Vercel AI SDK 6 (multi-model) |
| Workflows | Inngest (durable step functions) |
| Auth | NextAuth.js v5 (Auth.js) |
| CRM | Nango (open-source OAuth) |
| Deployment | Vercel + Docker Compose |

## Quick Start

```bash
git clone https://github.com/rajaraodv/openclay2.git
cd openclay2
npm install --legacy-peer-deps
cp .env.example .env.local
# Edit .env.local with your credentials
npx drizzle-kit push
npm run dev
```

## Environment Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# Auth
AUTH_SECRET=generate-with-openssl-rand-base64-33

# Google OAuth (optional)
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# API Key Encryption
ENCRYPTION_MASTER_KEY=64-hex-chars-for-aes-256
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── (workspace)/        # Authenticated workspace layout
│   │   ├── tables/[tableId]/ # Main spreadsheet page
│   │   └── page.tsx        # Dashboard
│   ├── api/                # REST API (tables, rows, cells, credits, run)
│   └── auth/               # Sign-in / Sign-up pages
├── auth/                   # NextAuth config + password hashing
├── components/
│   ├── table/              # DataGrid, Toolbar, FilterPanel, ColumnConfig
│   ├── workspace/          # Sidebar, CreateTableDialog
│   └── ui/                 # shadcn/ui components
├── db/schema/              # Drizzle ORM schema (6 modules)
├── lib/
│   ├── enrichment/         # Provider adapters, waterfall, BullMQ queue, SSE
│   │   └── providers/      # Apollo, Hunter, Clearbit, ZeroBounce, +6 more
│   ├── workflow/           # DAG executor, actions, Inngest functions
│   ├── formula/            # JS formula engine + 26 built-in functions
│   ├── ai-agent/           # Vercel AI SDK agent + tools (search, scrape)
│   ├── credits/            # Credit service, ledger, wallet
│   └── crypto/             # AES-256-GCM key encryption (BYOK)
└── types/                  # Shared TypeScript types
```

## Enrichment Providers (Wave 1)

| # | Provider | Category | Status |
|---|----------|----------|--------|
| 1 | Apollo.io | People + Email + Phone | Implemented |
| 2 | Hunter.io | Email Finding | Implemented |
| 3 | Clearbit | Company Enrichment | Implemented |
| 4 | ZeroBounce | Email Verification | Implemented |
| 5 | Prospeo | Email Finding | Stub |
| 6 | People Data Labs | People + Company | Stub |
| 7 | Lusha | Phone + Email | Stub |
| 8 | DropContact | Email (GDPR) | Stub |
| 9 | Crunchbase | Company + Funding | Stub |
| 10 | BuiltWith | Technographics | Stub |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rajaraodv/openclay2)

Connect in Vercel Marketplace:
1. **Neon PostgreSQL** — for database
2. **Upstash Redis** — for queues, caching, SSE pub/sub

Then set remaining env vars: `AUTH_SECRET`, `ENCRYPTION_MASTER_KEY`

## What You Need

| Service | Purpose | Where to get it |
|---------|---------|----------------|
| **Neon PostgreSQL** | Database (tables, rows, cells, credits, users) | Vercel Marketplace or neon.tech |
| **Upstash Redis** | Job queues (BullMQ), rate limiting, SSE pub/sub, caching | Vercel Marketplace or upstash.com |
| **Auth Secret** | JWT signing for sessions | `openssl rand -base64 33` |
| **Encryption Key** | AES-256-GCM for BYOK API keys | `openssl rand -hex 32` |

## License

MIT

---

*Built with [Claude Code](https://claude.ai/claude-code) by Anthropic*
