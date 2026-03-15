import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SkillRegistry, FilesystemSkill, BrowserSkill, CRMSkill } from '@agentorg/skills';

describe('SkillRegistry — Integration with Real Skills', () => {
  let registry: SkillRegistry;
  let tmpDir: string;

  beforeEach(() => {
    registry = new SkillRegistry();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-registry-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should register multiple real skills', () => {
    const fsSkill = new FilesystemSkill(tmpDir);
    const browserSkill = new BrowserSkill();
    const crmSkill = new CRMSkill();

    registry.register(fsSkill);
    registry.register(browserSkill);
    registry.register(crmSkill);

    expect(registry.count()).toBe(3);
    expect(registry.has('filesystem')).toBe(true);
    expect(registry.has('browser')).toBe(true);
    expect(registry.has('crm')).toBe(true);
  });

  it('should get tool definitions from all registered skills', () => {
    const fsSkill = new FilesystemSkill(tmpDir);
    const browserSkill = new BrowserSkill();
    const crmSkill = new CRMSkill();

    registry.register(fsSkill);
    registry.register(browserSkill);
    registry.register(crmSkill);

    const tools = registry.getToolDefinitions();

    // Should have tools from all three skills combined
    expect(tools.length).toBeGreaterThanOrEqual(3);

    // Each tool should have required fields
    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe('object');
    }

    // Verify tools from different skills exist
    const names = tools.map((t) => t.name);
    expect(names.some((n) => n.startsWith('filesystem') || n.includes('read') || n.includes('write'))).toBe(true);
    expect(names.some((n) => n.startsWith('browser') || n.includes('navigate') || n.includes('search'))).toBe(true);
    expect(names.some((n) => n.startsWith('crm') || n.includes('Contact') || n.includes('Deal'))).toBe(true);
  });

  it('should execute an action through the registry (filesystem skill)', async () => {
    const fsSkill = new FilesystemSkill(tmpDir);
    registry.register(fsSkill);

    // Write a file through the registry
    const writeResult = await registry.execute('filesystem', 'write', {
      path: 'registry-test.txt',
      content: 'Hello from SkillRegistry!',
    });

    expect(writeResult.success).toBe(true);

    // Read it back through the registry
    const readResult = await registry.execute('filesystem', 'read', {
      path: 'registry-test.txt',
    });

    expect(readResult.success).toBe(true);
    expect((readResult.data as { content: string }).content).toBe('Hello from SkillRegistry!');
  });

  it('should execute an action through the registry (CRM skill)', async () => {
    const crmSkill = new CRMSkill();
    registry.register(crmSkill);

    const result = await registry.execute('crm', 'createContact', {
      name: 'Registry Test User',
      email: 'registry@example.com',
    });

    expect(result.success).toBe(true);
    const data = result.data as { contactId: string; name: string; email: string };
    expect(data.contactId).toBeDefined();
    expect(data.name).toBe('Registry Test User');
    expect(data.email).toBe('registry@example.com');
  });

  it('should route to the correct skill when multiple are registered', async () => {
    const fsSkill = new FilesystemSkill(tmpDir);
    const crmSkill = new CRMSkill();

    registry.register(fsSkill);
    registry.register(crmSkill);

    // Execute on filesystem skill
    const fsResult = await registry.execute('filesystem', 'write', {
      path: 'routing-test.txt',
      content: 'routed correctly',
    });
    expect(fsResult.success).toBe(true);

    // Execute on CRM skill
    const crmResult = await registry.execute('crm', 'createContact', {
      name: 'Route Test',
      email: 'route@example.com',
    });
    expect(crmResult.success).toBe(true);

    // Verify each skill handled its own action
    const readBack = await registry.execute('filesystem', 'read', {
      path: 'routing-test.txt',
    });
    expect(readBack.success).toBe(true);
    expect((readBack.data as { content: string }).content).toBe('routed correctly');

    const lookupResult = await registry.execute('crm', 'lookupContact', {
      email: 'route@example.com',
    });
    expect(lookupResult.success).toBe(true);
    expect((lookupResult.data as { name: string }).name).toBe('Route Test');
  });

  it('should return an error when executing on an unregistered skill', async () => {
    const fsSkill = new FilesystemSkill(tmpDir);
    registry.register(fsSkill);

    // Try to execute on a skill that is not registered
    const result = await registry.execute('email', 'send', {
      to: 'test@example.com',
      subject: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('not found');
  });

  it('should get a specific skill by ID', () => {
    const fsSkill = new FilesystemSkill(tmpDir);
    const crmSkill = new CRMSkill();

    registry.register(fsSkill);
    registry.register(crmSkill);

    const retrieved = registry.get('filesystem');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('filesystem');
    expect(retrieved!.name).toBe('Filesystem');

    const missing = registry.get('nonexistent');
    expect(missing).toBeUndefined();
  });

  it('should list all registered skill IDs', () => {
    const fsSkill = new FilesystemSkill(tmpDir);
    const browserSkill = new BrowserSkill();
    const crmSkill = new CRMSkill();

    registry.register(fsSkill);
    registry.register(browserSkill);
    registry.register(crmSkill);

    const ids = registry.listSkillIds();

    expect(ids).toContain('filesystem');
    expect(ids).toContain('browser');
    expect(ids).toContain('crm');
    expect(ids).toHaveLength(3);
  });
});
