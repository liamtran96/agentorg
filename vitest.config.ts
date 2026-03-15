import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@agentorg/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@agentorg/adapters': path.resolve(__dirname, 'packages/adapters/src/index.ts'),
      '@agentorg/adapters/base': path.resolve(__dirname, 'packages/adapters/src/base.ts'),
      '@agentorg/skills': path.resolve(__dirname, 'packages/skills/src/index.ts'),
      '@agentorg/skills/base': path.resolve(__dirname, 'packages/skills/src/base.ts'),
      '@agentorg/safety': path.resolve(__dirname, 'packages/safety/src/index.ts'),
      '@agentorg/memory': path.resolve(__dirname, 'packages/memory/src/index.ts'),
      '@agentorg/optimizer': path.resolve(__dirname, 'packages/optimizer/src/index.ts'),
      '@agentorg/skill-graph': path.resolve(__dirname, 'packages/skill-graph/src/index.ts'),
      '@agentorg/server': path.resolve(__dirname, 'packages/server/src/index.ts'),
      '@agentorg/chat-manager': path.resolve(__dirname, 'packages/chat-manager/src/index.ts'),
      '@agentorg/sdk': path.resolve(__dirname, 'packages/sdk/src/index.ts'),
    },
  },
});
