import { describe, it, expect } from 'vitest';
import { ConfigManager } from '@agentorg/core';
import type { CompanyConfig, AgentConfig } from '@agentorg/core';
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATES_DIR = path.resolve(__dirname, '../../../templates');

describe('Template Validation', () => {
  describe('content-agency.yaml', () => {
    const templatePath = path.join(TEMPLATES_DIR, 'content-agency.yaml');

    it('should load without errors', () => {
      expect(fs.existsSync(templatePath)).toBe(true);

      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      expect(config).toBeDefined();
      expect(config.company).toBeDefined();
      expect(config.org).toBeDefined();
    });

    it('should have all required top-level fields (company, org, governance)', () => {
      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      // company section
      expect(config.company).toBeDefined();
      expect(config.company.name).toBeDefined();
      expect(typeof config.company.name).toBe('string');
      expect(config.company.name.length).toBeGreaterThan(0);
      expect(config.company.description).toBeDefined();
      expect(config.company.timezone).toBeDefined();
      expect(config.company.businessHours).toBeDefined();

      // org section
      expect(config.org).toBeDefined();
      expect(Object.keys(config.org).length).toBeGreaterThan(0);

      // governance section
      expect(config.governance).toBeDefined();
      expect(config.governance!.rules).toBeDefined();
      expect(Array.isArray(config.governance!.rules)).toBe(true);
      expect(config.governance!.rules.length).toBeGreaterThan(0);
    });

    it('should have all required fields for every agent (id, name, role, skills, budget)', () => {
      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      const agents = Object.entries(config.org);
      expect(agents.length).toBeGreaterThan(0);

      for (const [agentId, agent] of agents) {
        // id should match the key or be set
        expect(agent.id).toBeDefined();
        expect(typeof agent.id).toBe('string');
        expect(agent.id.length).toBeGreaterThan(0);

        // name is required
        expect(agent.name).toBeDefined();
        expect(typeof agent.name).toBe('string');
        expect(agent.name.length).toBeGreaterThan(0);

        // role is required
        expect(agent.role).toBeDefined();
        expect(typeof agent.role).toBe('string');

        // skills is required and must be an array
        expect(agent.skills).toBeDefined();
        expect(Array.isArray(agent.skills)).toBe(true);
        expect(agent.skills.length).toBeGreaterThan(0);

        // budget is required and must be a positive number
        expect(agent.budget).toBeDefined();
        expect(typeof agent.budget).toBe('number');
        expect(agent.budget).toBeGreaterThan(0);

        // runtime is required
        expect(agent.runtime).toBeDefined();
        expect(['claude-agent-sdk', 'anthropic-api', 'openclaw', 'codex', 'http', 'script']).toContain(agent.runtime);

        // reportsTo is required
        expect(agent.reportsTo).toBeDefined();
        expect(typeof agent.reportsTo).toBe('string');
      }
    });

    it('should have valid reportsTo references (all point to existing agents or "board")', () => {
      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      const agentIds = Object.keys(config.org);

      for (const [agentId, agent] of Object.entries(config.org)) {
        if (agent.reportsTo === 'board') {
          // Valid: reports to the board (top-level)
          continue;
        }
        expect(agentIds).toContain(agent.reportsTo);
      }
    });

    it('should have exactly one CEO (agent reporting to board)', () => {
      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      const ceoAgents = Object.values(config.org).filter((a) => a.reportsTo === 'board');
      expect(ceoAgents).toHaveLength(1);
    });

    it('should have valid heartbeat configs for agents that have them', () => {
      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      for (const [agentId, agent] of Object.entries(config.org)) {
        if (agent.heartbeat) {
          expect(agent.heartbeat.schedule).toBeDefined();
          expect(typeof agent.heartbeat.schedule).toBe('string');
          // Cron expression should have at least 5 space-separated parts
          const cronParts = agent.heartbeat.schedule.trim().split(/\s+/);
          expect(cronParts.length).toBeGreaterThanOrEqual(5);

          expect(agent.heartbeat.tasks).toBeDefined();
          expect(Array.isArray(agent.heartbeat.tasks)).toBe(true);
          expect(agent.heartbeat.tasks.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid governance rules with required fields', () => {
      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      if (config.governance?.rules) {
        for (const rule of config.governance.rules) {
          expect(rule.action).toBeDefined();
          expect(typeof rule.action).toBe('string');
          // Rules must have either 'requires' or 'outcome' (template uses outcome)
          expect(rule.requires || (rule as any).outcome).toBeDefined();
        }
      }
    });
  });

  describe('ecommerce-support.yaml', () => {
    const templatePath = path.join(TEMPLATES_DIR, 'ecommerce-support.yaml');

    it('should load without errors (will fail until template exists)', () => {
      expect(fs.existsSync(templatePath)).toBe(true);

      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      expect(config).toBeDefined();
      expect(config.company).toBeDefined();
      expect(config.org).toBeDefined();
      expect(Object.keys(config.org).length).toBeGreaterThan(0);
    });
  });

  describe('saas-builder.yaml', () => {
    const templatePath = path.join(TEMPLATES_DIR, 'saas-builder.yaml');

    it('should load without errors (will fail until template exists)', () => {
      expect(fs.existsSync(templatePath)).toBe(true);

      const configManager = new ConfigManager(templatePath);
      const config = configManager.load();

      expect(config).toBeDefined();
      expect(config.company).toBeDefined();
      expect(config.org).toBeDefined();
      expect(Object.keys(config.org).length).toBeGreaterThan(0);
    });
  });

  describe('all templates in templates/ directory', () => {
    it('should all be valid YAML that ConfigManager can parse', () => {
      if (!fs.existsSync(TEMPLATES_DIR)) {
        throw new Error(`Templates directory not found at ${TEMPLATES_DIR}`);
      }

      const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const filePath = path.join(TEMPLATES_DIR, file);
        const configManager = new ConfigManager(filePath);

        // Should not throw
        const config = configManager.load();
        expect(config).toBeDefined();
        expect(config.company).toBeDefined();
        expect(config.company.name).toBeDefined();
        expect(config.org).toBeDefined();
        expect(Object.keys(config.org).length).toBeGreaterThan(0);
      }
    });
  });
});
