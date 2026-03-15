# AgentOrg

> Run businesses that couldn't exist before — powered by AI agent teams.
> One person. Ten companies. Thirty minutes a day.

---

## What is AgentOrg?

AgentOrg is a lightweight, self-hosted framework that lets solo founders run companies staffed entirely by AI agents. It's a universal orchestration layer — coordinate agents from any runtime (Claude, OpenClaw, Codex, Cursor, or anything with an HTTP endpoint) under one org chart, one set of rules, one dashboard. Agents wake on heartbeat schedules, check for work, act, and report — like real employees.

Not cheaper freelancers — **businesses that couldn't exist before.** Clone agents to handle burst demand. A/B test entire business strategies in parallel. Run 10 companies from one dashboard. Let the company analyze its own performance and evolve its own workflows. All while you approve decisions from your phone.

**For solo founders and indie hackers** — not enterprise teams. One command to start. One dashboard to manage. Your agents do the rest.

---

## Core Philosophy

1. **Company-as-code** — Define your org structure, agent roles, and workflows in a single config file
2. **Agents with hands** — Every agent can browse, email, message, and interact with the real world via a shared skill system
3. **Agents with memory** — Each agent has persistent personality, context, and knowledge that survives across sessions
4. **Agents with personality** — Each agent is a character with consistent tone, expertise, and behavior — not a generic task runner
5. **You're the board** — Full control via dashboard or chat (Telegram/WhatsApp/Discord). Approve, override, or pause anything
6. **Safety first** — Every customer-facing output is fact-checked, brand-checked, and governance-gated before it goes out
7. **Superpowers, not savings** — Agent companies can do things human companies can't: instant scaling, parallel strategy testing, perfect memory, self-improvement, multi-company portfolios
8. **Solo-first** — Optimized for one person managing 5-50 agents across 1-10 companies

---

## Architecture

```
                         CUSTOMERS
          Email · Live Chat · Telegram · WhatsApp
                           │
┌──────────────────────────▼──────────────────────────┐
│                    INBOX ROUTER                      │
│     Classifies intent, routes to the right agent     │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                   YOU (Founder)                       │
│          Dashboard · Telegram · WhatsApp              │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                  CONTROL PLANE                        │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌──────────────┐ │
│  │Org Chart│ │Task Queue│ │Budgets│ │  Governance  │ │
│  └────────┘ └─────────┘ └───────┘ └──────────────┘ │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌──────────────┐ │
│  │  CRM   │ │Deadlines │ │ QA    │ │Error Recovery│ │
│  └────────┘ └─────────┘ └───────┘ └──────────────┘ │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                   SAFETY LAYER                        │
│  Fact-check · Brand-check · Hallucination guard      │
│  Concurrent thread isolation · Outbound review       │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                  AGENT RUNTIME                        │
│  Runtimes: Claude Agent SDK · Anthropic API · OpenClaw · Codex · HTTP · Scripts │
└────────┬─────────────────────────────┬──────────────┘
         │                             │
┌────────▼──────────┐     ┌───────────▼───────────────┐
│   SKILLS LAYER    │     │      MEMORY LAYER         │
│ Browser · Email   │     │ Per-agent personality      │
│ Filesystem · APIs │     │ Shared knowledge base      │
│ CRM · Invoicing   │     │ Customer conversation log  │
│ Skill marketplace │     │ Brand guide + policies     │
└───────────────────┘     └───────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ / TypeScript |
| API | Express.js REST + WebSocket for real-time |
| Database | SQLite (dev) / PostgreSQL (prod) via Drizzle ORM |
| UI | React + Vite + Tailwind CSS |
| Agent adapters | Universal: Claude Agent SDK, Anthropic API, OpenClaw, Codex, HTTP (Cursor/Devin/any), scripts |
| Messaging | Telegraf (Telegram), whatsapp-web.js, Discord.js |
| Task queue | BullMQ + Redis (or in-process for local dev) |
| Memory | Vector store (SQLite-vec local, pgvector prod) |
| CRM | Built-in lightweight CRM (SQLite/PostgreSQL) |
| Invoicing | Stripe integration + PDF invoice generation |

---

## Project Structure

```
agentorg/
│
│  ── GitHub & Open Source ─────────────────────────────
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml               # Lint + typecheck + test on every PR
│   │   ├── release.yml          # Auto-publish to npm on tag
│   │   └── docker.yml           # Build + push Docker images
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml       # Structured bug reports
│   │   ├── feature_request.yml  # Feature proposals
│   │   └── question.yml         # Help requests
│   ├── PULL_REQUEST_TEMPLATE.md # PR checklist
│   ├── FUNDING.yml              # GitHub Sponsors + Open Collective
│   └── CODEOWNERS               # Who reviews what
├── .changeset/                  # Semantic versioning with changesets
├── .claude/
│   └── skills/                  # Claude Code skill definitions for AI contributors
│
│  ── Packages (monorepo) ─────────────────────────────
│
├── packages/
│   ├── core/                    # Control plane logic
│   │   ├── src/
│   │   │   ├── orchestrator/    # Central policy engine (6-check pipeline)
│   │   │   │   ├── engine.ts    # Main entry: evaluate(action) → decision
│   │   │   │   ├── checks/
│   │   │   │   │   ├── permission.ts
│   │   │   │   │   ├── scope.ts
│   │   │   │   │   ├── budget.ts
│   │   │   │   │   ├── rate-limit.ts
│   │   │   │   │   ├── safety.ts
│   │   │   │   │   └── approval.ts
│   │   │   │   └── rules-parser.ts  # Load per-agent rules from YAML
│   │   │   ├── org/             # Org chart, roles, hierarchy
│   │   │   ├── tasks/           # Task queue, assignment, delegation
│   │   │   ├── budget/          # Cost tracking, limits, alerts
│   │   │   ├── governance/      # Approval gates, audit log
│   │   │   ├── deadlines/       # SLA tracking, escalation alerts
│   │   │   ├── crm/             # Customer database, deal pipeline
│   │   │   ├── inbox/           # Inbound message router
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── safety/                  # Safety and quality systems
│   │   ├── src/
│   │   │   ├── fact-check.ts    # Validate replies against source-of-truth
│   │   │   ├── brand-check.ts   # Enforce tone, terminology, policies
│   │   │   ├── hallucination.ts # Detect unsupported claims
│   │   │   ├── thread-isolator.ts # Concurrent conversation isolation
│   │   │   ├── error-recovery.ts  # Revert, recall, incident response
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── adapters/                # Agent runtime adapters (universal orchestration)
│   │   ├── claude-agent-sdk/    # Primary: full Claude Code toolset + native skills
│   │   ├── anthropic-api/       # Budget: direct Messages API + function calling
│   │   ├── openclaw/            # External: OpenClaw via HTTP
│   │   ├── codex/               # External: OpenAI Codex via CLI/API
│   │   ├── http/                # Generic: any service with HTTP endpoint
│   │   ├── script/              # Local: Python/Bash scripts
│   │   └── base.ts              # Base adapter interface
│   │
│   ├── skills/                  # Shared skill/tool system
│   │   ├── browser/             # Puppeteer-based browsing
│   │   ├── email/               # SMTP/IMAP integration
│   │   ├── filesystem/          # File read/write/watch
│   │   ├── messaging/           # Telegram, WhatsApp, Discord bridges
│   │   ├── invoicing/           # Stripe + PDF invoice generation
│   │   ├── calendar/            # Scheduling, follow-up reminders
│   │   ├── registry.ts          # Skill discovery + marketplace client
│   │   └── base.ts              # Base skill interface
│   │
│   ├── memory/                  # Persistent memory system
│   │   ├── src/
│   │   │   ├── agent-memory.ts  # Per-agent personality + context
│   │   │   ├── knowledge.ts     # Shared company knowledge base
│   │   │   ├── brand-guide.ts   # Brand voice, tone, terminology
│   │   │   ├── source-of-truth.ts # Pricing, FAQ, policies (for fact-check)
│   │   │   ├── vector-store.ts  # Embedding + similarity search
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── optimizer/               # Token cost optimization engine
│   │   ├── src/
│   │   │   ├── model-router.ts  # Select cheapest model per task type
│   │   │   ├── cache.ts         # Semantic response caching
│   │   │   ├── context-pruner.ts # RAG-based context reduction
│   │   │   ├── prompt-cacher.ts # Structure prompts for Anthropic cache
│   │   │   ├── compressor.ts    # Rolling conversation summarization
│   │   │   ├── shortcuts.ts     # Skill-based LLM bypass rules
│   │   │   ├── pipeline.ts      # Progressive response pipeline
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── skill-graph/             # Workflow DAGs and capability tree
│   │   ├── src/
│   │   │   ├── graph.ts         # Core graph engine — resolve, execute
│   │   │   ├── dependencies.ts  # Skill input/output dependency resolver
│   │   │   ├── dag-executor.ts  # Execute workflow steps with parallel support
│   │   │   ├── capabilities.ts  # Auto-generate capability tree from skills + workflows
│   │   │   ├── workflow-parser.ts # Parse workflow DAGs from YAML
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── server/                  # Express API server
│   │   ├── src/
│   │   │   ├── routes/          # REST endpoints
│   │   │   ├── ws/              # WebSocket handlers
│   │   │   ├── middleware/       # Auth, rate limiting
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── cli/                     # Command-line interface
│   │   ├── src/
│   │   │   ├── init.ts          # npx agentorg init (setup wizard)
│   │   │   ├── start.ts         # npx agentorg start
│   │   │   ├── doctor.ts        # npx agentorg doctor (health check)
│   │   │   ├── update.ts        # npx agentorg update
│   │   │   ├── scale.ts         # npx agentorg scale <agent> --replicas N
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── chat-manager/            # Telegram/WhatsApp management interface
│   │   ├── src/
│   │   │   ├── commands.ts      # /hire, /budget, /approve, /status, etc.
│   │   │   ├── natural-lang.ts  # Parse "set Maya's budget to $40"
│   │   │   ├── setup-wizard.ts  # Full company setup via chat
│   │   │   ├── approvals.ts     # Inline approve/reject buttons
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── sdk/                     # Public SDK for plugin developers
│   │   ├── src/
│   │   │   ├── skill-builder.ts # createSkill() helper
│   │   │   ├── adapter-builder.ts # createAdapter() helper
│   │   │   ├── template-builder.ts # createTemplate() helper
│   │   │   ├── testing.ts       # Mock orchestrator, memory, CRM for tests
│   │   │   └── index.ts         # Re-exports all public interfaces
│   │   ├── package.json         # Published as @agentorg/sdk
│   │   └── README.md            # SDK quickstart for plugin developers
│   │
│   └── ui/                      # React dashboard
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx     # Overview: agents, tasks, costs
│       │   │   ├── OrgChart.tsx      # Visual org chart editor
│       │   │   ├── TaskBoard.tsx     # Kanban-style task management
│       │   │   ├── AgentDetail.tsx   # Agent config, memory, logs, performance
│       │   │   ├── CRM.tsx           # Customer records, pipeline, history
│       │   │   ├── Inbox.tsx         # All inbound messages, routing status
│       │   │   ├── Incidents.tsx     # Error log, revert actions, open issues
│       │   │   ├── Analytics.tsx     # Performance metrics, agent KPIs
│       │   │   ├── TokenSavings.tsx  # Optimization dashboard
│       │   │   ├── SkillMarket.tsx   # Browse/install skills
│       │   │   └── Settings.tsx      # Company config, budgets, brand guide
│       │   └── App.tsx
│       └── package.json
│
│  ── Content & Templates ─────────────────────────────
│
├── templates/                   # Pre-built company configs
│   ├── content-agency.yaml      # Blog writer + SEO + social media agents
│   ├── saas-builder.yaml        # Product manager + dev + QA agents
│   ├── ecommerce.yaml           # Store manager + support + marketing
│   └── research-team.yaml       # Analyst + writer + fact-checker
│
├── examples/                    # Full working examples with walkthroughs
│   ├── content-agency/
│   │   ├── agentorg.config.yaml
│   │   ├── source-of-truth/
│   │   └── README.md            # Step-by-step walkthrough
│   ├── saas-builder/
│   └── ecommerce/
│
├── source-of-truth/             # Founder-maintained truth files
│   ├── pricing.md               # Current pricing (agents fact-check against this)
│   ├── faq.md                   # Official FAQ
│   ├── policies.md              # Refund policy, terms, limits
│   └── brand-guide.md           # Tone, terminology, do's and don'ts
│
│  ── Documentation ───────────────────────────────────
│
├── docs/
│   ├── getting-started.md       # 5-minute quickstart
│   ├── architecture.md          # Deep architecture doc (the full spec)
│   ├── orchestrator.md          # Deep dive on the policy engine
│   ├── optimization.md          # Token cost optimization guide
│   ├── building-skills.md       # How to create a custom skill
│   ├── building-adapters.md     # How to create a custom agent adapter
│   ├── building-templates.md    # How to create a company template
│   ├── deployment.md            # Local, Docker, cloud deployment guides
│   ├── security.md              # Security model, sandboxing, secrets
│   └── api-reference.md         # REST API endpoints
│
│  ── Tests ────────────────────────────────────────────
│
├── tests/
│   ├── unit/
│   │   ├── orchestrator/        # Every check tested independently
│   │   │   ├── permission.test.ts
│   │   │   ├── scope.test.ts
│   │   │   ├── budget.test.ts
│   │   │   ├── rate-limit.test.ts
│   │   │   ├── safety.test.ts
│   │   │   └── approval.test.ts
│   │   ├── safety/              # Fact-check, brand-check, hallucination
│   │   ├── optimizer/           # Cache hit, context pruning, model routing
│   │   ├── skill-graph/         # Dependency resolution, DAG execution, capability tree
│   │   │   ├── dependencies.test.ts
│   │   │   ├── dag-executor.test.ts
│   │   │   └── capabilities.test.ts
│   │   └── crm/                 # Customer CRUD, pipeline stages
│   ├── integration/
│   │   ├── agent-to-agent.test.ts
│   │   ├── inbox-routing.test.ts
│   │   ├── customer-conversation.test.ts
│   │   └── governance-flow.test.ts
│   └── e2e/
│       └── full-workday.test.ts # Simulate a complete Monday morning
│
│  ── Community & Config ──────────────────────────────
│
├── skills-marketplace/          # Community skill packages
│   └── README.md
│
├── CONTRIBUTING.md              # Dev setup, coding standards, PR process
├── AGENTS.md                    # Instructions for AI contributors
├── CODE_OF_CONDUCT.md           # Community standards
├── SECURITY.md                  # Vulnerability reporting process
├── CHANGELOG.md                 # Release history
├── LICENSE                      # MIT
├── agentorg.config.yaml         # Company definition file
├── docker-compose.yml           # Production deployment
├── Caddyfile                    # Reverse proxy config
├── .env.example                 # Environment variable template
├── .eslintrc.js                 # Linting rules
├── .prettierrc                  # Code formatting
├── vitest.config.ts             # Test configuration
├── package.json                 # Monorepo root (pnpm workspaces)
├── turbo.json                   # Turborepo build pipeline
└── README.md                    # Sales page — short, visual, scannable
```

---

## Three Configuration Paths

YAML is the single source of truth — but users never have to see it. Every setting has three paths to access it: a file, a UI, and a chat. All three stay in sync automatically.

### Path 1: YAML File (Developers)

Edit `agentorg.config.yaml` directly in any text editor. Git version control. Copy-paste templates. Full flexibility. Infrastructure-as-code mindset.

```bash
# Edit config, server hot-reloads automatically
vim agentorg.config.yaml
```

### Path 2: Dashboard UI (Visual Users)

Point-and-click forms, drag-drop org chart, toggle switches, budget sliders, template gallery. Every form field writes back to the YAML automatically. Never touch a config file.

- Company settings → text inputs, dropdowns
- Agent team → draggable cards with model/runtime/budget controls
- Governance → toggle switches for each approval rule
- Safety → toggles + dropdown for block mode
- Orchestrator rules → per-agent permission checkboxes
- Skill graph → visual workflow editor (drag nodes, connect edges)

### Path 3: Chat Commands (Mobile-First Founders)

Manage the entire company from Telegram or WhatsApp. Structured commands and natural language both work.

```
/status              → Company overview: agents, tasks, spend
/agents              → List all agents with status
/hire designer       → Setup wizard for new agent
/fire social         → Remove agent (with confirmation)
/budget maya 40      → Set Maya's budget to $40/month
/pause support       → Pause an agent
/resume support      → Resume an agent
/approve             → View and approve pending actions
/reject 3 "revise subject line"  → Reject with feedback
/digest              → Today's summary from CEO agent
/scale writer 10 2w  → Clone writer to 10 replicas for 2 weeks
/cost                → This month's total spend breakdown
/workflow            → List active workflows
```

Natural language also works:
- "Set Maya's budget to forty dollars" → same as `/budget maya 40`
- "Hire a designer named Kim, reports to CEO, $25 budget" → full agent setup
- "How much have we spent this week?" → cost breakdown
- "Pause social until Monday" → pause with auto-resume

### How Sync Works

```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│  YAML file  │   │  Dashboard   │   │  Telegram    │
│  (edit)     │   │  (click)     │   │  (type)      │
└──────┬──────┘   └──────┬───────┘   └──────┬───────┘
       │                 │                   │
       ▼                 ▼                   ▼
┌──────────────────────────────────────────────────┐
│              REST API + WebSocket                 │
│  Every change → validate → write YAML → reload   │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│          agentorg.config.yaml (source of truth)   │
│  File watcher detects changes → hot-reload config │
└──────────────────────────────────────────────────┘
```

Any change through any path triggers the same flow:
1. Validate the change (orchestrator checks if it's allowed)
2. Write to YAML file
3. Hot-reload config (no restart needed)
4. Push update to all connected clients via WebSocket
5. Dashboard, Telegram, and YAML all reflect the change instantly

### Setup Wizard (All Three Paths)

Developers:
```bash
npx agentorg init
# Terminal-based wizard with questions
```

Visual users:
```
Open https://localhost:3100/setup
# Web-based wizard with forms and template gallery
```

Mobile founders:
```
Start a chat with @agentorg_bot on Telegram
Bot: "Welcome! What kind of business?"
You: "content agency"
Bot: "Got it. API key?"
You: "sk-ant-..."
Bot: "Your company is live. 6 agents ready."
```

All three end at the same place — a running company with the same config file.

---

## Company Config (agentorg.config.yaml)

```yaml
company:
  name: "My AI Agency"
  description: "Content marketing agency run by AI agents"
  timezone: "Asia/Ho_Chi_Minh"
  business_hours: "09:00-18:00"      # For SLA calculations
  out_of_hours_reply: |
    Thanks for reaching out! Our team is available 9am-6pm ICT.
    We'll get back to you first thing in the morning.

# -----------------------------------------------------------
# Source of truth — agents fact-check outbound replies against these
# -----------------------------------------------------------
source_of_truth:
  pricing: ./source-of-truth/pricing.md
  faq: ./source-of-truth/faq.md
  policies: ./source-of-truth/policies.md
  brand_guide: ./source-of-truth/brand-guide.md

# -----------------------------------------------------------
# Org chart — who works here and what they do
# -----------------------------------------------------------
org:
  ceo:
    name: Alex
    runtime: claude-agent-sdk
    model: claude-sonnet-4-20250514
    personality: |
      You are Alex, the CEO. You break down high-level goals into
      actionable tasks and delegate to your team. You review
      all deliverables before they go out. You speak in a strategic,
      executive tone when dealing with partners and investors.
    budget: 50
    reports_to: board
    skills:
      - browser
      - email
      - calendar

  content_writer:
    name: Maya Lin
    runtime: claude-agent-sdk
    model: claude-sonnet-4-20250514
    personality: |
      You are Maya, a thoughtful, research-driven content writer.
      You prefer long-form content. You take editorial feedback well
      but push back when data supports your angle. You know the company's
      brand voice is casual-professional.
    budget: 30
    reports_to: ceo
    skills:
      - browser
      - filesystem

  support:
    name: Linh
    runtime: anthropic-api
    model: claude-haiku-4-5-20251001
    personality: |
      You are Linh, the customer support specialist. You are friendly,
      patient, and solution-oriented. You always check the customer's
      history in the CRM before replying. You never guess — if you
      don't know, you escalate to a teammate.
    budget: 20
    reports_to: ceo
    skills:
      - email
      - crm
      - knowledge_base
    sla:
      first_response: 30m    # Must respond within 30 minutes
      resolution: 24h         # Must resolve within 24 hours

  sales:
    name: James
    runtime: claude-agent-sdk
    model: claude-sonnet-4-20250514
    personality: |
      You are James, a persuasive and data-driven sales agent.
      You always research the prospect before replying. You reference
      case studies and specific numbers. You never offer discounts
      without board approval.
    budget: 25
    reports_to: ceo
    skills:
      - browser
      - email
      - crm
      - calendar
      - invoicing
    sla:
      first_response: 1h
      follow_up: 3d           # Auto-follow-up if no reply in 3 days

  social_media:
    name: Sam
    runtime: anthropic-api
    model: claude-haiku-4-5-20251001
    personality: |
      You are Sam, the social media manager. You create punchy,
      engaging posts. You know which platforms prefer which formats.
      You track engagement and report trends to the CEO.
    budget: 15
    reports_to: ceo
    skills:
      - browser
      - messaging

  seo_analyst:
    name: Kai
    agent: script
    runtime: python
    script: ./agents/seo_check.py
    budget: 10
    reports_to: ceo
    skills:
      - browser

# -----------------------------------------------------------
# Customer communication — how agents talk to the outside world
# -----------------------------------------------------------
inbox:
  channels:
    email: support@yourcompany.com
    livechat:
      enabled: true
      widget_url: https://yoursite.com
    telegram: ${TELEGRAM_CUSTOMER_BOT}
    whatsapp: ${WHATSAPP_BUSINESS_NUMBER}

  routing:
    support:
      keywords: [help, issue, problem, refund, order, bug, broken]
      agent: support
    sales:
      keywords: [pricing, demo, plan, purchase, agency, enterprise, quote]
      agent: sales
    executive:
      keywords: [partnership, investment, CEO, CTO, acquisition, press]
      agent: ceo
    default: support

  out_of_hours: auto_reply     # Send out_of_hours_reply, queue for next business day

# -----------------------------------------------------------
# CRM — shared customer database
# -----------------------------------------------------------
crm:
  enabled: true
  auto_create_contact: true    # Create contact on first interaction
  deal_stages:
    - lead
    - qualified
    - demo_scheduled
    - proposal_sent
    - negotiation
    - closed_won
    - closed_lost
  fields:
    - name
    - email
    - company
    - phone
    - channel           # How they first contacted us
    - assigned_agent     # Primary agent for this customer
    - notes
    - lifetime_value

# -----------------------------------------------------------
# Safety systems — protect the business from mistakes
# -----------------------------------------------------------
safety:
  fact_check:
    enabled: true
    sources:
      - ./source-of-truth/pricing.md
      - ./source-of-truth/faq.md
      - ./source-of-truth/policies.md
    block_on_failure: true     # Don't send if fact-check fails
    fallback: |
      I want to make sure I give you accurate information.
      Let me double-check and get back to you shortly.

  brand_check:
    enabled: true
    guide: ./source-of-truth/brand-guide.md
    enforce_tone: true         # Rewrite if tone doesn't match
    blocked_words:             # Never say these to customers
      - "I'm an AI"
      - "I'm not sure"
      - "as a language model"
    required_sign_off: |
      Best regards,
      {agent_name}
      {company_name}

  hallucination_guard:
    enabled: true
    mode: strict               # strict = block, warn = flag but send
    check_against:
      - source_of_truth
      - crm_records
      - recent_conversations

  thread_isolation:
    enabled: true
    max_concurrent_per_agent: 10
    context_separation: strict  # Each thread gets its own context window

  error_recovery:
    enabled: true
    email_recall_window: 60s   # Can recall emails within 60 seconds
    draft_mode_for:            # These go through draft review first
      - discount_offers
      - refund_processing
      - contract_language
      - partnership_terms
    incident_notify: board     # Alert the founder on any error
    auto_revert:
      - published_content      # Can unpublish blog posts
      - scheduled_posts        # Can cancel scheduled social posts

# -----------------------------------------------------------
# Governance — what needs approval
# -----------------------------------------------------------
governance:
  hiring: board_approval
  budget_warning: 80
  budget_hard_stop: 100
  require_approval:
    - type: external_email
      threshold: first_contact  # First email to a new contact needs approval
      after_trust: auto_approve # Subsequent emails auto-approved
    - type: discount
      always: true              # All discounts need board approval
    - type: refund
      above: 50                 # Refunds over $50 need approval
    - type: payment
      always: true
    - type: contract
      always: true
    - type: partnership_reply
      always: true
  audit: full

# -----------------------------------------------------------
# Deadlines and SLAs
# -----------------------------------------------------------
deadlines:
  escalation:
    warning: 80%               # Alert at 80% of SLA time elapsed
    critical: 95%              # Escalate to CEO at 95%
    breach: board              # Alert founder on SLA breach
  follow_ups:
    enabled: true
    default_interval: 3d       # Follow up if no customer reply in 3 days
    max_follow_ups: 3          # Stop after 3 attempts

# -----------------------------------------------------------
# Agent performance tracking
# -----------------------------------------------------------
performance:
  enabled: true
  metrics:
    - tasks_completed
    - tasks_revised            # How often work was sent back
    - avg_task_duration
    - cost_per_task
    - customer_satisfaction    # From feedback surveys
    - sla_compliance           # % of SLAs met
    - hallucination_flags      # Times fact-check caught an error
  review_cycle: weekly         # Auto-generate performance report
  report_to: board

# -----------------------------------------------------------
# Agent conflict resolution
# -----------------------------------------------------------
conflicts:
  resolution_order:
    - hierarchy                # Manager's decision wins
    - source_of_truth          # Facts win over opinions
    - board_escalation         # Unresolved conflicts go to founder
  log_disagreements: true      # Track all agent disagreements for review

# -----------------------------------------------------------
# Heartbeats — when agents check for work
# -----------------------------------------------------------
heartbeat:
  default: "*/30 * * * *"
  content_writer: "0 9 * * 1-5"
  social_media: "0 10,15 * * *"
  support: "*/5 * * * *"      # Support checks every 5 minutes
  sales: "*/10 * * * *"       # Sales checks every 10 minutes

# -----------------------------------------------------------
# Interfaces — how the founder manages (3 paths, always in sync)
# -----------------------------------------------------------
interfaces:
  # Path 1: YAML — this file (devs edit directly, git version control)

  # Path 2: Dashboard UI
  dashboard:
    enabled: true
    port: 3100
    features:
      - visual_org_chart          # Drag-drop hierarchy editor
      - agent_config_forms        # Point-and-click agent setup
      - governance_toggles        # Toggle switches for approval rules
      - budget_sliders            # Drag to set per-agent budgets
      - workflow_editor           # Visual skill graph DAG builder
      - template_gallery          # Browse and preview company templates

  # Path 3: Chat management (Telegram / WhatsApp)
  telegram:
    enabled: true
    bot_token: ${TELEGRAM_BOT_TOKEN}
    management_commands: true      # /hire, /budget, /approve, /status, etc.
    natural_language: true         # "Set Maya's budget to $40" works too
    setup_wizard: true             # Full company setup via chat
  whatsapp:
    enabled: true
    business_id: ${WHATSAPP_BUSINESS_ID}
    management_commands: true
    natural_language: true
```

---

## Key Differentiators vs Paperclip

| Feature | Paperclip | AgentOrg |
|---------|-----------|----------|
| Target user | Teams, enterprises | Solo founders |
| Setup complexity | PostgreSQL + config | `npx agentorg init` |
| Agent capabilities | Black-box adapters | Built-in skills (browser, email, etc.) |
| Agent memory | None (stateless) | Persistent personality + knowledge |
| Agent personality | None | Consistent character per agent |
| Customer communication | None | Full inbox routing, multi-channel |
| CRM | None | Built-in customer database |
| Safety systems | None | Fact-check, brand-check, hallucination guard |
| Error recovery | None | Revert, recall, incident response |
| SLA tracking | None | Deadline monitoring + escalation |
| Skill graph | None | DAG workflows, dependency resolver, capability tree |
| Elastic scaling | None | Clone agents on demand for burst work |
| Multi-company | Data isolation only | Full portfolio management with separate P&Ls |
| Self-improvement | None | Agents analyze performance, propose workflow optimizations |
| Messaging interface | Dashboard only | Telegram, WhatsApp, Discord |
| Skill marketplace | None | Community skills + marketplace |
| Company templates | Clipmart (early) | Built-in YAML templates |
| Config format | UI-driven | YAML + Dashboard UI + Chat commands (3 paths, always synced) |
| Natural language mgmt | None | "Set Maya's budget to $40" via Telegram |

---

## Key Differentiators vs OpenClaw

| Feature | OpenClaw | AgentOrg |
|---------|----------|----------|
| Agent count | Single agent | Multi-agent teams (scalable to 50+) |
| Organization | None | Org charts, hierarchy, delegation |
| Cost control | None | Per-agent budgets + hard stops |
| Task management | Ad-hoc | Structured queue + skill graph DAGs |
| Governance | None | Approval gates + audit logs |
| Customer handling | Single chat thread | Multi-channel inbox with routing |
| CRM | None | Shared customer database |
| Safety | Basic | Fact-check, brand-check, hallucination guard |
| Error recovery | None | Revert, recall, incident response |
| SLA tracking | None | Deadline monitoring + escalation |
| Coordination | N/A | Agent-to-agent handoffs + conflict resolution |
| Elastic scaling | N/A | Clone agents for parallel work |
| Strategy testing | N/A | A/B test entire business models |
| Self-improvement | N/A | Company evolves its own workflows |
| Multi-company | N/A | Portfolio of 10+ businesses, one dashboard |
| External dependency | IS the runtime | Zero — fully self-contained, native skills |
| Skills ecosystem | 100+ community skills | Own marketplace + OpenClaw-format compatible |

---

## Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Monorepo setup (pnpm + Turbo)
- [ ] OSS boilerplate: CONTRIBUTING.md, AGENTS.md, CODE_OF_CONDUCT.md, SECURITY.md
- [ ] GitHub: issue templates, PR template, CODEOWNERS, FUNDING.yml
- [ ] CI pipeline: GitHub Actions (lint + typecheck + test on every PR)
- [ ] ESLint + Prettier config
- [ ] Vitest setup with unit test scaffolding
- [ ] Core control plane: org chart, task queue, basic budgets
- [ ] Base adapter interface
- [ ] Claude Agent SDK adapter (primary runtime — Read, Write, Edit, Bash, Glob, Grep)
- [ ] Anthropic API adapter (budget runtime — direct Messages API + function calling)
- [ ] Native skill: filesystem (read, write, list — wraps Claude Agent SDK tools)
- [ ] Native skill: browser (Puppeteer — headless browsing, ~150 lines)
- [ ] Native skill: email (SMTP send + IMAP receive — ~200 lines)
- [ ] SQLite database with Drizzle ORM
- [ ] REST API server + WebSocket for real-time sync
- [ ] Orchestrator: permission check + scope check + budget check
- [ ] YAML config parser + hot-reload on file change
- [ ] Config Path 1: YAML editing works (developers)
- [ ] Config Path 2: Basic dashboard UI (agent list, task board, budget sliders, governance toggles)
- [ ] Dashboard ↔ YAML sync: UI writes to YAML, file changes reflect in UI
- [ ] `npx agentorg init` CLI wizard (packages/cli)
- [ ] Web-based setup wizard (same questions as CLI, point-and-click)
- [ ] Thread isolation system (concurrent conversations)
- [ ] Basic error recovery (revert last action)
- [ ] Model routing (assign different models per agent role)
- [ ] Prompt caching structure (static prefix ordering for Anthropic cache)
- [ ] README as sales page (short, demo GIF, comparison table)

### Phase 2: Memory, Safety & Advanced Skills (Weeks 5-8)
- [ ] Skill system: full interface + registry + OpenClaw-format SKILL.md compatibility
- [ ] Native skill: CRM (contacts, deals, pipeline)
- [ ] Native skill: calendar (scheduling, follow-ups)
- [ ] Native skill: invoicing (Stripe integration)
- [ ] Native skill: messaging (Telegram, WhatsApp, Discord bridges)
- [ ] Skill graph Layer 1: dependency resolver (input/output contracts per skill)
- [ ] Per-agent memory (vector store)
- [ ] Shared knowledge base
- [ ] Source-of-truth document system
- [ ] Fact-check layer (validate against source-of-truth)
- [ ] Brand-check layer (enforce tone and terminology)
- [ ] Hallucination guard (detect unsupported claims)
- [ ] Agent personality persistence
- [ ] Context pruning engine (RAG for knowledge + memory)
- [ ] Response caching (semantic similarity cache)
- [ ] Skill shortcuts (bypass LLM for simple lookups)
- [ ] Conversation compression (rolling summary)
- [ ] Output length limits per action type

### Phase 3: Customer Communication & Chat Management (Weeks 9-12)
- [ ] Inbox router (classify intent, route to agent)
- [ ] Telegram bot: customer-facing (support, sales conversations)
- [ ] Telegram bot: founder management (Config Path 3)
- [ ] Chat commands: /status, /agents, /hire, /fire, /budget, /pause, /resume, /approve, /reject, /digest, /cost
- [ ] Telegram inline buttons for approve/reject actions
- [ ] Telegram setup wizard (full company setup via chat)
- [ ] WhatsApp bridge (customer-facing + founder management)
- [ ] Discord bot
- [ ] Live chat widget (embeddable)
- [ ] CRM: customer records, deal pipeline, interaction log
- [ ] SLA tracking + deadline escalation
- [ ] Follow-up automation (scheduled reminders)
- [ ] Outbound governance (approval gates for customer replies)
- [ ] Business hours + out-of-hours auto-reply
- [ ] Three-path sync: YAML ↔ Dashboard ↔ Chat all stay in sync via API + WebSocket

### Phase 4: Governance, Operations & Skill Graph (Weeks 13-16)
- [ ] Full governance system (tiered approval rules)
- [ ] Full orchestrator: all 6 checks (permission, scope, budget, rate, safety, approval)
- [ ] Full audit logging
- [ ] Budget alerts + hard stops
- [ ] Agent-to-agent communication protocol
- [ ] Structured handoffs (escalation with context transfer)
- [ ] Agent conflict resolution protocol
- [ ] Error recovery: email recall, content unpublish, post cancel
- [ ] Draft mode for sensitive outbound
- [ ] Incident log + notification system
- [ ] Heartbeat batching (CEO batch-reviews all agents in one call)
- [ ] Progressive response pipeline (cache → template → shortcut → haiku → sonnet)
- [ ] Skill graph Layer 2: workflow DAG engine (parse YAML, resolve dependencies, execute with parallel support)
- [ ] Built-in workflow templates: write_blog_post, handle_support_ticket, close_sale
- [ ] Workflow gate system (approval gates that block steps until approved)

### Phase 5: Performance, Analytics & Advanced UX (Weeks 17-20)
- [ ] Agent performance metrics (tasks, revisions, cost, SLA compliance)
- [ ] Weekly auto-generated performance reports
- [ ] Customer satisfaction tracking
- [ ] Company analytics dashboard (revenue, growth, efficiency)
- [ ] Agent onboarding system (new agents load company context)
- [ ] Agent replacement/migration (transfer personality + memory)
- [ ] Invoicing skill (Stripe + PDF generation)
- [ ] Calendar skill (scheduling, follow-ups)
- [ ] Skill graph Layer 3: auto-generated capability tree from installed skills + workflows
- [ ] Missing capabilities detection (what the company can't do yet + what to install)
- [ ] Skill marketplace auto-registration (new skills register in graph on install)
- [ ] Token savings dashboard (show cost without vs with optimization)
- [ ] Anthropic Batch API integration (50% off for non-urgent tasks)
- [ ] Cache analytics (hit rate, top cached queries, savings per agent)
- [ ] Auto-tuning: adjust cache TTL and similarity threshold based on performance
- [ ] Natural language chat management ("set Maya's budget to forty dollars")
- [ ] Visual org chart editor (drag-drop hierarchy, click to configure agent)
- [ ] Visual workflow editor (drag skill nodes, connect edges, set gates)
- [ ] Dashboard template gallery (browse, preview, one-click deploy)

### Phase 6: SDK, Marketplace & Launch (Weeks 21-24)
- [ ] SDK package (@agentorg/sdk): createSkill, createAdapter, createTemplate
- [ ] SDK testing utilities: mockOrchestrator, mockMemory, mockCRM
- [ ] SDK documentation + quickstart guide
- [ ] Publish @agentorg/sdk to npm
- [ ] Skill marketplace (publish, discover, install)
- [ ] Company templates: content-agency, ecommerce-support, saas-builder, consulting-firm, education
- [ ] Full examples/ with walkthroughs for each template
- [ ] Template import/export
- [ ] Docker deployment + release pipeline (GitHub Actions → ghcr.io)
- [ ] Production PostgreSQL support
- [ ] Org chart visual editor
- [ ] Mobile-responsive UI
- [ ] Documentation site (docs/ → hosted at docs.agentorg.dev)
- [ ] CHANGELOG.md + changeset automation
- [ ] Demo GIF/video for README
- [ ] Badges: CI status, npm version, license, GitHub stars
- [ ] Discord community setup
- [ ] "Good first issue" labels on starter tasks
- [ ] Public launch: GitHub + Product Hunt + Hacker News

### Future: Superpowers & Growth
- [ ] Elastic scaling: `agentorg scale <agent> --replicas N --duration T` (clone agents on demand)
- [ ] Multi-company portfolio: run 10+ isolated companies from one deployment and dashboard
- [ ] A/B strategy testing: spin up parallel companies with different strategies, compare results
- [ ] Self-improvement workflow: CEO agent analyzes performance, proposes workflow optimizations, founder approves
- [ ] Real-time monitoring + crisis response workflows (sentiment detection, auto-coordinated response)
- [ ] Capability gap detection: auto-suggest marketplace skills when a workflow can't be completed
- [ ] Strategic planning cycle (weekly/quarterly CEO agent proposals)
- [ ] Competitive intelligence agent (monitor competitors, report changes)
- [ ] Revenue/expense export for accounting
- [ ] Contract drafting + DocuSign integration
- [ ] Multi-language support (agents communicate in customer's language)
- [ ] Customer data privacy tools (GDPR deletion, consent tracking)

---

## Use Cases — Practical Businesses

### Case 1: SEO Content Agency ($3-8K/mo revenue)

Solo founder serves 5-10 clients with 4-8 blog posts per month each. Founder handles sales calls and final approvals only.

- **Agents:** Alex (CEO), Maya (writer), Kai (SEO), Sam (social), Linh (editor), James (account manager)
- **Output:** 30-40 posts/month
- **Cost:** $65/month AgentOrg
- **Skill graph:** seo.keywords → browser.research → write.draft → editor.review → ceo.approve → cms.publish → social.create → client.email
- **Template:** `npx agentorg init --template content-agency`

### Case 2: E-commerce Customer Service (saves $2-4K/mo)

Shopify store with 50-100 customer messages/day across email, Instagram, and live chat. Replaces 2 support reps.

- **Agents:** Linh (support), James (sales/upsell), Sam (social DMs), Alex (escalation)
- **Response time:** 2 minutes average, 24/7
- **Cost:** $45/month AgentOrg
- **Cache hit rate:** 60% — most common questions answered with zero LLM cost
- **Template:** `npx agentorg init --template ecommerce-support`

### Case 3: SaaS Product Builder (ship 5x faster)

Solo developer uses agents for everything except core coding: marketing, docs, support, QA, competitor monitoring.

- **Agents:** Alex (PM), Dev (bug fixes via Claude Agent SDK), QA (test writing), Maya (docs), Linh (support), Sam (marketing), Scout (competitor research)
- **Cost:** $95/month AgentOrg
- **Template:** `npx agentorg init --template saas-builder`

### Case 4: Freelance Consulting Firm ($5-15K/mo revenue)

Management consultant scales to a "firm." Agents handle lead gen, proposals, research, deliverables, and invoicing.

- **Agents:** Alex (partner), James (biz dev), Research (analyst), Maya (report writer), Admin (scheduling/invoicing)
- **Proposal turnaround:** 3 days (vs 2 weeks manually)
- **Cost:** $70/month AgentOrg
- **Template:** `npx agentorg init --template consulting-firm`

### Case 5: Online Education Business ($2-6K/mo revenue)

Course creator with 200 students. Agents handle student support, code reviews, content marketing, and community.

- **Agents:** Linh (student support), Dev (code reviewer via Claude Agent SDK), Maya (tutorials), Sam (marketing), Alex (feedback analysis)
- **Support response:** 5 minutes average, 24/7
- **Cost:** $55/month AgentOrg
- **Template:** `npx agentorg init --template education`

---

## Superpowers — What Agent Companies Can Do That Human Companies Can't

These capabilities are structurally impossible with human employees. This is the real value proposition — not "cheaper workers" but "businesses that couldn't exist before."

### 1. Instant Elastic Workforce

Clone any agent into 20 parallel workers in seconds. Land a huge client who needs 200 blog posts in 2 weeks? Scale your writer from 1 to 20 replicas — same personality, same brand knowledge, same quality. Scale back when the project ends. No hiring, no onboarding, no firing.

```bash
agentorg scale content_writer --replicas 20 --duration 2w
# 20 identical writers, all sharing memory and brand guide
# Cost: ~$150 extra for 2 weeks, not $15K in freelancer fees
# Auto-scales back to 1 after the project ends
```

### 2. A/B Test Entire Business Strategies

Spin up two completely separate companies — same product, different strategies — and run them simultaneously. One does enterprise cold outreach, the other does indie hacker content marketing. After 30 days, data tells you which wins. Kill the loser, double down on the winner. With humans, you'd pick one strategy and hope for months.

```yaml
# Two companies, one deployment, complete isolation
companies:
  - name: "Enterprise Play"
    template: enterprise-sales
    # Agents: cold outreach to CTOs, white papers, LinkedIn
  - name: "Indie Play"
    template: indie-marketing
    # Agents: SEO blogs, Twitter threads, community

# After 30 days: compare pipeline, revenue, cost per lead
# Kill the losing strategy. Redeploy those agents to the winner.
```

### 3. Perfect Institutional Memory

The company never forgets anything. A customer contacts you after 8 months of silence — the support agent instantly recalls every prior interaction, the original purchase, the support ticket, the customer's preferences. No employee turnover destroying knowledge. No "can you explain your issue again?" Every agent benefits from every other agent's accumulated learnings. The company at month 12 is dramatically better than at month 1 without anyone doing explicit training.

### 4. Real-Time Reactive Operations

Agents monitor data 24/7 and coordinate multi-department responses in minutes. At 2 AM, a Reddit post goes viral criticizing your product. A human team discovers this Monday morning — 3 days of damage. Your agent company spots it in 15 minutes: support agent prepares canned responses, social agent drafts a public update, CEO agent coordinates the response plan, and you wake up to a Telegram message: "Situation detected and handled. Here's what we did."

```yaml
workflows:
  crisis_response:
    trigger: sentiment_monitor.negative_spike
    steps:
      - id: detect
        skill: browser.monitor_mentions
        schedule: "*/15 * * * *"
        threshold: negative_count > 5
      - id: analyze
        skill: research.analyze_sentiment
        depends_on: [detect]
        agent: ceo
      - id: prepare_support
        skill: knowledge.create_canned_response
        depends_on: [analyze]
        agent: support
        parallel: true
      - id: public_response
        skill: social.post_update
        depends_on: [analyze]
        agent: social_media
        gate: board_approval
      - id: notify_founder
        skill: messaging.telegram_alert
        depends_on: [analyze]
        priority: urgent
```

### 5. Self-Improving Company

After 100 blog posts, the CEO agent analyzes performance data and discovers patterns: posts with a "key takeaways" section get 3x engagement, Tuesday morning publishing gets 40% more traffic, tool-specific topics outperform general advice by 2x. Without human intervention, the CEO proposes workflow improvements: add "key takeaways" as a required step, reschedule publishing, reprioritize topics. Founder approves via Telegram. The company just optimized itself.

```yaml
workflows:
  self_improve:
    schedule: "0 9 * * 1"                 # Every Monday morning
    steps:
      - id: analyze_performance
        skill: analytics.review_metrics
        agent: ceo
        input: { period: "last_30_days" }
      - id: identify_patterns
        skill: research.find_correlations
        depends_on: [analyze_performance]
      - id: propose_changes
        skill: workflow.suggest_improvements
        depends_on: [identify_patterns]
        output: { proposed_changes: "WorkflowDiff[]" }
      - id: founder_review
        gate: board_approval
        channel: telegram
      - id: apply_changes
        skill: workflow.update
        depends_on: [founder_review]
```

### 6. Multi-Company Portfolio

One person runs 10 micro-businesses in different niches from a single dashboard. Each is a separate AgentOrg company with its own agents, brand, customers, and P&L. Each company has 3-5 agents. Total: 30-50 agents across 10 businesses, all for under $500/month. Founder reviews daily digests from 10 CEO agents. Total time: 30 minutes/day. Impossible for one human to run 10 businesses — natural for agent companies.

```yaml
companies:
  - name: "DentistSEO"
    template: content-agency
    niche: dental practices
    agents: 4
    revenue: $2K/mo

  - name: "FintechContent"
    template: content-agency
    niche: fintech startups
    agents: 5
    revenue: $3K/mo

  - name: "ShopifySupport"
    template: ecommerce-support
    niche: fashion brands
    agents: 3
    revenue: $1.5K/mo

  # ... 7 more companies

# Total: ~40 agents, ~$400/month LLM + $20 server
# Combined revenue: $15-25K/month
# Founder time: 30 minutes/day
```

### Positioning

The pitch is not "AgentOrg: cheaper freelancers." It's "AgentOrg: run businesses that couldn't exist before." The target user isn't someone replacing their current team — it's someone building a kind of business that was previously impossible for one person.

---

## Quick Start (Target UX)

```bash
# Install
npx agentorg init

# Answer setup wizard:
#   Company name? > My AI Agency
#   Template? > Content Agency
#   Telegram bot? > Yes (paste token)
#   LLM provider? > Anthropic (paste API key)
#   Support email? > support@myagency.com

# Start
npx agentorg start

# Your agent company is now running.
# Open http://localhost:3100 for dashboard
# Or message your Telegram bot to manage from anywhere
# Customers can now contact support@myagency.com
```

---

## Skill Graph — From Individual Skills to Company Workflows

Skills are the building blocks (browser, email, CRM, filesystem). The skill graph is the blueprint that assembles them into workflows. Skills don't change — the graph adds a layer on top that defines how skills depend on each other, compose into reusable workflows, and roll up into a capability tree.

### The Full Stack

```
┌─────────────────────────────────────────────────┐
│  CAPABILITY TREE                                │
│  "What can my company do? What's missing?"      │
│  CEO agent reads this to understand the company  │
├─────────────────────────────────────────────────┤
│  WORKFLOW DAGs (Skill Graph Layer 2)             │
│  Reusable processes: write_blog, handle_ticket,  │
│  close_sale. Steps, dependencies, gates, forks.  │
├─────────────────────────────────────────────────┤
│  SKILL DEPENDENCIES (Skill Graph Layer 1)        │
│  send_email requires crm.get_contact first       │
│  publish_blog requires filesystem.read_file       │
├─────────────────────────────────────────────────┤
│  ORCHESTRATOR                                    │
│  Permission, scope, budget, rate, safety,        │
│  approval checks on every action                 │
├─────────────────────────────────────────────────┤
│  SKILLS (unchanged)                              │
│  browser, email, filesystem, CRM, invoicing,     │
│  calendar, messaging — individual plugins         │
└─────────────────────────────────────────────────┘
```

### Layer 1: Skill Dependencies

Skills have input/output contracts. The graph encodes what each skill needs and produces.

```yaml
skill_graph:
  dependencies:
    browser_research:
      requires: []                          # No dependencies, can start immediately
      output: { summaries: "string[]", sources: "url[]" }

    seo_keywords:
      requires: []                          # Independent, runs parallel with research
      output: { keywords: "string[]", volumes: "number[]" }

    write_draft:
      requires: [browser_research, seo_keywords]  # Needs both
      input:
        sources: "browser_research.output.summaries"
        keywords: "seo_keywords.output.keywords"
      output: { file_path: "string", word_count: "number" }

    send_email:
      requires: [crm.get_contact]           # Need email address first
      input: { to: "crm.contact.email" }

    publish_blog:
      requires: [filesystem.read_file]
      input: { content: "filesystem.file.content" }
      gates: [ceo_review]                   # Must pass approval gate

    create_invoice:
      requires: [crm.get_deal]
      input:
        amount: "crm.deal.value"
        contact: "crm.deal.contact_email"
```

The orchestrator checks dependencies BEFORE permission checks. If send_email requires crm.get_contact and the contact hasn't been loaded yet, the action is blocked regardless of permissions — the input data simply doesn't exist.

### Layer 2: Workflow DAGs

Common tasks follow the same pattern every time. Define them as reusable directed acyclic graphs (DAGs).

```yaml
workflows:
  write_blog_post:
    description: "Research, write, review, and publish a blog post"
    estimated_cost: $2.50
    estimated_time: 25m
    steps:
      - id: research
        skill: browser_research
        parallel: true                     # Runs at same time as seo
        agent: content_writer
      - id: seo
        skill: seo_keywords
        parallel: true                     # Independent of research
        agent: seo_analyst
      - id: draft
        skill: write_draft
        depends_on: [research, seo]        # Needs both to start
        agent: content_writer
      - id: fact_check
        skill: safety.fact_check
        depends_on: [draft]
        auto: true                         # No agent needed
      - id: review
        skill: ceo_review
        depends_on: [fact_check]
        gate: approval                     # Blocks until CEO approves
      - id: publish
        skill: cms_publish
        depends_on: [review]
        agent: content_writer
      - id: social
        skill: create_social_posts
        depends_on: [review]               # Parallel with publish
        agent: social_media
      - id: promo_email
        skill: send_promo_email
        depends_on: [publish, social]      # Needs both done
        gate: board_approval               # Founder must approve

  handle_support_ticket:
    description: "Look up customer, search knowledge base, reply"
    estimated_cost: $0.15
    estimated_time: 3m
    steps:
      - id: lookup
        skill: crm.get_contact
        agent: support
      - id: check_history
        skill: crm.get_history
        depends_on: [lookup]
        agent: support
      - id: search_kb
        skill: knowledge_base.search
        parallel: true                     # Runs alongside history check
        agent: support
      - id: draft_reply
        skill: compose_reply
        depends_on: [check_history, search_kb]
        agent: support
      - id: safety_check
        skill: safety.fact_check
        depends_on: [draft_reply]
        auto: true
      - id: send
        skill: email.reply
        depends_on: [safety_check]
        agent: support

  close_sale:
    description: "Research prospect, write proposal, follow up"
    estimated_cost: $1.80
    estimated_time: 15m
    steps:
      - id: research_prospect
        skill: browser_research
        agent: sales
      - id: check_crm
        skill: crm.get_deal
        agent: sales
      - id: compose_proposal
        skill: write_proposal
        depends_on: [research_prospect, check_crm]
        agent: sales
      - id: review
        skill: ceo_review
        depends_on: [compose_proposal]
        gate: approval
      - id: send_proposal
        skill: email.send
        depends_on: [review]
        agent: sales
      - id: schedule_followup
        skill: calendar.schedule
        depends_on: [send_proposal]
        delay: 3d                          # 3 days after send
        agent: sales
```

The orchestrator resolves the DAG at runtime: identifies which steps can run in parallel, respects dependencies, enforces gates, and tracks progress. The agent doesn't need to figure out the order — the graph tells it.

### Layer 3: Capability Tree

Auto-generated from installed skills + defined workflows. The CEO agent reads this to understand what the company can and can't do.

```yaml
capabilities:
  content:
    blog_posts:
      workflow: write_blog_post
      agents: [content_writer, seo_analyst, social_media]
      skills_required: [browser, filesystem, seo_keywords, cms, email]
      avg_cost: $2.50 per post
      avg_time: 25 minutes
      status: operational
    social_campaigns:
      workflow: create_social_campaign
      agents: [social_media]
      skills_required: [messaging, browser]
      avg_cost: $0.50 per campaign
      status: operational

  sales:
    lead_qualification:
      workflow: qualify_lead
      agents: [sales]
      skills_required: [browser, crm, email]
      status: operational
    proposals:
      workflow: close_sale
      agents: [sales, ceo]
      skills_required: [browser, crm, email, calendar]
      status: operational
    invoicing:
      workflow: create_and_send_invoice
      agents: [sales]
      skills_required: [crm, invoicing, email]
      status: operational

  support:
    ticket_resolution:
      workflow: handle_support_ticket
      agents: [support]
      skills_required: [crm, knowledge_base, email]
      sla: 30m first response
      status: operational

  missing_capabilities:
    - name: design
      reason: "No design skill installed"
      fix: "Install figma-skill from marketplace"
    - name: video
      reason: "No video editing skill"
      fix: "Install video-editor-skill from marketplace"
    - name: accounting
      reason: "No accounting integration"
      fix: "Install quickbooks-skill from marketplace"
```

When a new skill is installed from the marketplace, it registers in the graph with its inputs, outputs, and dependencies. The capability tree auto-updates. The CEO agent immediately knows a new capability is available.

---

## Core Interfaces

### Adapter Interface
```typescript
type RuntimeType = 'claude-agent-sdk' | 'anthropic-api' | 'openclaw' | 'codex' | 'http' | 'script';

interface AgentAdapter {
  id: string;
  name: string;
  runtime: RuntimeType;

  // Lifecycle
  initialize(config: AgentConfig): Promise<void>;
  shutdown(): Promise<void>;

  // Task execution
  executeTask(task: Task, context: TaskContext): Promise<TaskResult>;

  // Customer conversation (isolated thread)
  handleConversation(thread: ConversationThread): Promise<ConversationReply>;

  // Heartbeat — agent checks for work
  heartbeat(agent: Agent): Promise<HeartbeatResult>;

  // Skills available to this adapter
  getAvailableSkills(): Skill[];

  // Cost tracking — how many tokens did this action use
  getLastTokenUsage(): TokenUsage;
}

// Built-in adapters:
// 1. ClaudeAgentAdapter   — primary, full Claude Code toolset + native skills
// 2. AnthropicAPIAdapter  — budget, direct Messages API + function calling
// External adapters:
// 3. OpenClawAdapter      — talks to OpenClaw via HTTP
// 4. CodexAdapter         — talks to OpenAI Codex via CLI/API
// 5. HTTPAdapter          — generic, plug in Cursor/Devin/Manus/anything
// 6. ScriptAdapter        — runs local Python/Bash scripts
```

### Skill Interface
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;

  // What this skill can do
  capabilities: string[];

  // Execute a skill action
  execute(action: string, params: Record<string, any>): Promise<SkillResult>;

  // Undo the last action (for error recovery)
  revert?(actionId: string): Promise<RevertResult>;

  // Describe available actions (for LLM tool use)
  getToolDefinitions(): ToolDefinition[];
}

// Skills follow the Agent Skills SKILL.md format (open standard created by Anthropic,
// adopted by OpenClaw, Codex, Gemini CLI, and others). This means:
// - Community skills from the OpenClaw ecosystem install into your marketplace
// - Skills you build for AgentOrg work in Claude Code, Codex, and other compatible agents
// - You're part of the ecosystem without depending on any specific runtime
```

### Config Manager Interface (Three-Path Sync)
```typescript
interface ConfigManager {
  // Load config from YAML file
  load(filePath: string): Promise<CompanyConfig>;

  // Write a config change (from any path)
  update(path: string, value: any, source: ConfigSource): Promise<void>;

  // Watch for file changes (Path 1: developer edits YAML)
  watchFile(filePath: string, callback: (config: CompanyConfig) => void): void;

  // Get current config
  getCurrent(): CompanyConfig;

  // Validate a proposed change before applying
  validate(path: string, value: any): ValidationResult;

  // Hot-reload: apply changes without restart
  reload(): Promise<void>;
}

type ConfigSource = 'yaml_file' | 'dashboard_ui' | 'telegram' | 'whatsapp' | 'api';

// Every config change follows the same flow regardless of source:
// 1. validate(path, value)
// 2. update(path, value, source) → writes to YAML
// 3. reload() → hot-reload config
// 4. broadcast via WebSocket → all clients see the change
```

### Chat Manager Interface (Path 3: Telegram/WhatsApp)
```typescript
interface ChatManager {
  // Parse a command: "/budget maya 40" or "set Maya's budget to $40"
  parseCommand(message: string): ParsedCommand;

  // Execute a management action
  execute(command: ParsedCommand): Promise<CommandResult>;

  // Setup wizard flow
  startWizard(chatId: string): Promise<void>;
  handleWizardStep(chatId: string, response: string): Promise<WizardStep>;

  // Approval flow
  sendApprovalRequest(action: PendingApproval): Promise<void>;
  handleApprovalResponse(approvalId: string, approved: boolean, note?: string): Promise<void>;
}

interface ParsedCommand {
  type: 'structured' | 'natural_language';
  intent: 'hire' | 'fire' | 'budget' | 'pause' | 'resume' | 'approve' | 'reject'
        | 'status' | 'digest' | 'scale' | 'cost' | 'agents' | 'workflow';
  params: Record<string, any>;
  confidence: number;            // For NLP-parsed commands (0-1)
  rawMessage: string;
}

interface CommandResult {
  success: boolean;
  message: string;               // Human-readable response to send back
  configChanged: boolean;        // Did this modify the YAML?
  requiresConfirmation: boolean; // Should we ask "are you sure?"
}
```

### Skill Graph Interface
```typescript
interface SkillGraph {
  // Load workflow definitions from YAML
  loadWorkflows(config: WorkflowConfig): void;

  // Resolve a workflow into an execution plan
  resolve(workflowId: string, inputs: Record<string, any>): ExecutionPlan;

  // Execute a workflow step by step
  execute(plan: ExecutionPlan): AsyncIterator<StepResult>;

  // Check if a skill action's dependencies are satisfied
  checkDependencies(skill: string, action: string, context: AgentContext): DependencyResult;

  // Get the capability tree
  getCapabilities(): CapabilityTree;

  // Check what's missing
  getMissingCapabilities(): MissingCapability[];

  // Register a new skill in the graph (when installed from marketplace)
  registerSkill(skill: Skill): void;
}

interface ExecutionPlan {
  workflowId: string;
  steps: PlannedStep[];
  parallelGroups: PlannedStep[][];   // Steps that can run simultaneously
  gates: GateCheck[];                 // Approval points
  estimatedCost: number;
  estimatedTime: number;              // Minutes
}

interface PlannedStep {
  id: string;
  skill: string;
  action: string;
  dependsOn: string[];                // Step IDs that must complete first
  agent: string;                      // Which agent executes this
  inputs: Record<string, string>;     // Mapped from dependency outputs
  gate?: 'approval' | 'board_approval';
  parallel: boolean;
  delay?: string;                     // e.g. "3d" for follow-up scheduling
  auto?: boolean;                     // Runs without agent (e.g. fact-check)
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'failed';
}

interface CapabilityTree {
  categories: Record<string, {
    workflows: Record<string, {
      agents: string[];
      skills_required: string[];
      avg_cost: number;
      avg_time: number;
      status: 'operational' | 'degraded' | 'missing_skills';
    }>;
  }>;
  missing: MissingCapability[];
}

interface MissingCapability {
  name: string;
  reason: string;
  fix: string;                        // e.g. "Install figma-skill from marketplace"
  required_skills: string[];
}

interface DependencyResult {
  satisfied: boolean;
  missing: string[];                  // Which dependencies are not yet available
  available: Record<string, any>;     // Data that IS available from completed dependencies
}
```

### Safety Interface
```typescript
interface SafetyLayer {
  // Check outbound message before sending to customer
  validateOutbound(message: OutboundMessage): Promise<SafetyResult>;

  // Fact-check claims against source-of-truth
  factCheck(claims: string[], context: AgentContext): Promise<FactCheckResult>;

  // Brand consistency check
  brandCheck(message: string, brandGuide: BrandGuide): Promise<BrandCheckResult>;

  // Hallucination detection
  detectHallucination(message: string, sources: Source[]): Promise<HallucinationResult>;
}

interface SafetyResult {
  approved: boolean;
  issues: SafetyIssue[];        // What was wrong
  corrected?: string;           // Auto-corrected version (if possible)
  action: 'send' | 'block' | 'rewrite' | 'escalate';
}
```

### CRM Interface
```typescript
interface CRM {
  // Customer records
  createContact(data: ContactData): Promise<Contact>;
  getContact(id: string): Promise<Contact>;
  findByEmail(email: string): Promise<Contact | null>;
  updateContact(id: string, data: Partial<ContactData>): Promise<Contact>;

  // Interaction history (all agents can read)
  addInteraction(contactId: string, interaction: Interaction): Promise<void>;
  getHistory(contactId: string): Promise<Interaction[]>;

  // Deal pipeline
  createDeal(contactId: string, deal: DealData): Promise<Deal>;
  updateDealStage(dealId: string, stage: string): Promise<Deal>;
  getActivePipeline(): Promise<Deal[]>;

  // Follow-ups
  scheduleFollowUp(contactId: string, when: Date, agentId: string): Promise<void>;
  getDueFollowUps(agentId: string): Promise<FollowUp[]>;
}
```

### Memory Interface
```typescript
interface AgentMemory {
  // Per-agent persistent state
  getPersonality(agentId: string): Promise<string>;
  updatePersonality(agentId: string, update: string): Promise<void>;

  // Conversation history
  addMessage(agentId: string, message: Message): Promise<void>;
  getRecentMessages(agentId: string, limit: number): Promise<Message[]>;

  // Semantic search across agent's history
  search(agentId: string, query: string, limit: number): Promise<SearchResult[]>;

  // Export for agent replacement/migration
  exportAll(agentId: string): Promise<MemoryExport>;
  importAll(agentId: string, data: MemoryExport): Promise<void>;
}

interface KnowledgeBase {
  // Shared company knowledge
  add(document: Document): Promise<void>;
  search(query: string, limit: number): Promise<SearchResult[]>;

  // Scoped to specific agents/roles
  getForAgent(agentId: string, query: string): Promise<SearchResult[]>;

  // Source of truth (for fact-checking)
  getSourceOfTruth(category: string): Promise<Document>;
  validateClaim(claim: string): Promise<ValidationResult>;
}
```

### Deadline Interface
```typescript
interface DeadlineTracker {
  // SLA management
  startSLA(ticketId: string, slaConfig: SLAConfig): Promise<void>;
  checkSLAStatus(ticketId: string): Promise<SLAStatus>;

  // Task deadlines
  setDeadline(taskId: string, deadline: Date): Promise<void>;
  getAtRiskDeadlines(): Promise<TaskDeadline[]>;

  // Follow-up scheduling
  scheduleFollowUp(params: FollowUpParams): Promise<void>;
  getOverdueFollowUps(): Promise<FollowUp[]>;

  // Escalation
  escalate(ticketId: string, reason: string): Promise<void>;
}

interface SLAStatus {
  ticketId: string;
  elapsed: number;             // Minutes since creation
  limit: number;               // SLA limit in minutes
  percentage: number;          // 0-100
  status: 'ok' | 'warning' | 'critical' | 'breached';
}
```

### Error Recovery Interface
```typescript
interface ErrorRecovery {
  // Revert a specific action
  revert(actionId: string): Promise<RevertResult>;

  // Recall a sent email (if within recall window)
  recallEmail(emailId: string): Promise<RecallResult>;

  // Unpublish content
  unpublish(contentId: string): Promise<void>;

  // Cancel scheduled posts
  cancelScheduled(scheduleId: string): Promise<void>;

  // Log an incident
  createIncident(params: IncidentParams): Promise<Incident>;

  // Get all open incidents
  getOpenIncidents(): Promise<Incident[]>;
}
```

### Performance Interface
```typescript
interface PerformanceTracker {
  // Per-agent metrics
  getAgentMetrics(agentId: string, period: DateRange): Promise<AgentMetrics>;

  // Company-wide metrics
  getCompanyMetrics(period: DateRange): Promise<CompanyMetrics>;

  // Generate weekly report
  generateReport(period: DateRange): Promise<PerformanceReport>;
}

interface AgentMetrics {
  agentId: string;
  tasksCompleted: number;
  tasksRevised: number;        // Sent back for revision
  revisionRate: number;        // % of tasks that needed revision
  avgTaskDuration: number;     // Minutes
  costTotal: number;           // USD spent
  costPerTask: number;
  slaCompliance: number;       // % of SLAs met
  customerSatisfaction: number; // Average rating
  hallucinationFlags: number;  // Times safety layer caught an error
  conversationsHandled: number;
}
```

### Token Optimizer Interface
```typescript
interface TokenOptimizer {
  // Response pipeline — try cheap methods before expensive ones
  processQuery(query: CustomerQuery): Promise<OptimizedResponse>;

  // Context building — prune to only what's relevant
  buildContext(agentId: string, task: Task): Promise<PrunedContext>;

  // Cache management
  getCachedResponse(query: string, agentId: string): Promise<CachedResponse | null>;
  cacheResponse(query: string, response: string, agentId: string): Promise<void>;
  invalidateCache(pattern: string): Promise<number>;

  // Model selection
  selectModel(agentId: string, taskType: string): ModelSelection;

  // Conversation compression
  compressHistory(messages: Message[]): Promise<CompressedHistory>;

  // Metrics
  getTokenUsage(agentId: string, period: DateRange): Promise<TokenUsageReport>;
  getCacheHitRate(agentId: string, period: DateRange): Promise<number>;
  getSavingsReport(period: DateRange): Promise<SavingsReport>;
}

interface PrunedContext {
  systemPrompt: string;          // Full or compressed depending on position
  conversationHistory: string;   // Last N messages + summary of older
  relevantKnowledge: string[];   // RAG-retrieved chunks only
  relevantMemory: string[];      // RAG-retrieved agent memories only
  crmContext: Record<string, any>; // Only relevant fields
  totalTokens: number;           // Estimated token count
  savedTokens: number;           // Tokens avoided by pruning
}

interface OptimizedResponse {
  source: 'cache' | 'template' | 'skill_shortcut' | 'haiku' | 'sonnet';
  response: string;
  tokensUsed: number;
  costUsd: number;
  cacheHit: boolean;
  modelUsed: string | null;      // null if cache/template/shortcut
}

interface SavingsReport {
  period: DateRange;
  totalCostWithout: number;      // What it would have cost unoptimized
  totalCostWith: number;         // What it actually cost
  savedUsd: number;
  savedPercent: number;
  breakdown: {
    modelRouting: number;        // Saved by using cheaper models
    caching: number;             // Saved by cache hits
    contextPruning: number;      // Saved by sending fewer tokens
    promptCaching: number;       // Saved by Anthropic prompt cache
    batchApi: number;            // Saved by batch processing
    skillShortcuts: number;      // Saved by skipping LLM entirely
  };
}
```

---

## Orchestrator — The Central Policy Engine

The orchestrator is the core of the system. Every action any agent attempts — send an email, browse a website, save a file, talk to a customer, talk to another agent — passes through the orchestrator first. Nothing reaches a skill, a customer, or another agent without being checked.

### Decision Pipeline

Every action passes through 6 checks in order. If any check fails, the action is blocked, rewritten, or queued — it never reaches the target.

```
Agent attempts action
        │
        ▼
┌─ 1. PERMISSION CHECK ──── Does this agent have this skill?
│       │ No → BLOCKED (logged)
│       ▼
├─ 2. SCOPE CHECK ────────── Is the target within their territory?
│       │ No → BLOCKED (logged)
│       ▼
├─ 3. BUDGET CHECK ───────── Can they afford this action?
│       │ No → BLOCKED (agent paused, founder notified)
│       ▼
├─ 4. RATE LIMIT ─────────── Too many actions in time window?
│       │ No → THROTTLED (retry after cooldown)
│       ▼
├─ 5. SAFETY CHECK ───────── Is the output safe? (fact-check, brand-check, hallucination)
│       │ Fail → REWRITTEN or BLOCKED
│       ▼
└─ 6. APPROVAL CHECK ─────── Does this need someone's sign-off?
        │ Yes → QUEUED for founder/manager approval
        ▼
    ACTION EXECUTED
        │
        ▼
    LOGGED TO AUDIT TRAIL
```

Each check takes 1-5ms. The full pipeline runs in under 20ms. Agents don't notice the delay.

### Four Possible Outcomes

- **ALLOWED** — All checks pass. Action executes immediately.
- **BLOCKED** — Permission or scope check fails. Action is denied and logged. Agent is told why.
- **REWRITTEN** — Safety check flags an issue (wrong tone, blocked phrase, unsupported claim). The orchestrator auto-corrects and sends the fixed version.
- **QUEUED** — Approval check triggers. Action is held until the founder (or a manager agent) approves via Telegram/dashboard.

### Per-Agent Rules (The Employee Handbook)

```yaml
orchestrator:
  # Pipeline configuration
  checks:
    - permission      # Does this agent have this skill?
    - scope           # Is the target within their territory?
    - budget          # Can they afford this action?
    - rate_limit      # Are they doing too much too fast?
    - safety          # Is the output safe for customers?
    - approval        # Does this need someone's sign-off?

  # Per-agent rules
  rules:
    content_writer:
      allowed_skills: [browser, filesystem]
      blocked_skills: [email, crm, payment, invoicing]
      filesystem_scope: /content/**
      can_message: [ceo, seo_analyst]
      cannot_message: [sales, support]
      rate_limits:
        browser_sessions: 20/day
        file_writes: 50/day
      auto_approve: [save_draft, research]
      needs_approval: [publish, delete]

    sales:
      allowed_skills: [browser, email, crm, calendar, invoicing]
      blocked_skills: [filesystem, messaging]
      email_scope: leads_and_customers
      crm_access: read_write
      can_message: [ceo]
      rate_limits:
        emails: 50/day
        invoices: 10/day
      auto_approve: [send_email, create_invoice]
      needs_approval: [discount, refund, contract]
      value_limits:
        invoice_max: 500
        discount_max: 0         # All discounts need approval

    support:
      allowed_skills: [email, crm]
      blocked_skills: [browser, filesystem, payment]
      crm_access: read_write
      can_message: [ceo]
      rate_limits:
        concurrent_conversations: 10
      auto_approve: [reply_ticket, update_contact, refund_under_50]
      needs_approval: [refund_over_50, product_commitment]
      blocked_phrases:
        - "I don't know"
        - "I'm not sure"
        - "I'm an AI"
      rewrite_to: escalation_language

    ceo:
      allowed_skills: [browser, email, crm, calendar]
      crm_access: read_write
      can_message: [all]
      auto_approve: [assign_task, review_work, internal_message]
      needs_approval: [partnership_reply, hire_agent, change_budget]
      cannot_self_approve: true
      value_limits:
        spend_per_action: 100
```

### Orchestrator Interface

```typescript
interface Orchestrator {
  // Main entry point — every agent action goes through here
  evaluate(action: AgentAction): Promise<OrchestratorDecision>;

  // Load rules from YAML config
  loadRules(config: OrchestratorConfig): void;

  // Real-time rule updates (founder changes config, takes effect immediately)
  reloadRules(): Promise<void>;

  // Query current state
  getAgentPermissions(agentId: string): AgentPermissions;
  getBudgetStatus(agentId: string): BudgetStatus;
  getRateLimitStatus(agentId: string): RateLimitStatus;
  getPendingApprovals(): PendingApproval[];

  // Approval management
  approve(approvalId: string, approvedBy: string): Promise<void>;
  reject(approvalId: string, reason: string): Promise<void>;
}

interface AgentAction {
  agentId: string;
  skill: string;              // Which skill: 'email', 'browser', 'crm', etc.
  action: string;             // What action: 'send', 'read', 'write', 'delete'
  target: string;             // Target: email address, file path, CRM record ID
  content?: string;           // Outbound content (for safety check)
  estimatedCost?: number;     // Estimated token cost
  metadata: Record<string, any>;
}

interface OrchestratorDecision {
  status: 'allowed' | 'blocked' | 'rewritten' | 'queued';
  action: AgentAction;
  correctedContent?: string;  // If rewritten, the fixed version
  reason?: string;            // Why it was blocked/rewritten/queued
  approvalId?: string;        // If queued, the approval request ID
  checks: CheckResult[];      // Results of all 6 checks
  latencyMs: number;          // Total decision time
}

interface CheckResult {
  check: 'permission' | 'scope' | 'budget' | 'rate_limit' | 'safety' | 'approval';
  passed: boolean;
  reason?: string;
  latencyMs: number;
}
```

---

## System Requirements

### Minimum Requirements

| Component | Local Dev | Production (Small) | Production (Scaled) |
|-----------|-----------|-------------------|-------------------|
| CPU | 4+ cores (any modern) | 2 vCPU shared | 4-8 vCPU dedicated |
| RAM | 8GB (16GB recommended) | 4GB | 16-32GB |
| Storage | 2GB | 40GB SSD | 100GB+ SSD |
| OS | macOS / Linux / Windows WSL2 | Ubuntu 22+ / Debian 12+ | Ubuntu 22+ / Debian 12+ |
| Node.js | v22+ | v22+ | v22+ |
| Database | SQLite (embedded) | PostgreSQL 16 | Managed PostgreSQL |
| Redis | Not needed (in-process) | Redis 7 (same VPS) | Managed Redis |
| Docker | Optional | Yes (agent sandboxing) | Yes |
| SSL | Not needed | Caddy (auto SSL) | Caddy or cloud LB |

### Runtime Processes (Production)

```
┌─────────────────────────────────────────────────────┐
│  YOUR VPS (single machine, $5-20/month)             │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ AgentOrg Server (Node.js)                   │    │
│  │  ├── REST API (port 3100)                   │    │
│  │  ├── WebSocket (real-time dashboard)         │    │
│  │  ├── Orchestrator (policy engine)            │    │
│  │  ├── Scheduler (heartbeats, follow-ups)      │    │
│  │  ├── Inbox Router (customer messages)        │    │
│  │  └── React Dashboard (static files)          │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Agent Containers (Docker)                    │    │
│  │  ├── agent-ceo (Agent SDK / Sonnet)          │    │
│  │  ├── agent-writer (Agent SDK / Sonnet)       │    │
│  │  ├── agent-sales (Agent SDK / Sonnet)        │    │
│  │  ├── agent-support (Anthropic API / Haiku)   │    │
│  │  └── agent-social (Anthropic API / Haiku)    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │PostgreSQL│ │  Redis   │ │  Vector Store    │    │
│  │  (data)  │ │ (queue)  │ │ (agent memory)   │    │
│  └──────────┘ └──────────┘ └──────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Caddy (reverse proxy + auto SSL)             │    │
│  │  ├── yourdomain.com → Dashboard              │    │
│  │  ├── yourdomain.com/api → REST API           │    │
│  │  └── yourdomain.com/ws → WebSocket           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  External connections:                              │
│  → Anthropic API (LLM calls)                        │
│  → Telegram API (founder + customer bots)           │
│  → SMTP/IMAP (email sending/receiving)              │
│  → Stripe (invoicing, payments)                     │
│  → WhatsApp Business API                            │
└─────────────────────────────────────────────────────┘
```

### Performance Profile

| Component | Latency | Cost Impact |
|-----------|---------|------------|
| Orchestrator (6 checks) | 5-20ms | None (runs locally) |
| Database query | 1-10ms | None |
| Memory / vector lookup | 10-50ms | None |
| Safety checks (fact + brand) | 20-100ms | None (local embeddings) |
| LLM API call (the bottleneck) | 3-30s | 95% of total cost |
| Skill execution (browser, email) | 1-15s | Minimal |

**The LLM API is 95% of latency and 99% of cost.** Everything else is noise. The system itself is extremely lightweight — the real expense is AI thinking.

### Token Optimization — 10 Strategies

The LLM API is 99% of operating cost. Without optimization, a 5-agent company costs ~$250/month. With all 10 strategies applied, the same company costs ~$55/month — a 78% reduction.

**The core problem:** 98% of tokens sent to the LLM are context (system prompt, conversation history, knowledge base, CRM data, agent memory). Only 2% is the actual response. Most of that context is irrelevant to the specific question being answered.

#### Strategy 1: Model Routing (saves 50-70%)

Not every agent needs the smartest model. Match the model to the task complexity.

```yaml
model_routing:
  default: claude-haiku-4-5-20251001          # Cheap default
  high_quality_roles: [ceo, sales, content_writer]
  high_quality_model: claude-sonnet-4-20250514
  revision_model: claude-haiku-4-5-20251001   # Cheap for small edits
```

Result: Support at $0.25/M tokens instead of $3/M. 12x cheaper for the same quality on simple questions.

#### Strategy 2: Response Caching (saves 30-50% for support)

80% of support questions are the same 20 questions rephrased. Cache the answers.

```yaml
cache:
  enabled: true
  strategy: semantic              # Match by meaning, not exact text
  similarity_threshold: 0.92
  ttl: 7d
  exclude: [sales_conversations, partnership_replies]
```

How it works: customer asks "how do I get a refund?" — system embeds the question, finds a 0.95 match from 3 days ago, returns cached answer. Zero LLM cost.

#### Strategy 3: Context Pruning (saves 50-78% per call)

Instead of dumping everything into the LLM, retrieve only relevant chunks.

```yaml
context:
  conversation_history:
    recent_messages: 3            # Keep last 3 verbatim
    older_messages: summary       # Summarize the rest into 2-3 sentences
    summary_model: haiku
  knowledge_base:
    strategy: rag                 # Retrieve only matching chunks
    top_k: 3
  crm:
    strategy: relevant_fields     # Don't send full record
    always_include: [name, email, last_interaction]
  agent_memory:
    strategy: rag
    top_k: 5
  system_prompt:
    first_message: full           # Full prompt on first message
    subsequent: compressed        # Compressed on follow-ups
```

Result: 20,500 tokens per call down to 4,500 tokens per call.

#### Strategy 4: Anthropic Prompt Caching (saves 70-90% on input)

Anthropic automatically caches repeated prompt prefixes at 90% discount. Structure every call with static content first.

```typescript
// Static block (cached at 90% discount) — same every call
const staticPrefix = [systemPrompt, companyKnowledge, agentPersonality];

// Dynamic block (full price, but small) — changes every call
const dynamicContent = [customerMessage, recentContext];

// 80% of tokens are in the static block → 90% cached
// Full price only on the small dynamic portion
```

Result: $0.009 per call down to $0.0025. Zero code changes — just restructure the message order.

#### Strategy 5: Heartbeat Batching (saves 60-70% on heartbeats)

Instead of 5 agents each making a separate "what should I do?" call, the CEO agent reviews all pending work in one batched call and assigns tasks.

```yaml
heartbeat:
  strategy: batched
  batch_via: ceo                  # One call replaces five
```

Result: 15,000 tokens per heartbeat cycle down to 5,000.

#### Strategy 6: Progressive Response (saves 30-50%)

Try cheap methods first. Only escalate to the expensive model when simpler approaches fail.

```yaml
response_pipeline:
  - check: cache                  # FREE — return cached answer
  - check: template_match         # FREE — canned response
  - check: skill_shortcut         # FREE — database lookup
  - check: haiku_if_simple        # CHEAP — $0.001 per call
  - check: sonnet_if_complex      # FULL PRICE — only if needed
```

#### Strategy 7: Conversation Summarization (saves 40-70% on long conversations)

A 20-message conversation doesn't need all 20 messages in context. Summarize the first 17 into 2-3 sentences.

```yaml
conversation_compression:
  enabled: true
  summarize_after: 5              # Compress when history > 5 messages
  keep_recent: 3                  # Last 3 messages verbatim
  summary_model: haiku            # Cheap model for summarization
  summary_max_tokens: 200
```

Result: 8,000 tokens of history compressed to 800 tokens.

#### Strategy 8: Skill Shortcuts (saves 100% when matched)

Some actions don't need an LLM at all. Order status is a database query. Business hours is a config lookup.

```yaml
skill_shortcuts:
  - pattern: "order status {order_id}"
    action: crm.getOrder(order_id)
    template: "Your order #{order_id} is currently {status}."
  - pattern: "business hours"
    action: config.getHours
    template: "We're available {hours}."
  - pattern: "schedule follow-up {contact} {date}"
    action: calendar.schedule(contact, date)
    template: "Follow-up scheduled with {contact} on {date}."
```

Result: 15-25% of all actions handled with zero LLM calls.

#### Strategy 9: Output Length Control (saves 15-25% on output)

Output tokens cost 5x more than input tokens on Sonnet. Set limits per action type so agents don't ramble.

```yaml
output_limits:
  support_reply: 300              # Short, direct answers
  sales_email: 500                # Concise but persuasive
  blog_draft: 3000                # Long-form is expected
  social_post: 100                # Punchy and brief
  internal_message: 200           # Between agents, keep tight
  daily_digest: 500               # Summary for founder
```

#### Strategy 10: Batch API for Non-Urgent Work (saves 50%)

Anthropic's Batch API offers 50% discount for results delivered within 24 hours. Perfect for overnight tasks.

```yaml
batch_api:
  enabled: true
  eligible:
    - blog_drafts
    - seo_audits
    - weekly_reports
    - competitive_research
```

Result: Blog drafts, SEO audits, and weekly reports at half price.

### Full Optimization Config

```yaml
optimization:
  model_routing:
    default: claude-haiku-4-5-20251001
    high_quality_roles: [ceo, sales, content_writer]
    high_quality_model: claude-sonnet-4-20250514
    revision_model: claude-haiku-4-5-20251001

  cache:
    enabled: true
    strategy: semantic
    similarity_threshold: 0.92
    ttl: 7d
    exclude: [sales_conversations, partnership_replies]

  context:
    conversation_history:
      recent_messages: 3
      older_messages: summary
      summary_model: haiku
    knowledge_base:
      strategy: rag
      top_k: 3
    crm:
      strategy: relevant_fields
    agent_memory:
      strategy: rag
      top_k: 5
    system_prompt:
      first_message: full
      subsequent: compressed

  prompt_caching:
    enabled: true
    static_prefix: [system_prompt, company_knowledge, agent_personality]

  heartbeat:
    strategy: batched
    batch_via: ceo

  response_pipeline:
    - check: cache
    - check: template_match
    - check: skill_shortcut
    - check: haiku_if_simple
    - check: sonnet_if_complex

  conversation_compression:
    enabled: true
    summarize_after: 5
    keep_recent: 3
    summary_model: haiku
    summary_max_tokens: 200

  skill_shortcuts:
    - pattern: "order status *"
      action: crm.getOrder
    - pattern: "business hours"
      action: config.getHours
    - pattern: "schedule follow-up *"
      action: calendar.schedule

  output_limits:
    support_reply: 300
    sales_email: 500
    blog_draft: 3000
    social_post: 100
    internal_message: 200
    daily_digest: 500

  batch_api:
    enabled: true
    eligible: [blog_drafts, seo_audits, weekly_reports, competitive_research]
```

### Combined Impact

| | Without Optimization | With All 10 Strategies |
|---|---|---|
| CEO agent | $40/month | $12/month |
| Content writer | $35/month | $10/month |
| Sales agent | $45/month | $14/month |
| Support agent | $102/month | $8/month |
| Social agent | $20/month | $3/month |
| Infrastructure | $8/month | $8/month |
| **Total** | **$250/month** | **$55/month** |
| **Savings** | | **78% reduction** |

---

## Monthly Cost Estimates (After Optimization)

### Solo Founder — 5-agent content agency

| Item | Cost |
|------|------|
| VPS (Hetzner CX22 — 2 vCPU, 4GB) | $5 |
| Domain + SSL (Cloudflare) | $1 |
| LLM — Sonnet agents (CEO + writer + sales, optimized) | $25-40 |
| LLM — Haiku agents (support + social, cached) | $5-12 |
| Email sending (Resend or SES) | $0-3 |
| Stripe fees | 2.9% + 30c per transaction |
| **Total** | **$36-61/month** |

### Growing Business — 15-agent company

| Item | Cost |
|------|------|
| VPS (Hetzner CX32 — 4 vCPU, 8GB) | $15 |
| Managed PostgreSQL (Supabase free tier) | $0 |
| LLM — Sonnet agents (5x, optimized) | $40-80 |
| LLM — Haiku agents (10x, cached + shortcuts) | $10-25 |
| Email + messaging | $5-10 |
| **Total** | **$70-130/month** |

---

## Agent Runtimes — Universal Orchestration

AgentOrg is a universal orchestration layer that coordinates ANY agent runtime. You don't compete with OpenClaw, Codex, or Cursor — you orchestrate all of them. Like Kubernetes for AI agents: you don't run the containers, you orchestrate them.

### The Adapter Pattern

Every runtime implements the same interface. The orchestrator doesn't care what's behind it — Claude, OpenClaw, Codex, Cursor, a Python script, a human via webhook. They all follow the same rules, same org chart, same budgets, same safety checks.

```typescript
interface AgentAdapter {
  runtime: RuntimeType;
  executeTask(task: Task, context: TaskContext): Promise<TaskResult>;
  heartbeat(agent: Agent): Promise<HeartbeatResult>;
  getAvailableSkills(): Skill[];
  getLastTokenUsage(): TokenUsage;
}

type RuntimeType =
  | 'claude-agent-sdk'    // Primary: full Claude Code toolset + native skills
  | 'anthropic-api'       // Budget: direct Messages API + function calling
  | 'openclaw'            // External: OpenClaw via HTTP
  | 'codex'               // External: OpenAI Codex via CLI/API
  | 'http'                // Generic: any service with an HTTP endpoint (Cursor, Devin, Manus, custom)
  | 'script';             // Local: Python/Bash scripts
```

### Built-in Adapters

**Claude Agent SDK (primary)** — best for agents needing reasoning + tools. Built-in Read/Write/Edit/Bash/Glob/Grep from Claude Code, plus your native skills as custom tools. Full orchestrator control — every action passes through your 6-check pipeline. Best for: CEO, writer, developer, research.

```typescript
class ClaudeAgentAdapter implements AgentAdapter {
  async executeTask(task, context) {
    const options: ClaudeAgentOptions = {
      system_prompt: context.personality,
      allowed_tools: ['Read', 'Write', 'Bash', ...context.nativeSkills],
      max_turns: 10,
      cwd: `/workspace/${task.agentId}`,
    };
    for await (const msg of query({ prompt: task.description, options })) {
      messages.push(msg);
    }
    return { result: messages, tokens: this.countTokens(messages) };
  }
}
```

**Anthropic API (budget)** — cheapest for simple agents. Direct Messages API with function calling. Your native skills exposed as tools. Full orchestrator control. Best for: support, social media.

```typescript
class AnthropicAPIAdapter implements AgentAdapter {
  async executeTask(task, context) {
    const response = await this.client.messages.create({
      model: context.model,
      system: context.personality,
      messages: [{ role: 'user', content: task.description }],
      tools: context.nativeSkills.map(s => s.getToolDefinition()),
    });
    return this.handleToolLoop(response, context);
  }
}
```

### External Runtime Adapters

**OpenClaw** — for users who already run OpenClaw and want to plug their existing agents in. Your orchestrator governs the agent, OpenClaw executes. Safety layer checks output before it reaches customers.

```typescript
class OpenClawAdapter implements AgentAdapter {
  async executeTask(task, context) {
    const response = await fetch(`http://${this.host}:${this.port}/api/message`, {
      method: 'POST',
      body: JSON.stringify({ message: task.description, context: context.personality }),
    });
    return response.json();
    // Result goes through orchestrator safety checks before acting
  }
}
```

**Codex** — for users who prefer OpenAI's coding agent. Codex runs as CLI or API.

```typescript
class CodexAdapter implements AgentAdapter {
  async executeTask(task, context) {
    const { stdout } = await exec(
      `codex --prompt "${task.description}" --cwd /workspace/${task.agentId}`
    );
    return { result: stdout };
  }
}
```

**Generic HTTP** — plug in literally anything. Cursor, Devin, Manus, a custom Python model, a local Llama instance. If it accepts HTTP and returns text, it's an agent.

```typescript
class HTTPAdapter implements AgentAdapter {
  async executeTask(task, context) {
    const response = await fetch(context.endpoint, {
      method: 'POST',
      body: JSON.stringify({ task: task.description, context: context.personality }),
    });
    return response.json();
  }
}
```

### Orchestrator Control by Runtime Type

| Runtime | Skills source | Orchestrator control | Token optimization |
|---------|--------------|---------------------|-------------------|
| Claude Agent SDK | Built-in + your native skills | Full — every action checked | Full — all 10 strategies apply |
| Anthropic API | Your native skills via function calling | Full — you make every call | Full — all 10 strategies apply |
| OpenClaw | OpenClaw's own skills | Partial — output checked, execution is black box | None — OpenClaw makes its own calls |
| Codex | Codex's own tools | Partial — output checked | None |
| HTTP (Cursor etc.) | External runtime's tools | Partial — output checked | None |

Trade-off: external runtimes give you access to ecosystems you don't own (OpenClaw's 50+ integrations, Codex's code generation, Cursor's IDE features). But you lose full orchestrator control and token optimization. Built-in runtimes give you full control at the cost of building skills yourself.

### Mixed-Runtime Company Example

```yaml
org:
  ceo:
    runtime: claude-agent-sdk        # Best reasoning, delegates to all
    model: claude-sonnet-4-20250514
    skills: [browser, email, calendar]

  developer:
    runtime: codex                   # User prefers OpenAI for coding
    endpoint: http://localhost:3300

  designer:
    runtime: http                    # Cursor running locally
    endpoint: http://localhost:8200

  content_writer:
    runtime: claude-agent-sdk        # Claude best for creative writing
    model: claude-sonnet-4-20250514
    skills: [browser, filesystem]

  sales:
    runtime: openclaw                # User has OpenClaw with CRM integrations
    openclaw_port: 3001

  support:
    runtime: anthropic-api           # Cheapest for simple Q&A
    model: claude-haiku-4-5-20251001
    skills: [crm, knowledge_base, email]

  social:
    runtime: anthropic-api           # Cheap for short posts
    model: claude-haiku-4-5-20251001
    skills: [messaging]
```

7 agents, 4 different runtimes, one orchestrator. The CEO manages all of them regardless of what runtime they use.

---

## Heartbeat System — The Engine That Makes the Company Alive

Without heartbeats, agents sit idle waiting to be told what to do. With heartbeats, they proactively wake up, check for work, act, and report — like real employees checking their inbox every morning.

### Heartbeat Cycle (5 steps)

1. **Wake** — cron or event triggers the agent's heartbeat
2. **Check** — agent checks: task queue (new work?), inbox (new messages?), deadlines (anything overdue?), monitoring (any alerts?)
3. **Plan** — agent prioritizes based on urgency, deadlines, and org chart priorities
4. **Act** — agent executes tasks using its skills. Every action passes through the orchestrator
5. **Report** — agent logs what it did, updates task status, escalates what it can't handle UP the org chart

### Two Types of Heartbeats

**Scheduled (cron-based):** predictable intervals per agent role.

```yaml
heartbeats:
  ceo:
    schedule: "0 */4 * * *"         # Every 4 hours
    tasks:
      - review_agent_status          # How's the team doing?
      - check_escalations            # Anything needing my attention?
      - review_pending_approvals     # Sign off on queued actions
      - plan_next_priorities         # What should the team focus on?
      - send_digest_to_founder       # Summary to Telegram

  support:
    schedule: "*/15 * * * *"        # Every 15 minutes
    tasks:
      - check_inbox                  # New customer messages?
      - check_sla_deadlines          # Tickets about to breach SLA?
      - follow_up_open_tickets       # Pending tickets need a nudge?

  content_writer:
    schedule: "0 */2 * * *"         # Every 2 hours
    tasks:
      - check_task_queue             # New writing assignments?
      - check_review_feedback        # Edits from CEO/editor?
      - continue_in_progress         # Resume unfinished drafts

  developer:
    schedule: "0 * * * *"           # Every hour
    tasks:
      - check_bug_reports            # New bugs from support?
      - check_pr_reviews             # PRs needing updates?
      - continue_coding              # Resume current task

  sales:
    schedule: "0 * * * *"           # Every hour
    tasks:
      - check_leads                  # New inbound leads?
      - follow_up_prospects          # Scheduled follow-ups due?
      - update_pipeline              # Move deals forward

  social:
    schedule: "*/30 * * * *"        # Every 30 minutes
    tasks:
      - post_scheduled_content       # Publish queued posts
      - check_engagement             # Reply to comments/DMs
```

**Reactive (event-triggered):** immediate wake on important events, no waiting for next cycle.

```yaml
heartbeats:
  reactive:
    - trigger: inbox.new_message
      agent: support
      priority: high                 # Wake support immediately

    - trigger: crm.deal_closed
      agent: ceo
      priority: normal               # CEO should know about wins

    - trigger: monitoring.negative_spike
      agent: ceo
      priority: urgent               # Crisis detection

    - trigger: sla.warning_80_percent
      agent: support
      priority: high                 # SLA about to breach

    - trigger: task.completed
      agent: ceo
      priority: normal               # CEO reviews completed work

    - trigger: github.pr_opened
      agent: developer
      priority: normal               # New PR to review

    - trigger: inbox.new_lead
      agent: sales
      priority: high                 # New prospect, act fast
```

### Delegation Flows Up and Down the Org Chart

```
Founder (board)
  │
  │ ← CEO sends daily digest UP (via Telegram)
  │ → Founder sends strategic goals DOWN (via Telegram/dashboard)
  │
  Alex (CEO) — heartbeat every 4h
  │
  ├── Maya (writer) — heartbeat every 2h
  │   ← Reports: "Draft done, ready for review"
  │   → Delegated: "Write 3 blog posts this week"
  │
  ├── Dev (developer) — heartbeat every 1h
  │   ← Reports: "Bug fixed, PR opened"
  │   → Delegated: "Fix the checkout bug from support ticket #247"
  │
  ├── James (sales) — heartbeat every 1h
  │   ← Reports: "Deal closed, $5K" / Escalates: "Custom pricing needed"
  │   → Delegated: "Follow up on 3 pending proposals"
  │
  ├── Linh (support) — heartbeat every 15m + reactive
  │   ← Escalates: "Refund over $50, need approval"
  │   → Delegated: "Handle tickets in priority order"
  │
  └── Sam (social) — heartbeat every 30m
      ← Reports: "5 posts published, 2K engagement"
      → Delegated: "Promote Maya's new blog post"
```

The CEO heartbeat is special — it's the "manager review" cycle:
1. Check all agents' status and progress
2. Handle escalations from below (refunds, custom pricing, incidents)
3. Create new tasks and delegate DOWN to the right agents
4. Report summary UP to founder via Telegram

### Heartbeat Batching (Token Optimization)

Instead of each agent making a separate LLM call for its heartbeat, the CEO batches all agent reviews into one call:

```
Without batching: 5 agents × 1 LLM call each = 5 calls per CEO heartbeat
With batching:    1 call that reviews all 5 agents at once = 1 call
Savings: 60-70% fewer tokens on CEO heartbeats
```

### Heartbeat Interface

```typescript
interface HeartbeatResult {
  agentId: string;
  runtime: RuntimeType;
  timestamp: Date;
  checked: {
    taskQueue: number;       // How many tasks found
    inbox: number;           // How many messages found
    deadlines: number;       // How many approaching deadlines
    alerts: number;          // How many monitoring alerts
  };
  acted: {
    tasksCompleted: number;
    messagesReplied: number;
    escalations: string[];   // What was escalated UP
    delegations: string[];   // What was delegated DOWN
  };
  tokensUsed: number;
  nextHeartbeat: Date;
}
```

---

## LLM Provider Configuration

The system supports multi-cloud deployment. Users are not locked to Anthropic's direct API.

```yaml
providers:
  # Option A: Direct Anthropic API (simplest)
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}

  # Option B: AWS Bedrock (data residency, IAM auth)
  # bedrock:
  #   region: us-east-1
  #   access_key_id: ${AWS_ACCESS_KEY_ID}
  #   secret_access_key: ${AWS_SECRET_ACCESS_KEY}

  # Option C: Google Cloud Vertex AI (scale-to-zero)
  # vertex:
  #   project_id: my-gcp-project
  #   region: us-central1

  # Option D: Microsoft Azure AI Foundry
  # azure:
  #   endpoint: https://my-resource.openai.azure.com
  #   api_key: ${AZURE_API_KEY}
```

| Provider | Auth | Data Residency | Pricing Diff | Best For |
|----------|------|---------------|-------------|----------|
| Anthropic Direct | API key | US/EU regions | Baseline | Most users |
| AWS Bedrock | IAM roles | Full AWS compliance | ~10-15% higher | Enterprise on AWS |
| GCP Vertex AI | Service account | GCP regions | Similar | Teams on GCP, 1M context |
| Azure AI Foundry | Azure AD | Azure compliance | Similar | Enterprise on Azure |

---

## Deployment Options

### Option 1: Local Development (Free)

```bash
npx agentorg init
npx agentorg start

# SQLite embedded, in-process task queue, no Docker
# Claude Agent SDK runs in-process
# Open http://localhost:3100 for dashboard
```

Best for: building, testing, demoing. Stops when your laptop sleeps.

### Option 2: Docker Compose on VPS (Recommended — $5-20/mo)

```bash
ssh your-vps
git clone https://github.com/you/agentorg
cd agentorg
cp .env.example .env           # Add API keys
docker compose up -d           # Everything starts
```

### docker-compose.yml

```yaml
services:
  # ── Core server (includes Claude Agent SDK in-process) ──
  server:
    image: agentorg/server:latest
    ports:
      - "3100:3100"
    environment:
      - DATABASE_URL=postgres://agentorg:${DB_PASSWORD}@postgres:5432/agentorg
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CUSTOMER_BOT=${TELEGRAM_CUSTOMER_BOT}
      - WHATSAPP_BUSINESS_ID=${WHATSAPP_BUSINESS_ID}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    volumes:
      - ./agentorg.config.yaml:/app/config.yaml:ro
      - ./source-of-truth:/app/source-of-truth:ro
      - agent-data:/app/data
      - agent-workspace:/workspace
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # ── Database ─────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=agentorg
      - POSTGRES_USER=agentorg
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  # ── Task queue + real-time events ────────────────
  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    restart: unless-stopped

  # ── Reverse proxy + auto SSL ─────────────────────
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
    depends_on:
      - server
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  agent-data:
  agent-workspace:
  caddy-data:
```

### .env.example

```bash
# Database
DB_PASSWORD=change-me-to-something-secure

# LLM Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-...
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# GCP_PROJECT_ID=...

# Telegram (founder management bot)
TELEGRAM_BOT_TOKEN=123456:ABC...

# Telegram (customer-facing bot)
TELEGRAM_CUSTOMER_BOT=789012:DEF...

# WhatsApp Business
WHATSAPP_BUSINESS_ID=your-business-id

# Email (SMTP)
SMTP_HOST=smtp.resend.com
SMTP_USER=resend
SMTP_PASS=re_...

# Stripe (invoicing)
STRIPE_SECRET_KEY=sk_live_...

# Internal security
ORCHESTRATOR_SECRET=generate-a-random-secret
```

### Option 3: AWS Bedrock + ECS (Enterprise)

```bash
# CloudFormation template provided
aws cloudformation deploy \
  --template-file infra/aws-bedrock.yml \
  --stack-name agentorg-prod
```

ECS Fargate for server, RDS for PostgreSQL, ElastiCache for Redis. LLM calls stay within AWS via Bedrock. IAM auth, SOC2/HIPAA eligible. $30-100/month for infrastructure.

### Option 4: Railway / Render / Fly.io (Easiest)

```bash
railway init
railway up
railway domain add
```

Zero ops. Platform handles SSL, scaling, backups, monitoring. $20-50/month for platform fees on top of LLM costs.

### Option 5: GCP Vertex + Cloud Run (Scale-to-Zero)

Cloud Run for server (scales to zero when idle), Cloud SQL for PostgreSQL, Memorystore for Redis. LLM via Vertex AI. Cheapest if agents are quiet between tasks. $25-80/month.

---

## Security Model

### Agent Sandboxing

Each agent runs in a Docker container with minimal permissions:

```yaml
# Agent container security
security_opt:
  - no-new-privileges:true     # Can't escalate privileges
cap_drop:
  - ALL                         # Drop all Linux capabilities
cap_add:
  - NET_RAW                     # Only what's needed for browsing
read_only: true                 # Can't modify its own container
tmpfs:
  - /tmp:size=100M              # Temp files in RAM, limited to 100MB
```

### Communication Flow

```
Agent Container                 Orchestrator                 External World
      │                              │                             │
      ├── "I want to send email" ──→ │                             │
      │                              ├── Permission check          │
      │                              ├── Scope check               │
      │                              ├── Budget check              │
      │                              ├── Rate limit check          │
      │                              ├── Safety check              │
      │                              ├── Approval check            │
      │                              │                             │
      │                              ├── ALLOWED ────────────────→ │ Email sent
      │  ◄── "Email sent, ID: 123" ──┤                             │
      │                              ├── Logged to audit trail     │
```

Agents cannot directly access:
- The database (only through orchestrator API)
- Other agent containers (only through orchestrator message bus)
- Environment variables or API keys (orchestrator makes external calls on their behalf)
- The filesystem outside their /workspace mount

### Secret Management

```yaml
# Secrets are NEVER passed to agent containers
# The orchestrator holds all keys and makes calls on behalf of agents

# Agent sees:
orchestrator.execute('email.send', { to: 'customer@example.com', body: '...' })

# Orchestrator internally does:
smtp.send({ /* uses SMTP credentials the agent never sees */ })
```

---

## SDK — Plugin Developer Experience

The SDK is the growth engine. Published as `@agentorg/sdk` on npm, it lets third-party developers build custom skills, adapters, and company templates without touching the core codebase.

### Installation

```bash
npm install @agentorg/sdk
```

### Building a Custom Skill

```typescript
import { createSkill } from '@agentorg/sdk';

export default createSkill({
  id: 'notion-sync',
  name: 'Notion Sync',
  description: 'Read and write Notion pages and databases',
  version: '1.0.0',
  capabilities: ['read_page', 'write_page', 'query_database'],

  async execute(action, params) {
    switch (action) {
      case 'read_page':
        return await notionClient.getPage(params.pageId);
      case 'write_page':
        return await notionClient.updatePage(params.pageId, params.content);
      case 'query_database':
        return await notionClient.query(params.databaseId, params.filter);
    }
  },

  // Optional: enable error recovery
  async revert(actionId) {
    return await notionClient.restoreVersion(actionId);
  },

  // Tool definitions for LLM to understand what this skill does
  getToolDefinitions() {
    return [
      { name: 'read_page', description: 'Read a Notion page by ID', parameters: { pageId: 'string' } },
      { name: 'write_page', description: 'Update a Notion page', parameters: { pageId: 'string', content: 'string' } },
      { name: 'query_database', description: 'Query a Notion database', parameters: { databaseId: 'string', filter: 'object' } },
    ];
  },
});
```

### Building a Custom Adapter

```typescript
import { createAdapter } from '@agentorg/sdk';

export default createAdapter({
  id: 'custom-llm',
  name: 'Custom LLM Adapter',

  async executeTask(task, context) {
    const response = await fetch('https://my-llm-api.com/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'system', content: context.personality }, { role: 'user', content: task.description }],
      }),
    });
    return { result: await response.json() };
  },

  async heartbeat(agent) {
    // Check for pending tasks and return work items
    return { hasWork: true, tasks: [] };
  },
});
```

### Testing Utilities

```typescript
import { mockOrchestrator, mockMemory, mockCRM } from '@agentorg/sdk';

// Test your skill in isolation
const orchestrator = mockOrchestrator({
  rules: { myAgent: { allowed_skills: ['notion-sync'] } },
});

const memory = mockMemory({
  personality: 'You are a helpful project manager.',
  history: [{ role: 'user', content: 'Sync the roadmap to Notion' }],
});

// Run your skill against mock infrastructure
const result = await mySkill.execute('write_page', { pageId: '123', content: 'Updated roadmap' });
```

### SDK Exports

```typescript
// packages/sdk/src/index.ts

// Interfaces for plugin developers
export type { Skill, SkillResult, ToolDefinition } from '../skills/base';
export type { AgentAdapter, AgentConfig, TaskResult } from '../adapters/base';
export type { AgentMemory, KnowledgeBase } from '../memory';
export type { OrchestratorDecision, AgentAction } from '../core/orchestrator';
export type { CRM, Contact, Deal } from '../core/crm';
export type { SkillGraph, ExecutionPlan, CapabilityTree } from '../skill-graph';

// Builder helpers
export { createSkill } from './skill-builder';
export { createAdapter } from './adapter-builder';
export { createTemplate } from './template-builder';

// Testing utilities
export { mockOrchestrator, mockMemory, mockCRM } from './testing';
```

---

## Key Open-Source Files

### README.md (Sales Page — Not a Spec Doc)

The README is the most important file. 80% of visitors only read this. It must answer in 10 seconds: what is this, why should I care, how do I try it. The full spec lives in `docs/architecture.md`.

Structure:
1. One-line description + demo GIF (15 seconds)
2. Quick start (3 lines of bash)
3. Comparison table (vs ChatGPT, OpenClaw, Paperclip)
4. Template gallery (one-click company configs)
5. Links to docs
6. Contributing link
7. License

### CONTRIBUTING.md

```markdown
# Contributing to AgentOrg

## Quick setup (< 5 minutes)

git clone https://github.com/you/agentorg
cd agentorg
pnpm install
pnpm dev          # Starts server + UI in watch mode

## Project structure (packages/)
core       → Orchestrator, org chart, tasks, CRM
safety     → Fact-check, brand-check, hallucination guard
adapters   → Agent runtime connectors
skills     → Browser, email, filesystem plugins
memory     → Vector store, knowledge base
optimizer  → Token cost optimization engine
server     → Express API
cli        → CLI tool (npx agentorg)
sdk        → Public API for plugin developers (@agentorg/sdk)
ui         → React dashboard

## How to contribute
1. Open an issue first to discuss
2. Fork → branch → make changes → add tests
3. Run: pnpm lint && pnpm typecheck && pnpm test
4. Submit a PR using the PR template

## Coding standards
- TypeScript strict mode
- ESLint + Prettier (auto-format on save)
- Vitest for tests
- Conventional commits: feat:, fix:, docs:, test:
- Changesets for versioning

## First-time contributors
Look for issues labeled "good first issue".
```

### AGENTS.md (AI Contributor Guide)

```markdown
# Agent contributors guide

You are an AI agent contributing to AgentOrg.

## Architecture
Monorepo with pnpm workspaces. The orchestrator in
packages/core/src/orchestrator/ is the central policy
engine. All agent actions pass through it.

## Key files
- packages/core/src/orchestrator/engine.ts — main policy engine
- packages/core/src/orchestrator/checks/ — the 6 check modules
- packages/safety/src/ — fact-check, brand-check, hallucination
- packages/optimizer/src/ — token cost optimization
- packages/adapters/base.ts — base adapter interface
- packages/skills/base.ts — base skill interface
- packages/sdk/src/ — public SDK for plugin developers

## Rules
- Keep changes scoped to one package when possible
- Every new feature needs tests in tests/
- Run pnpm typecheck before committing
- Orchestrator changes need unit AND integration tests
- Don't modify agentorg.config.yaml examples without updating docs/
- Don't modify source-of-truth/ files (those are user data)
```

### SECURITY.md

```markdown
# Security policy

## Reporting a vulnerability
1. Do NOT open a public GitHub issue
2. Email: security@agentorg.dev
3. Include: description, reproduction steps, impact
4. We respond within 48 hours
5. We credit you in the advisory

## Security model
- Agents run in Docker containers with dropped capabilities
- Agents cannot access API keys (orchestrator proxies all calls)
- All customer data encrypted at rest (PostgreSQL)
- Source-of-truth docs are read-only to agents
- Orchestrator rules cannot be modified by any agent
- Every action logged to audit trail

## Supported versions
| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| < 1.0   | No        |
```

---

## CI/CD Pipeline

### GitHub Actions — ci.yml

```yaml
name: CI
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

  test-orchestrator:
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- tests/unit/orchestrator/
      - run: pnpm test -- tests/integration/

  test-docker:
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
      - run: docker compose up -d
      - run: sleep 10
      - run: curl -f http://localhost:3100/api/health
      - run: docker compose down
```

### GitHub Actions — release.yml

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, registry-url: 'https://registry.npmjs.org' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm publish --filter @agentorg/sdk --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - run: pnpm publish --filter agentorg --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/you/agentorg:${{ github.ref_name }}
```

---

## Testing Strategy

### What Must Be Tested

| Component | Test Type | Why |
|-----------|-----------|-----|
| Orchestrator (all 6 checks) | Unit | A broken permission check = agents can go rogue |
| Safety layer (fact-check, brand) | Unit | A broken safety check = wrong info to customers |
| Inbox routing | Integration | Wrong routing = sales question goes to support |
| Agent-to-agent messaging | Integration | Broken handoff = lost customer context |
| CRM operations | Unit | Broken CRM = agents lose customer history |
| Token optimizer (cache, pruning) | Unit | Broken optimizer = 5x cost spike |
| Governance flow | Integration | Broken governance = unapproved emails sent |
| Full workday simulation | E2E | Validates the entire system end-to-end |

### Running Tests

```bash
pnpm test                        # All tests
pnpm test -- tests/unit/         # Unit only
pnpm test -- tests/integration/  # Integration only
pnpm test -- tests/e2e/          # End-to-end only

# Watch mode during development
pnpm test:watch

# Coverage report
pnpm test:coverage
```

---

## Open-Source Readiness Checklist

| Item | Status |
|------|--------|
| README as sales page (short, visual, demo GIF) | Planned |
| One-command install (npx agentorg init) | Designed |
| CONTRIBUTING.md with dev setup | Designed |
| AGENTS.md for AI contributors | Designed |
| Issue templates (bug, feature, question) | Designed |
| PR template with checklist | Designed |
| Code of conduct | Planned |
| SECURITY.md with reporting process | Designed |
| CHANGELOG.md | Planned |
| CI pipeline (lint, typecheck, test on every PR) | Designed |
| Release pipeline (npm publish + Docker push) | Designed |
| Test suite (unit, integration, e2e) | Designed |
| ESLint + Prettier config | Planned |
| Changesets for semantic versioning | Planned |
| SDK published as @agentorg/sdk | Designed |
| Documentation site (docs/) | Planned |
| Examples with walkthroughs | Planned |
| Discord community | Planned |
| GitHub Sponsors / FUNDING.yml | Planned |
| CODEOWNERS file | Planned |
| Demo GIF/video for README | Planned |
| Badges (CI, version, license) | Planned |

---

## Gap Coverage Summary

| Real Company Function | Status | Implementation |
|----------------------|--------|---------------|
| Board of directors | Covered | Founder via dashboard/Telegram |
| Org chart and hierarchy | Covered | YAML config + visual editor |
| Task delegation | Covered | Task queue with org-chart routing |
| Per-agent budgets | Covered | Cost tracking + hard stops |
| Governance and approvals | Covered | Tiered approval rules |
| Audit trail | Covered | Full action logging |
| Agent personality | Covered | Persistent character config |
| Agent memory | Covered | Vector store + history |
| Skills (browser, email) | Covered | Skill system + marketplace |
| Agent-to-agent messaging | Covered | Internal message protocol |
| Customer communication | Covered | Inbox router + multi-channel |
| CRM / customer database | Covered | Built-in CRM with pipeline |
| SLA and deadline tracking | Covered | Deadline tracker + escalation |
| Follow-up automation | Covered | Scheduled reminders |
| Fact-checking outbound | Covered | Source-of-truth validation |
| Brand consistency | Covered | Brand-check layer |
| Hallucination guard | Covered | Safety layer |
| Concurrent conversations | Covered | Thread isolation |
| Error recovery | Covered | Revert, recall, incident log |
| Agent performance review | Covered | Weekly metrics + KPIs |
| Agent conflict resolution | Covered | Hierarchy + escalation protocol |
| Agent onboarding | Covered | Auto-load company context |
| Agent replacement | Covered | Memory export/import |
| Structured handoffs | Covered | Escalation with context transfer |
| Business hours | Covered | Config + auto-reply |
| Invoicing | Covered | Stripe + PDF skill |
| Analytics dashboard | Covered | Company-wide metrics |
| Skill graph / workflows | Covered | DAG-based workflows, dependency resolver, capability tree |
| Elastic agent scaling | Planned | Clone agents on demand, auto-scale back |
| Multi-company portfolio | Planned | 10+ isolated companies, one dashboard |
| A/B strategy testing | Planned | Parallel companies, compare results |
| Self-improving workflows | Planned | CEO analyzes performance, proposes optimizations |
| Real-time crisis response | Planned | Sentiment monitoring, auto-coordinated response |
| Legal entity | Manual | Founder handles (documented in guide) |
| Tax / compliance | Manual | Export data to CSV for accountant |
| Contracts | Manual | Agent drafts, founder signs |
| Data backup | Manual | PostgreSQL native backup + cron |

---

## License

MIT
