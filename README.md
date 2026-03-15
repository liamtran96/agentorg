# AgentOrg

**Run businesses that couldn't exist before — powered by AI agent teams.**

One person. Ten companies. Thirty minutes a day.

---

## What is AgentOrg?

AgentOrg lets solo founders run a company staffed entirely by AI agents. Pick a template, add your API key, and your company is live in 5 minutes.

Agents handle content, sales, support, and operations. You approve decisions from your phone.

```bash
npx agentorg init
# What kind of business? > content agency
# API key? > sk-ant-...
# Your company is live. 5 agents ready.
```

## Why AgentOrg?

Agent companies can do things human companies can't:

- **Instant scaling** — Clone any agent to 20 parallel workers in seconds
- **Perfect memory** — The company never forgets a customer, a lesson, or a decision
- **24/7 operations** — Agents detect problems at 2 AM and respond before you wake up
- **Self-improvement** — CEO agent analyzes performance and evolves workflows weekly
- **Multi-company** — Run 10 businesses from one dashboard, 30 minutes a day

## How It Works

```
You (Telegram / Dashboard)
  -> CEO Agent (delegates, reviews)
    -> Writer (blog posts, docs)
    -> Sales (outreach, proposals)
    -> Support (customer emails, chat)
    -> Social (posts, engagement)
```

Agents wake on a schedule (heartbeats), check for work, act, and report. The orchestrator enforces rules on every action — 6 checks in <20ms: permission, scope, budget, rate limit, safety, approval.

## Quick Start

```bash
pnpm install
npx agentorg init          # Create a new company config
npx agentorg start         # Start the server
npx agentorg doctor        # Check installation health
open http://localhost:3100
```

Or manage entirely from Telegram.

## Templates

| Template | Agents | Use Case |
|----------|--------|----------|
| `content-agency` | 6 (CEO, Writer, Editor, SEO, Social, Account Manager) | SEO blog posts for clients |
| `ecommerce-support` | 5 (Support Lead, Tier 1, Tier 2, Order Manager, Feedback Analyst) | E-commerce customer service |
| `saas-builder` | 6 (CTO, Backend, Frontend, QA, DevOps, PM) | SaaS development team |

## Universal Orchestration

Mix any agent runtime in one company:

```yaml
org:
  ceo:       { runtime: claude-agent-sdk }
  developer: { runtime: codex }
  designer:  { runtime: http, endpoint: "http://localhost:8200" }
  sales:     { runtime: openclaw }
  support:   { runtime: anthropic-api }
```

## Project Structure

```
packages/
  core/           Orchestrator, OrgChart, TaskQueue, BudgetTracker, HeartbeatScheduler,
                  ConfigManager, AuditLog, IncidentLog, InboxRouter, DeadlineTracker,
                  AgentCommunicator, ErrorRecovery, MetricsCollector, Database (SQLite)
  server/         Express REST API (13 routes) + WebSocket server
  adapters/       Claude Agent SDK, Anthropic API, HTTP adapters
  skills/         SkillRegistry + Browser, Email, Filesystem, CRM, Calendar,
                  Invoicing, Messaging
  safety/         FactChecker, BrandChecker, HallucinationGuard, ThreadIsolator
  memory/         AgentMemory, KnowledgeBase, SourceOfTruth
  optimizer/      ModelRouter, ResponseCache, ContextPruner, Compressor
  skill-graph/    DependencyResolver, DAGExecutor, CapabilityTree
  chat-manager/   Command parser, NLP parser, ApprovalManager
  sdk/            createSkill(), createAdapter() for plugin developers
  cli/            npx agentorg init / start / doctor
  ui/             React dashboard (planned)
tests/
  unit/           40+ test suites across all packages
  integration/    Config-to-orchestrator, heartbeat flow, server API, governance
  e2e/            Full workday simulation
templates/        Company YAML templates (content-agency, ecommerce-support, saas-builder)
```

## Implementation Status

**61 test files | 555 tests | all passing**

| Package | Status | What's Built |
|---------|--------|--------------|
| **core** | Done | Orchestrator (6 checks), OrgChart, TaskQueue, BudgetTracker, HeartbeatScheduler, ConfigManager, AuditLog, IncidentLog, InboxRouter, DeadlineTracker, AgentCommunicator, ErrorRecovery, MetricsCollector, Database |
| **server** | Done | Express REST API (health, agents, tasks, budget, audit, config, heartbeat), WebSocket broadcast |
| **adapters** | Done | AnthropicAPIAdapter, ClaudeAgentSDKAdapter, HTTPAdapter |
| **skills** | Done | SkillRegistry, FilesystemSkill, BrowserSkill, EmailSkill, CRMSkill, CalendarSkill, InvoicingSkill, MessagingSkill |
| **safety** | Done | FactChecker, BrandChecker, HallucinationGuard, ThreadIsolator |
| **memory** | Done | AgentMemory, KnowledgeBase, SourceOfTruth |
| **optimizer** | Done | ModelRouter, ResponseCache, ContextPruner, Compressor |
| **skill-graph** | Done | DependencyResolver, DAGExecutor, CapabilityTree |
| **chat-manager** | Done | parseCommand, parseNaturalLanguage, ApprovalManager |
| **sdk** | Done | createSkill(), createAdapter() |
| **cli** | Done | initProject, startServer, runDoctor |
| **templates** | Done | content-agency, ecommerce-support, saas-builder |
| **ui** | Planned | React + Vite + Tailwind dashboard |
| **Telegram/WhatsApp** | Planned | Chat platform adapters |
| **BullMQ** | Planned | Redis-backed job queue |
| **PostgreSQL** | Planned | Production database via Drizzle ORM |
| **Docker** | Planned | Container deployment (docker-compose.yml exists) |

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 22+
- **Monorepo:** pnpm workspaces + Turborepo
- **Database:** SQLite (dev) via better-sqlite3
- **Server:** Express + WebSocket (ws)
- **Testing:** Vitest
- **Linting:** ESLint + Prettier

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start dev mode (all packages)
pnpm build            # Build all packages
pnpm test             # Run all tests (555 tests)
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript type checking
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0
