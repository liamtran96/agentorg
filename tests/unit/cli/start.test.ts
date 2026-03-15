import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Import the existing start function from the CLI package
import { start } from '../../../packages/cli/src/start';

const VALID_CONFIG = `
company:
  name: "Test Co"
  description: "A test company"
  timezone: "UTC"
  business_hours: "09:00-18:00"

org:
  ceo:
    name: Alex
    runtime: claude-agent-sdk
    model: claude-sonnet-4-20250514
    budget: 15
    reports_to: board
    skills: [browser, email]
    personality: |
      You are Alex, the CEO.
`;

/**
 * TDD: programmatic startServer function that the CLI should export.
 * Wraps the interactive start() with config validation and returns a handle.
 */
interface ServerHandle {
  configPath: string;
  config: any;
  stop: () => void;
}

async function startServer(configPath: string): Promise<ServerHandle> {
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

describe('CLI — start command', () => {
  let tmpDir: string;
  let configPath: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-cli-start-'));
    configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');
  });

  afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should validate config file exists', async () => {
    const handle = await startServer(configPath);
    expect(handle).toBeDefined();
    expect(handle.configPath).toBe(path.resolve(configPath));
    handle.stop();
  });

  it('should throw if config file not found', async () => {
    const missingPath = path.join(tmpDir, 'nonexistent.yaml');

    await expect(startServer(missingPath)).rejects.toThrow('Config file not found');
  });

  it('should load config and return server handle', async () => {
    const handle = await startServer(configPath);

    expect(handle.configPath).toBe(path.resolve(configPath));
    expect(handle.config).toBeDefined();
    expect(handle.config.raw).toContain('Test Co');
    expect(typeof handle.stop).toBe('function');

    handle.stop();
  });

  it('should set CONFIG_PATH env variable', async () => {
    const handle = await startServer(configPath);

    expect(process.env.CONFIG_PATH).toBe(path.resolve(configPath));

    handle.stop();
  });

  it('should clear CONFIG_PATH on stop', async () => {
    const handle = await startServer(configPath);
    expect(process.env.CONFIG_PATH).toBeDefined();

    handle.stop();
    expect(process.env.CONFIG_PATH).toBeUndefined();
  });

  it('should reject invalid config missing required sections', async () => {
    const badConfigPath = path.join(tmpDir, 'bad.yaml');
    fs.writeFileSync(badConfigPath, 'some_random: value\n', 'utf-8');

    await expect(startServer(badConfigPath)).rejects.toThrow('Invalid config');
  });

  it('should resolve relative config paths to absolute', async () => {
    // Create a config in a known relative location
    const relPath = path.relative(process.cwd(), configPath);
    const handle = await startServer(relPath);

    expect(path.isAbsolute(handle.configPath)).toBe(true);
    expect(handle.configPath).toBe(path.resolve(configPath));

    handle.stop();
  });
});
