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

Agents wake on a schedule (heartbeats), check for work, act, and report. The orchestrator enforces rules on every action.

## Quick Start

```bash
npx agentorg init
npx agentorg start
open http://localhost:3100
```

Or manage entirely from Telegram.

## Templates

| Template | Agents | Cost | Use Case |
|----------|--------|------|----------|
| `content-agency` | 6 | $65/mo | SEO blog posts for clients |
| `ecommerce-support` | 4 | $45/mo | Shopify customer service |
| `saas-builder` | 7 | $95/mo | SaaS marketing + support |
| `consulting-firm` | 5 | $70/mo | Lead gen + deliverables |
| `education` | 5 | $55/mo | Student support + content |

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0
