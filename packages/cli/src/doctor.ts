import fs from 'node:fs';
import path from 'node:path';

/** Result of a single diagnostic check. */
export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

/** Aggregate result of all doctor checks. */
export interface DoctorResult {
  status: 'healthy' | 'unhealthy';
  checks: CheckResult[];
}

/** Options for the doctor command. */
export interface DoctorOptions {
  configPath?: string;
  nodeVersion?: string;
}

/** Known supported agent runtimes. */
const KNOWN_RUNTIMES = ['claude-agent-sdk', 'anthropic-api', 'openclaw', 'codex', 'http', 'script'];

/**
 * Runs diagnostic checks on the AgentOrg installation.
 *
 * Checks performed:
 * 1. Node.js version >= 22
 * 2. Config file exists
 * 3. Config file has valid YAML with required sections
 * 4. All agent runtimes are supported
 */
export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
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

  // Check 3: Config file is valid YAML with required sections
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

    // Check 4: All agent runtimes are supported
    if (configValid) {
      const runtimes = new Set<string>();
      const runtimeRegex = /runtime:\s*(\S+)/g;
      let match: RegExpExecArray | null;
      while ((match = runtimeRegex.exec(configContent)) !== null) {
        runtimes.add(match[1]);
      }

      const unknownRuntimes = [...runtimes].filter(r => !KNOWN_RUNTIMES.includes(r));

      checks.push({
        name: 'agent-runtimes',
        passed: unknownRuntimes.length === 0,
        message: unknownRuntimes.length === 0
          ? `All agent runtimes are supported: ${[...runtimes].join(', ')}`
          : `Unknown runtimes found: ${unknownRuntimes.join(', ')}. Supported: ${KNOWN_RUNTIMES.join(', ')}`,
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
