# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config files first (for better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY tsconfig.json ./

# Copy all package manifests
COPY packages/ packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all packages
RUN pnpm build

# ─── Stage 2: Runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm (needed for workspace resolution at runtime)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ packages/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

EXPOSE 3100

CMD ["node", "packages/server/dist/start.js"]
