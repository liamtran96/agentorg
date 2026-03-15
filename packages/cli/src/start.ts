import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Handle returned by startServer to control the running server. */
export interface ServerHandle {
  configPath: string;
  config: { raw: string };
  stop: () => void;
}

/**
 * Programmatic server start.
 * Validates the config file, sets CONFIG_PATH, and returns a handle.
 */
export async function startServer(configPath: string): Promise<ServerHandle> {
  // Resolve to absolute path
  const resolvedPath = path.resolve(configPath);

  // Validate config file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }

  // Read and do basic validation
  const rawConfig = fs.readFileSync(resolvedPath, 'utf-8');
  if (!rawConfig.includes('company:') || !rawConfig.includes('org:')) {
    throw new Error('Invalid config: missing required sections (company, org)');
  }

  // Set CONFIG_PATH env variable so the server can find it
  process.env.CONFIG_PATH = resolvedPath;

  return {
    configPath: resolvedPath,
    config: { raw: rawConfig },
    stop: () => {
      delete process.env.CONFIG_PATH;
    },
  };
}

/**
 * Interactive CLI start command.
 */
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
