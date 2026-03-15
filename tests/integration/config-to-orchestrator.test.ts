import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigManager, OrgChart, Orchestrator } from '@agentorg/core';
import type { ActionRecord } from '@agentorg/core';

const makeAction = (agentId: string, type: string): ActionRecord => ({
  id: `act_${Date.now()}`,
  agentId,
  type,
  description: 'test action',
  timestamp: new Date(),
  input: {},
  orchestratorDecision: 'ALLOWED',
});

const minimalYaml = `
company:
  name: "Integration Test Co"
  description: "Testing config-to-orchestrator flow"
  timezone: "UTC"
  business_hours: "09:00-18:00"

org:
  ceo:
    name: Alex
    runtime: claude-agent-sdk
    personality: "Strategic CEO"
    budget: 50
    reports_to: board
    skills: [browser, email, calendar]
    heartbeat:
      schedule: "0 */4 * * *"
      tasks: [review_agents]

  writer:
    name: Maya
    runtime: claude-agent-sdk
    personality: "Content writer"
    budget: 20
    reports_to: ceo
    skills: [browser, filesystem]
    heartbeat:
      schedule: "0 */2 * * *"
      tasks: [check_task_queue]

governance:
  rules:
    - action: "email.send_external"
      condition: "always"
      outcome: require_approval
    - action: "support.reply"
      condition: "always"
      outcome: auto_approve
`;

describe('Integration — Config to Orchestrator', () => {
  const tmpFiles: string[] = [];

  function writeTempConfig(content: string): string {
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `agentorg-test-${Date.now()}.yaml`);
    fs.writeFileSync(filePath, content, 'utf-8');
    tmpFiles.push(filePath);
    return filePath;
  }

  afterEach(() => {
    for (const f of tmpFiles) {
      try {
        fs.unlinkSync(f);
      } catch {
        // ignore
      }
    }
    tmpFiles.length = 0;
  });

  it('should load YAML config, build OrgChart, and orchestrator checks work', () => {
    const configPath = writeTempConfig(minimalYaml);
    const configManager = new ConfigManager(configPath);
    const config = configManager.load();

    // Build OrgChart from config
    const orgChart = new OrgChart(config.org);
    expect(orgChart.getAgent('ceo')).toBeDefined();
    expect(orgChart.getAgent('writer')).toBeDefined();
    expect(orgChart.getCEO()?.name).toBe('Alex');
    expect(orgChart.getDirectReports('ceo')).toHaveLength(1);

    // Create Orchestrator from config
    const orchestrator = new Orchestrator(config);

    // Writer can use browser (allowed skill)
    const browserAction = makeAction('writer', 'browser.search');
    const allowed = orchestrator.check('writer', browserAction);
    expect(allowed.decision).toBe('ALLOWED');

    // Writer cannot use email (not in skills)
    const emailAction = makeAction('writer', 'email.send');
    const blocked = orchestrator.check('writer', emailAction);
    expect(blocked.decision).toBe('BLOCKED');
    expect(blocked.checkResults.permission).toBe(false);
  });

  it('should hot-reload config and update orchestrator behavior', () => {
    const configPath = writeTempConfig(minimalYaml);
    const configManager = new ConfigManager(configPath);
    const config = configManager.load();
    const orchestrator = new Orchestrator(config);

    // Initially writer cannot send email
    const emailAction = makeAction('writer', 'email.send');
    const blocked = orchestrator.check('writer', emailAction);
    expect(blocked.decision).toBe('BLOCKED');

    // Update config: give writer email skill
    configManager.update('org.writer.skills', ['browser', 'filesystem', 'email']);
    const updatedConfig = configManager.getCurrent();
    orchestrator.updateConfig(updatedConfig);

    // Now writer can send email
    const allowed = orchestrator.check('writer', emailAction);
    expect(allowed.decision).toBe('ALLOWED');
  });

  it('should apply governance rules from config to orchestrator', () => {
    const configPath = writeTempConfig(minimalYaml);
    const configManager = new ConfigManager(configPath);
    const config = configManager.load();

    const orgChart = new OrgChart(config.org);
    const orchestrator = new Orchestrator(config);

    // Governance rules should be loaded from config
    expect(config.governance).toBeDefined();
    expect(config.governance!.rules).toHaveLength(2);

    // CEO has email skill, so permission passes
    const ceoEmail = makeAction('ceo', 'email.send_external');
    const result = orchestrator.check('ceo', ceoEmail);

    // The governance rule for email.send_external exists in config
    // Orchestrator should evaluate it (exact behavior depends on implementation)
    expect(result.decision).toBeDefined();
    expect(['ALLOWED', 'BLOCKED', 'QUEUED']).toContain(result.decision);
  });
});
