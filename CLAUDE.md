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
  core/          — Orchestrator (6-check pipeline), OrgChart, TaskQueue, BudgetTracker, HeartbeatScheduler
  safety/        — Fact-check, brand-check, hallucination guard
  adapters/      — Runtime adapters: claude-agent-sdk, anthropic-api, openclaw, codex, http, script
  skills/        — Native skills: browser (Puppeteer), email (SMTP), filesystem, CRM, invoicing, calendar
  memory/        — Per-agent memory, personality persistence, knowledge base, vector store
  optimizer/     — Token optimization: model routing, cache, context pruning, prompt caching, batching
  skill-graph/   — DAG workflow engine, dependency resolver, capability tree
  server/        — Express API + WebSocket + heartbeat cron scheduler
  cli/           — npx agentorg init/start/doctor/scale
  chat-manager/  — Telegram/WhatsApp management commands + NLP parsing
  sdk/           — @agentorg/sdk for plugin developers
  ui/            — React dashboard
tests/
  unit/          — Orchestrator checks, safety, skill-graph
  integration/   — Multi-package tests
  e2e/           — Full flow tests
templates/       — Company YAML templates (content-agency, ecommerce-support, etc.)
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

Phase 1 scaffold is done. The orchestrator (packages/core/src/orchestrator.ts) has the 6-check pipeline implemented with permission check working. OrgChart, TaskQueue, BudgetTracker, and HeartbeatScheduler are scaffolded with interfaces.

**What's working:** Project structure, TypeScript interfaces, orchestrator permission check, first test

**What needs building next (priority order):**
1. Server that loads YAML config and starts (packages/server/)
2. CLI wizard: `npx agentorg init` and `npx agentorg start` (packages/cli/)
3. Claude Agent SDK adapter that actually executes tasks (packages/adapters/claude-agent-sdk/)
4. Heartbeat scheduler with real cron (packages/core/src/heartbeat.ts)
5. Content-agency template running end-to-end

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

- `docs/TECHNICAL_SPEC.md` — Full 3,400-line engineering spec. Read this for complete interface definitions, YAML config format, security model, deployment options, and roadmap.
- `templates/content-agency.yaml` — The first template. 6 agents with personalities, heartbeats, governance rules.
- `packages/core/src/orchestrator.ts` — The 6-check policy engine. This is the most critical file.
- `packages/core/src/types.ts` — All shared TypeScript types.
- `packages/adapters/base.ts` — The adapter interface every runtime implements.
