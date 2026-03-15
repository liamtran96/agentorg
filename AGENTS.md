# AGENTS.md

This file helps AI coding agents understand the AgentOrg codebase.

## Project Structure

- `packages/core/` — Orchestrator, org chart, tasks, budgets, CRM
- `packages/safety/` — Fact-check, brand-check, hallucination guard
- `packages/adapters/` — Runtime adapters (Claude Agent SDK, Anthropic API, OpenClaw, Codex, HTTP, script)
- `packages/skills/` — Native skills (browser, email, filesystem, CRM, invoicing, calendar)
- `packages/memory/` — Agent memory, personality, knowledge base
- `packages/optimizer/` — Token cost optimization (model routing, caching, pruning)
- `packages/skill-graph/` — DAG workflows, dependency resolver, capability tree
- `packages/server/` — Express API + WebSocket + heartbeat scheduler
- `packages/cli/` — CLI commands (init, start, doctor, scale)
- `packages/chat-manager/` — Telegram/WhatsApp management commands
- `packages/sdk/` — Plugin developer SDK
- `packages/ui/` — React dashboard

## Key Patterns

- YAML config is the source of truth — dashboard and chat write to the same file
- Every agent action passes through the orchestrator's 6-check pipeline
- Agents are untrusted — they never hold secrets or access the database directly
- Heartbeats drive the company — agents wake on schedule, check work, act, report

## Tech Stack

TypeScript, Node.js 22+, Express, React, SQLite/PostgreSQL, Drizzle ORM, BullMQ, Redis, Vitest

## Testing

```bash
pnpm test          # Run all tests
pnpm test:unit     # Unit tests only
pnpm test:e2e      # End-to-end tests
```
