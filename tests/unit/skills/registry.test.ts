import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry, FilesystemSkill } from '@agentorg/skills';
import type { Skill, SkillResult, ToolDefinition } from '@agentorg/skills';

/** Minimal stub skill for testing the registry without real side-effects. */
class StubSkill implements Skill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version = '0.1.0';
  capabilities: string[];

  constructor(id: string, name: string, capabilities: string[] = []) {
    this.id = id;
    this.name = name;
    this.description = `Stub skill: ${name}`;
    this.capabilities = capabilities;
  }

  async execute(_action: string, _params: Record<string, unknown>): Promise<SkillResult> {
    return { success: true, data: null };
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: `${this.id}_action`,
        description: `Action for ${this.name}`,
        input_schema: { type: 'object', properties: {}, required: [] },
      },
    ];
  }
}

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  describe('register', () => {
    it('should register a skill', () => {
      const skill = new StubSkill('stub-1', 'Stub One');

      registry.register(skill);

      expect(registry.has('stub-1')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return the skill instance by ID', () => {
      const skill = new StubSkill('stub-2', 'Stub Two');
      registry.register(skill);

      const found = registry.get('stub-2');

      expect(found).toBe(skill);
      expect(found?.id).toBe('stub-2');
      expect(found?.name).toBe('Stub Two');
    });

    it('should return undefined for an unregistered ID', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered skills as an array', () => {
      const s1 = new StubSkill('a', 'A');
      const s2 = new StubSkill('b', 'B');
      registry.register(s1);
      registry.register(s2);

      const all = registry.getAll();

      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(2);
      expect(all).toContain(s1);
      expect(all).toContain(s2);
    });

    it('should return an empty array when nothing is registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for a registered skill', () => {
      registry.register(new StubSkill('present', 'Present'));

      expect(registry.has('present')).toBe(true);
    });

    it('should return false for an unregistered skill', () => {
      expect(registry.has('absent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove a registered skill', () => {
      registry.register(new StubSkill('removable', 'Removable'));
      expect(registry.has('removable')).toBe(true);

      registry.unregister('removable');

      expect(registry.has('removable')).toBe(false);
      expect(registry.get('removable')).toBeUndefined();
    });
  });

  describe('getByCapability', () => {
    it('should return skills that have the given capability', () => {
      const reader = new StubSkill('reader', 'Reader', ['read']);
      const writer = new StubSkill('writer', 'Writer', ['write']);
      const readWriter = new StubSkill('rw', 'ReadWriter', ['read', 'write']);
      registry.register(reader);
      registry.register(writer);
      registry.register(readWriter);

      const readers = registry.getByCapability('read');

      expect(readers.length).toBe(2);
      expect(readers).toContain(reader);
      expect(readers).toContain(readWriter);
    });

    it('should return FilesystemSkill for the read capability', () => {
      const fs = new FilesystemSkill('/tmp/agentorg-registry-test');
      registry.register(fs);

      const readers = registry.getByCapability('read');

      expect(readers.length).toBe(1);
      expect(readers[0]).toBe(fs);
      expect(readers[0].id).toBe('filesystem');
    });

    it('should return an empty array when no skills have the capability', () => {
      registry.register(new StubSkill('only-write', 'Writer', ['write']));

      expect(registry.getByCapability('delete')).toEqual([]);
    });
  });

  describe('duplicate registration', () => {
    it('should throw when the same skill ID is registered twice', () => {
      registry.register(new StubSkill('dup', 'First'));

      expect(() => {
        registry.register(new StubSkill('dup', 'Second'));
      }).toThrow();
    });
  });

  describe('getAllToolDefinitions', () => {
    it('should aggregate tool definitions from all registered skills', () => {
      const s1 = new StubSkill('alpha', 'Alpha');
      const s2 = new StubSkill('beta', 'Beta');
      registry.register(s1);
      registry.register(s2);

      const tools = registry.getAllToolDefinitions();

      expect(tools.length).toBe(2);
      const names = tools.map((t) => t.name);
      expect(names).toContain('alpha_action');
      expect(names).toContain('beta_action');

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.input_schema).toBeDefined();
      }
    });

    it('should return an empty array when no skills are registered', () => {
      expect(registry.getAllToolDefinitions()).toEqual([]);
    });
  });

  describe('constructor with initial skills', () => {
    it('should accept an array of skills in the constructor', () => {
      const s1 = new StubSkill('init-a', 'Init A', ['read']);
      const s2 = new StubSkill('init-b', 'Init B', ['write']);

      const reg = new SkillRegistry([s1, s2]);

      expect(reg.has('init-a')).toBe(true);
      expect(reg.has('init-b')).toBe(true);
      expect(reg.getAll().length).toBe(2);
    });
  });
});
