# CLAUDE.md — AgentOrg Project Guide

## What is this project?

AgentOrg is a universal orchestration framework for AI agent companies. One person runs a company staffed by AI agents. Agents wake on heartbeat schedules, check for work, act, and report. The orchestrator enforces rules on every action.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 22+
- **Monorepo:** pnpm workspaces + Turborepo
- **Database:** SQLite (dev) / PostgreSQL (prod) via Drizzle ORM
- **Queue:** BullMQ + Redis
- **Frontend:** React + Vite + Tailwind
- **Testing:** Vitest
- **Linting:** ESLint + Prettier

## Project Structure

```
packages/
  core/          — Orchestrator (6 checks), OrgChart, TaskQueue, BudgetTracker, HeartbeatScheduler,
                   ConfigManager, AuditLog, IncidentLog, InboxRouter, DeadlineTracker,
                   AgentCommunicator, ErrorRecovery, MetricsCollector, Database (SQLite)
  server/        — Express REST API (13 routes) + WebSocket broadcast server
  adapters/      — Runtime adapters: Claude Agent SDK, Anthropic API, HTTP
  skills/        — SkillRegistry + Browser, Email, Filesystem, CRM, Calendar, Invoicing, Messaging
  safety/        — FactChecker, BrandChecker, HallucinationGuard, ThreadIsolator
  memory/        — AgentMemory, KnowledgeBase, SourceOfTruth
  optimizer/     — ModelRouter, ResponseCache, ContextPruner, Compressor
  skill-graph/   — DependencyResolver, DAGExecutor, CapabilityTree
  chat-manager/  — Command parser, NLP parser, ApprovalManager
  sdk/           — createSkill(), createAdapter() for plugin developers
  cli/           — npx agentorg init/start/doctor
  ui/            — React dashboard (planned)
tests/
  unit/          — 40+ test suites across all packages
  integration/   — Config-to-orchestrator, heartbeat flow, server API, governance
  e2e/           — Full workday simulation
templates/       — content-agency, ecommerce-support, saas-builder
docs/            — TECHNICAL_SPEC.md has the full 3,400-line engineering blueprint
```

## Key Architecture Decisions

1. **YAML is the source of truth** — `agentorg.config.yaml` defines the company. Dashboard and Telegram chat read/write to this same file. All three stay in sync via API + WebSocket.

2. **Orchestrator checks every action** — 6 checks in order: permission, scope, budget, rate limit, safety, approval. Every agent action passes through this. Target: <20ms per check.

3. **Universal orchestration** — Agents can run on any runtime (Claude Agent SDK, Anthropic API, OpenClaw, Codex, Cursor, custom HTTP). The adapter pattern abstracts the runtime. Orchestrator doesn't care what's behind the adapter.

4. **Heartbeats make agents alive** — Scheduled (cron) and reactive (event-triggered). CEO every 4h, support every 15m. Delegation flows DOWN the org chart, escalation flows UP.

5. **Agents are untrusted** — They run in sandboxes with zero access to secrets, database, or network. The orchestrator proxies all external calls. PII is redacted before sending to LLMs.

6. **Native skills + OpenClaw compatibility** — We build our own skills (browser, email, CRM) but follow the OpenClaw SKILL.md format so community skills can install.

## Current State

All core packages are implemented with 61 test files and 555 passing tests.

**What's built:**
- **Core:** Orchestrator (all 6 checks), OrgChart, TaskQueue, BudgetTracker, HeartbeatScheduler (node-cron), ConfigManager (YAML hot-reload), AuditLog, IncidentLog, InboxRouter, DeadlineTracker, AgentCommunicator, ErrorRecovery, MetricsCollector, Database (SQLite)
- **Server:** Express REST API (13 routes), WebSocket broadcast server
- **Adapters:** AnthropicAPIAdapter, ClaudeAgentSDKAdapter, HTTPAdapter
- **Skills:** SkillRegistry, FilesystemSkill, BrowserSkill, EmailSkill, CRMSkill, CalendarSkill, InvoicingSkill, MessagingSkill
- **Safety:** FactChecker, BrandChecker, HallucinationGuard, ThreadIsolator
- **Memory:** AgentMemory, KnowledgeBase, SourceOfTruth
- **Optimizer:** ModelRouter, ResponseCache, ContextPruner, Compressor
- **Skill Graph:** DependencyResolver, DAGExecutor, CapabilityTree
- **Chat Manager:** parseCommand, parseNaturalLanguage, ApprovalManager
- **SDK:** createSkill(), createAdapter()
- **CLI:** initProject, startServer, runDoctor
- **Templates:** content-agency (6 agents), ecommerce-support (5 agents), saas-builder (6 agents)

**What needs building next (priority order):**
1. BullMQ + Redis job queue for persistent task processing
2. PostgreSQL support via Drizzle ORM for production
3. WhatsApp/Discord chat adapters

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start dev mode (all packages)
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm lint:fix         # Auto-fix lint issues
pnpm typecheck        # TypeScript type checking
```

## Code Conventions

- Use `async/await` everywhere, never raw promises
- Every public function has JSDoc comments
- Errors are typed (never throw raw strings)
- Use barrel exports (index.ts re-exports from all modules)
- Tests go in `tests/` directory, named `*.test.ts`
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`

## Important Files

- `packages/core/src/orchestrator/index.ts` — The 6-check policy engine. Most critical file.
- `packages/core/src/types.ts` — All shared TypeScript types (~300 lines).
- `packages/server/src/app.ts` — Express REST API with 13 routes.
- `packages/core/src/database.ts` — SQLite database (tasks, audit, incidents, contacts, deals).
- `packages/adapters/src/base.ts` — AgentAdapter interface + shared helpers.
- `templates/content-agency.yaml` — Reference template: 6-agent content company.
- `docs/TECHNICAL_SPEC.md` — Full 3,400-line engineering spec.
