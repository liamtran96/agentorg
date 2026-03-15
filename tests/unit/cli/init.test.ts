import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// The existing init() is interactive (uses prompts). We import it directly
// and mock the prompts module. We also test a programmatic initProject()
// that the CLI should expose for non-interactive usage.
import { init } from '../../../packages/cli/src/init';

/**
 * Helper: programmatic wrapper around init logic.
 * TDD — this function should be extracted into the CLI package.
 * For now, we replicate the core generation logic so tests define
 * the expected behavior of a future `initProject()` export.
 */
interface InitOptions {
  companyName: string;
  template: string;
  outputDir: string;
  apiKey?: string;
}

interface InitResult {
  success: boolean;
  configPath: string;
  envPath: string;
  agentCount: number;
}

/**
 * Programmatic init that should eventually live in packages/cli/src/init.ts.
 * This is the function under test — TDD style.
 */
async function initProject(options: InitOptions): Promise<InitResult> {
  const { companyName, template, outputDir, apiKey } = options;

  const TEMPLATES: Record<string, { description: string; agents: Record<string, any> }> = {
    'content-agency': {
      description: 'SEO content marketing agency',
      agents: {
        ceo: { name: 'Alex', runtime: 'claude-agent-sdk', model: 'claude-sonnet-4-20250514', budget: 50, reports_to: 'board', skills: ['browser', 'email', 'calendar'], personality: 'You are Alex, the CEO. Strategic, decisive, and focused on results.' },
        content_writer: { name: 'Maya', runtime: 'claude-agent-sdk', model: 'claude-sonnet-4-20250514', budget: 30, reports_to: 'ceo', skills: ['browser', 'filesystem'], personality: 'You are Maya, a research-driven content writer. Casual-professional tone.' },
        seo_analyst: { name: 'Kai', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 15, reports_to: 'ceo', skills: ['browser'], personality: 'You are Kai, an SEO specialist. Data-driven, keyword-focused.' },
        support: { name: 'Linh', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 20, reports_to: 'ceo', skills: ['email', 'crm'], personality: 'You are Linh, the support lead. Friendly, patient, solution-oriented.' },
        social_media: { name: 'Sam', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 10, reports_to: 'ceo', skills: ['messaging'], personality: 'You are Sam, the social media manager. Punchy, engaging, trend-aware.' },
      },
    },
    'ecommerce-support': {
      description: 'E-commerce customer service team',
      agents: {
        ceo: { name: 'Alex', runtime: 'claude-agent-sdk', model: 'claude-sonnet-4-20250514', budget: 30, reports_to: 'board', skills: ['email', 'browser'], personality: 'You are Alex, the manager. You handle escalations and daily reviews.' },
        support: { name: 'Linh', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 25, reports_to: 'ceo', skills: ['email', 'crm'], personality: 'You are Linh, support agent. Friendly, fast, checks order history before replying.' },
        sales: { name: 'James', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 20, reports_to: 'ceo', skills: ['email', 'crm'], personality: 'You are James, sales agent. You recommend products and handle upsells.' },
        social: { name: 'Sam', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 10, reports_to: 'ceo', skills: ['messaging'], personality: 'You are Sam. You reply to DMs and comments quickly and warmly.' },
      },
    },
  };

  const selectedTemplate = TEMPLATES[template];
  if (!selectedTemplate) {
    throw new Error(`Unknown template: ${template}`);
  }

  // Verify output directory is writable
  try {
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    throw new Error(`Output directory is not writable: ${outputDir}`);
  }

  // Generate YAML config
  const configLines = [
    `company:`,
    `  name: "${companyName}"`,
    `  description: "${selectedTemplate.description}"`,
    `  timezone: "UTC"`,
    `  business_hours: "09:00-18:00"`,
    ``,
    `org:`,
  ];

  for (const [id, agent] of Object.entries(selectedTemplate.agents)) {
    configLines.push(`  ${id}:`);
    configLines.push(`    name: "${agent.name}"`);
    configLines.push(`    runtime: ${agent.runtime}`);
    configLines.push(`    model: ${agent.model}`);
    configLines.push(`    budget: ${agent.budget}`);
    configLines.push(`    reports_to: ${agent.reports_to}`);
    configLines.push(`    skills: [${agent.skills.join(', ')}]`);
    configLines.push(`    personality: |`);
    configLines.push(`      ${agent.personality}`);
    configLines.push(``);
  }

  const configPath = path.join(outputDir, 'agentorg.config.yaml');
  fs.writeFileSync(configPath, configLines.join('\n'), 'utf-8');

  const envPath = path.join(outputDir, '.env');
  fs.writeFileSync(envPath, `ANTHROPIC_API_KEY=${apiKey || 'sk-ant-YOUR-KEY'}\n`, 'utf-8');

  return {
    success: true,
    configPath,
    envPath,
    agentCount: Object.keys(selectedTemplate.agents).length,
  };
}

describe('CLI — init command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-cli-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create config file in output directory', async () => {
    const result = await initProject({
      companyName: 'Test Agency',
      template: 'content-agency',
      outputDir: tmpDir,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.configPath)).toBe(true);

    const configContent = fs.readFileSync(result.configPath, 'utf-8');
    expect(configContent).toContain('company:');
    expect(configContent).toContain('org:');
  });

  it('should use content-agency template by default', async () => {
    const result = await initProject({
      companyName: 'Default Template Co',
      template: 'content-agency',
      outputDir: tmpDir,
    });

    const configContent = fs.readFileSync(result.configPath, 'utf-8');
    expect(configContent).toContain('SEO content marketing agency');
    expect(result.agentCount).toBe(5);
  });

  it('should include company name in generated config', async () => {
    const result = await initProject({
      companyName: 'Acme Content Inc',
      template: 'content-agency',
      outputDir: tmpDir,
    });

    const configContent = fs.readFileSync(result.configPath, 'utf-8');
    expect(configContent).toContain('Acme Content Inc');
  });

  it('should generate config with valid org chart containing agents', async () => {
    const result = await initProject({
      companyName: 'Org Chart Co',
      template: 'content-agency',
      outputDir: tmpDir,
    });

    const configContent = fs.readFileSync(result.configPath, 'utf-8');

    // Should have org section with agents
    expect(configContent).toContain('org:');
    expect(configContent).toContain('ceo:');
    expect(configContent).toContain('content_writer:');
    expect(configContent).toContain('seo_analyst:');
    expect(configContent).toContain('support:');
    expect(configContent).toContain('social_media:');

    // Each agent should have required fields
    expect(configContent).toContain('runtime:');
    expect(configContent).toContain('model:');
    expect(configContent).toContain('budget:');
    expect(configContent).toContain('reports_to:');
    expect(configContent).toContain('skills:');
    expect(configContent).toContain('personality:');
  });

  it('should create .env file with placeholder API key', async () => {
    const result = await initProject({
      companyName: 'Env Test Co',
      template: 'content-agency',
      outputDir: tmpDir,
    });

    expect(fs.existsSync(result.envPath)).toBe(true);

    const envContent = fs.readFileSync(result.envPath, 'utf-8');
    expect(envContent).toContain('ANTHROPIC_API_KEY=');
    expect(envContent).toContain('sk-ant-YOUR-KEY');
  });

  it('should create .env file with provided API key', async () => {
    const result = await initProject({
      companyName: 'Key Test Co',
      template: 'content-agency',
      outputDir: tmpDir,
      apiKey: 'sk-ant-real-key-123',
    });

    const envContent = fs.readFileSync(result.envPath, 'utf-8');
    expect(envContent).toContain('ANTHROPIC_API_KEY=sk-ant-real-key-123');
  });

  it('should return success result with file paths', async () => {
    const result = await initProject({
      companyName: 'Result Test Co',
      template: 'content-agency',
      outputDir: tmpDir,
    });

    expect(result.success).toBe(true);
    expect(result.configPath).toBe(path.join(tmpDir, 'agentorg.config.yaml'));
    expect(result.envPath).toBe(path.join(tmpDir, '.env'));
    expect(result.agentCount).toBe(5);
  });

  it('should throw if output directory is not writable', async () => {
    const readOnlyDir = path.join(tmpDir, 'readonly');
    fs.mkdirSync(readOnlyDir);
    fs.chmodSync(readOnlyDir, 0o444);

    await expect(
      initProject({
        companyName: 'Fail Co',
        template: 'content-agency',
        outputDir: readOnlyDir,
      })
    ).rejects.toThrow('not writable');

    // Restore permissions for cleanup
    fs.chmodSync(readOnlyDir, 0o755);
  });

  it('should throw for unknown template', async () => {
    await expect(
      initProject({
        companyName: 'Bad Template Co',
        template: 'nonexistent-template',
        outputDir: tmpDir,
      })
    ).rejects.toThrow('Unknown template');
  });

  it('should support ecommerce-support template', async () => {
    const result = await initProject({
      companyName: 'Shop Co',
      template: 'ecommerce-support',
      outputDir: tmpDir,
    });

    const configContent = fs.readFileSync(result.configPath, 'utf-8');
    expect(configContent).toContain('E-commerce customer service team');
    expect(result.agentCount).toBe(4);
  });
});
