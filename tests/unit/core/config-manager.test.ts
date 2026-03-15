import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '@agentorg/core';
import type { CompanyConfig } from '@agentorg/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const MINIMAL_YAML = `
company:
  name: TestCorp
  description: A test company
  timezone: UTC
  businessHours: "9-17"

org:
  ceo:
    id: ceo
    name: Alice
    role: CEO
    runtime: anthropic-api
    personality: Strategic leader
    budget: 5000
    reports_to: board
    skills:
      - delegation
      - planning
  writer:
    id: writer
    name: Bob
    role: Writer
    runtime: claude-agent-sdk
    personality: Creative writer
    budget: 500
    reports_to: ceo
    skills:
      - writing
`;

describe('ConfigManager', () => {
  let tmpDir: string;
  let configPath: string;
  let manager: ConfigManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-test-'));
    configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, MINIMAL_YAML, 'utf-8');
    manager = new ConfigManager(configPath);
  });

  afterEach(() => {
    try {
      manager.stopWatching?.();
    } catch {
      // ignore if stopWatching doesn't exist yet
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load and parse YAML config', () => {
    const config = manager.load();
    expect(config).toBeDefined();
    expect(config.company.name).toBe('TestCorp');
    expect(config.company.timezone).toBe('UTC');
  });

  it('should return parsed org agents', () => {
    const config = manager.load();
    expect(config.org).toBeDefined();
    expect(config.org.ceo).toBeDefined();
    expect(config.org.ceo.name).toBe('Alice');
    expect(config.org.writer).toBeDefined();
    expect(config.org.writer.name).toBe('Bob');
  });

  it('should normalize reports_to to reportsTo', () => {
    const config = manager.load();
    expect(config.org.ceo.reportsTo).toBe('board');
    expect(config.org.writer.reportsTo).toBe('ceo');
  });

  it('should return current config after load', () => {
    manager.load();
    const current = manager.getCurrent();
    expect(current).toBeDefined();
    expect(current.company.name).toBe('TestCorp');
  });

  it('should throw if getCurrent called before load', () => {
    expect(() => manager.getCurrent()).toThrow();
  });

  it('should update config value and write back to YAML', () => {
    manager.load();
    manager.update('company.name', 'UpdatedCorp');

    const current = manager.getCurrent();
    expect(current.company.name).toBe('UpdatedCorp');

    // Verify it was written to disk
    const raw = fs.readFileSync(configPath, 'utf-8');
    expect(raw).toContain('UpdatedCorp');
  });

  it('should handle missing optional fields with defaults', () => {
    const config = manager.load();
    // governance, safety, etc. are optional — should not throw
    expect(config.governance).toBeUndefined();
    expect(config.safety).toBeUndefined();
  });

  it('should accept onChange callback', () => {
    // onChange should be callable without throwing
    expect(() => manager.onChange(() => {})).not.toThrow();
  });
});
