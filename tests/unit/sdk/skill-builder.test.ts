import { describe, it, expect } from 'vitest';
import { createSkill } from '@agentorg/sdk';

describe('SDK — Skill Builder', () => {
  const validSkillOptions = {
    id: 'my-skill',
    name: 'My Skill',
    description: 'A custom skill',
    version: '1.0.0',
    capabilities: ['action1', 'action2'],
    execute: async (action: string, params: Record<string, unknown>) => ({
      success: true,
      data: params,
    }),
    tools: [
      {
        name: 'my_tool',
        description: 'Does things',
        input_schema: {
          type: 'object',
          properties: { input: { type: 'string' } },
        },
      },
    ],
  };

  it('should return a valid Skill with id, name, execute, and getToolDefinitions', () => {
    const skill = createSkill(validSkillOptions);

    expect(skill.id).toBe('my-skill');
    expect(skill.name).toBe('My Skill');
    expect(skill.description).toBe('A custom skill');
    expect(skill.version).toBe('1.0.0');
    expect(skill.capabilities).toEqual(['action1', 'action2']);
    expect(typeof skill.execute).toBe('function');
    expect(typeof skill.getToolDefinitions).toBe('function');
  });

  it('should throw if id is missing', () => {
    const opts = { ...validSkillOptions, id: undefined } as any;
    expect(() => createSkill(opts)).toThrow();
  });

  it('should throw if name is missing', () => {
    const opts = { ...validSkillOptions, name: undefined } as any;
    expect(() => createSkill(opts)).toThrow();
  });

  it('should throw if execute is missing', () => {
    const opts = { ...validSkillOptions, execute: undefined } as any;
    expect(() => createSkill(opts)).toThrow();
  });

  it('should return tool definitions matching the provided schema', () => {
    const skill = createSkill(validSkillOptions);
    const tools = skill.getToolDefinitions();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('my_tool');
    expect(tools[0].description).toBe('Does things');
    expect(tools[0].input_schema).toEqual({
      type: 'object',
      properties: { input: { type: 'string' } },
    });
  });

  it('should return empty tool definitions when no tools provided', () => {
    const opts = { ...validSkillOptions, tools: undefined };
    const skill = createSkill(opts);
    const tools = skill.getToolDefinitions();

    expect(tools).toEqual([]);
  });

  it('should delegate execute to the provided handler', async () => {
    const skill = createSkill(validSkillOptions);
    const result = await skill.execute('action1', { key: 'value' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value' });
  });

  it('should pass action and params through to handler correctly', async () => {
    let receivedAction: string | undefined;
    let receivedParams: Record<string, unknown> | undefined;

    const skill = createSkill({
      ...validSkillOptions,
      execute: async (action: string, params: Record<string, unknown>) => {
        receivedAction = action;
        receivedParams = params;
        return { success: true, data: null };
      },
    });

    await skill.execute('action2', { foo: 'bar' });

    expect(receivedAction).toBe('action2');
    expect(receivedParams).toEqual({ foo: 'bar' });
  });
});
