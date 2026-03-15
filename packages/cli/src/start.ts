import { execSync } from 'node:child_process';
import fs from 'node:fs';

export function start(): void {
  const configPath = './agentorg.config.yaml';

  if (!fs.existsSync(configPath)) {
    console.error('[agentorg] No agentorg.config.yaml found. Run: npx agentorg init');
    process.exit(1);
  }

  console.log('[agentorg] Starting your company...\n');

  // In production, this would start the server package directly
  // For now, we set the env and import the server
  process.env.CONFIG_PATH = configPath;

  import('@agentorg/server').catch(() => {
    // Fallback: try running the server directly
    console.log('[agentorg] Starting server...');
    try {
      execSync('npx tsx packages/server/src/index.ts', { stdio: 'inherit' });
    } catch {
      console.error('[agentorg] Failed to start. Make sure you ran: pnpm install');
    }
  });
}
