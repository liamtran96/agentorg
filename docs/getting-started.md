# Getting Started

## Prerequisites

- Node.js 22+
- An Anthropic API key (get one at console.anthropic.com)

## Quick Start

```bash
npx agentorg init
# Answer: business type, API key
# Done.

npx agentorg start
# Dashboard: http://localhost:3100
```

## Templates

```bash
npx agentorg init --template content-agency
npx agentorg init --template ecommerce-support
npx agentorg init --template saas-builder
```

## Deploy to Production

```bash
# On a $5 VPS (Hetzner, DigitalOcean)
git clone your-repo
cp .env.example .env
# Edit .env with your API key
docker compose up -d
```

That's it. Your company runs 24/7.
