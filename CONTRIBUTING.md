# Contributing to AgentOrg

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/your-username/agentorg.git
cd agentorg
pnpm install
pnpm dev
```

## What to Contribute

- **Skills** — Build new agent skills (packages/skills/)
- **Adapters** — Add support for new agent runtimes (packages/adapters/)
- **Templates** — Create company templates (templates/)
- **Bug fixes** — Check issues labeled "good first issue"
- **Docs** — Improve documentation (docs/)

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with tests
3. Run `pnpm lint && pnpm test`
4. Submit a PR with a clear description

## Code Style

- TypeScript strict mode
- ESLint + Prettier (run `pnpm lint:fix`)
- Vitest for tests

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`

## Questions?

Open a discussion or join our Discord.
