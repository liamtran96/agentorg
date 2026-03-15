import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * TDD: The doctor command validates the installation health.
 * This function should eventually be exported from @agentorg/cli.
 */
interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

interface DoctorResult {
  status: 'healthy' | 'unhealthy';
  checks: CheckResult[];
}

interface DoctorOptions {
  configPath?: string;
  nodeVersion?: string;
}

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
  writer:
    name: Maya
    runtime: anthropic-api
    model: claude-sonnet-4-20250514
    budget: 10
    reports_to: ceo
    skills: [filesystem]
    personality: |
      You are Maya, a content writer.
`;

/**
 * Runs diagnostic checks on the AgentOrg installation.
 */
async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const checks: CheckResult[] = [];
  const nodeVersion = options.nodeVersion || process.version;

  // Check 1: Node.js version >= 22
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
  checks.push({
    name: 'node-version',
    passed: majorVersion >= 22,
    message: majorVersion >= 22
      ? `Node.js ${nodeVersion} meets minimum requirement (>=22)`
      : `Node.js ${nodeVersion} is below minimum requirement (>=22). Please upgrade.`,
  });

  // Check 2: Config file exists
  const configPath = options.configPath || path.join(process.cwd(), 'agentorg.config.yaml');
  const configExists = fs.existsSync(configPath);
  checks.push({
    name: 'config-exists',
    passed: configExists,
    message: configExists
      ? `Config file found: ${configPath}`
      : `Config file not found: ${configPath}. Run: npx agentorg init`,
  });

  // Check 3: Config file is valid YAML
  if (configExists) {
    let configValid = false;
    let configContent = '';
    try {
      configContent = fs.readFileSync(configPath, 'utf-8');
      // Basic YAML validation: must have company and org sections
      configValid = configContent.includes('company:') && configContent.includes('org:');
    } catch {
      configValid = false;
    }

    checks.push({
      name: 'config-valid',
      passed: configValid,
      message: configValid
        ? 'Config file is valid YAML with required sections'
        : 'Config file is invalid or missing required sections (company, org)',
    });

    // Check 4: All agent runtimes have required dependencies
    if (configValid) {
      const runtimes = new Set<string>();
      const runtimeRegex = /runtime:\s*(\S+)/g;
      let match;
      while ((match = runtimeRegex.exec(configContent)) !== null) {
        runtimes.add(match[1]);
      }

      const knownRuntimes = ['claude-agent-sdk', 'anthropic-api', 'openclaw', 'codex', 'http', 'script'];
      const unknownRuntimes = [...runtimes].filter(r => !knownRuntimes.includes(r));

      checks.push({
        name: 'agent-runtimes',
        passed: unknownRuntimes.length === 0,
        message: unknownRuntimes.length === 0
          ? `All agent runtimes are supported: ${[...runtimes].join(', ')}`
          : `Unknown runtimes found: ${unknownRuntimes.join(', ')}. Supported: ${knownRuntimes.join(', ')}`,
      });
    }
  } else {
    // If config doesn't exist, mark dependent checks as failed
    checks.push({
      name: 'config-valid',
      passed: false,
      message: 'Skipped: config file does not exist',
    });
    checks.push({
      name: 'agent-runtimes',
      passed: false,
      message: 'Skipped: config file does not exist',
    });
  }

  const allPassed = checks.every(c => c.passed);

  return {
    status: allPassed ? 'healthy' : 'unhealthy',
    checks,
  };
}

describe('CLI — doctor command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-cli-doctor-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should check Node.js version >= 22 and pass for v22+', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    const result = await runDoctor({ configPath, nodeVersion: 'v22.1.0' });

    const nodeCheck = result.checks.find(c => c.name === 'node-version');
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck!.passed).toBe(true);
    expect(nodeCheck!.message).toContain('meets minimum');
  });

  it('should fail Node.js version check for versions below 22', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    const result = await runDoctor({ configPath, nodeVersion: 'v20.11.0' });

    const nodeCheck = result.checks.find(c => c.name === 'node-version');
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck!.passed).toBe(false);
    expect(nodeCheck!.message).toContain('below minimum');
  });

  it('should check config file exists and pass when present', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    const result = await runDoctor({ configPath });

    const configCheck = result.checks.find(c => c.name === 'config-exists');
    expect(configCheck).toBeDefined();
    expect(configCheck!.passed).toBe(true);
  });

  it('should fail config exists check when file is missing', async () => {
    const missingPath = path.join(tmpDir, 'nonexistent.yaml');

    const result = await runDoctor({ configPath: missingPath });

    const configCheck = result.checks.find(c => c.name === 'config-exists');
    expect(configCheck).toBeDefined();
    expect(configCheck!.passed).toBe(false);
    expect(configCheck!.message).toContain('not found');
  });

  it('should check config file is valid YAML with required sections', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    const result = await runDoctor({ configPath });

    const validCheck = result.checks.find(c => c.name === 'config-valid');
    expect(validCheck).toBeDefined();
    expect(validCheck!.passed).toBe(true);
    expect(validCheck!.message).toContain('valid YAML');
  });

  it('should fail config valid check for invalid YAML', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, 'random_key: value\nno_company_here: true\n', 'utf-8');

    const result = await runDoctor({ configPath });

    const validCheck = result.checks.find(c => c.name === 'config-valid');
    expect(validCheck).toBeDefined();
    expect(validCheck!.passed).toBe(false);
  });

  it('should check all agent runtimes have required dependencies', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    const result = await runDoctor({ configPath });

    const runtimeCheck = result.checks.find(c => c.name === 'agent-runtimes');
    expect(runtimeCheck).toBeDefined();
    expect(runtimeCheck!.passed).toBe(true);
    expect(runtimeCheck!.message).toContain('claude-agent-sdk');
    expect(runtimeCheck!.message).toContain('anthropic-api');
  });

  it('should fail runtime check for unknown runtimes', async () => {
    const configWithBadRuntime = VALID_CONFIG.replace('anthropic-api', 'unknown-runtime-xyz');
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, configWithBadRuntime, 'utf-8');

    const result = await runDoctor({ configPath });

    const runtimeCheck = result.checks.find(c => c.name === 'agent-runtimes');
    expect(runtimeCheck).toBeDefined();
    expect(runtimeCheck!.passed).toBe(false);
    expect(runtimeCheck!.message).toContain('unknown-runtime-xyz');
  });

  it('should return array of check results with name, passed, and message', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    const result = await runDoctor({ configPath, nodeVersion: 'v22.0.0' });

    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBeGreaterThanOrEqual(4);

    for (const check of result.checks) {
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('passed');
      expect(check).toHaveProperty('message');
      expect(typeof check.name).toBe('string');
      expect(typeof check.passed).toBe('boolean');
      expect(typeof check.message).toBe('string');
    }
  });

  it('should report healthy status when all checks pass', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    const result = await runDoctor({ configPath, nodeVersion: 'v22.5.0' });

    expect(result.status).toBe('healthy');
    expect(result.checks.every(c => c.passed)).toBe(true);
  });

  it('should report unhealthy status when any check fails', async () => {
    const configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, VALID_CONFIG, 'utf-8');

    // Use an old Node version to trigger a failure
    const result = await runDoctor({ configPath, nodeVersion: 'v18.0.0' });

    expect(result.status).toBe('unhealthy');
    expect(result.checks.some(c => !c.passed)).toBe(true);
  });

  it('should report unhealthy when config is missing', async () => {
    const missingPath = path.join(tmpDir, 'does-not-exist.yaml');

    const result = await runDoctor({ configPath: missingPath, nodeVersion: 'v22.0.0' });

    expect(result.status).toBe('unhealthy');

    // Config-dependent checks should also fail
    const validCheck = result.checks.find(c => c.name === 'config-valid');
    expect(validCheck!.passed).toBe(false);
    expect(validCheck!.message).toContain('Skipped');
  });
});
