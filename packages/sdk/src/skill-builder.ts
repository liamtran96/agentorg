import type { ToolDefinition } from '@agentorg/core';

/**
 * Options for creating a custom skill via the SDK.
 */
export interface CreateSkillOptions {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  execute: (action: string, params: Record<string, unknown>) => Promise<{ success: boolean; data: unknown }>;
  tools?: ToolDefinition[];
}

/**
 * A skill instance returned by createSkill.
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  execute: (action: string, params: Record<string, unknown>) => Promise<{ success: boolean; data: unknown }>;
  getToolDefinitions: () => ToolDefinition[];
}

/**
 * Creates a new skill from the provided options.
 * Validates required fields and returns a Skill object.
 */
export function createSkill(options: CreateSkillOptions): Skill {
  if (!options.id) {
    throw new Error('Skill id is required');
  }
  if (!options.name) {
    throw new Error('Skill name is required');
  }
  if (!options.execute) {
    throw new Error('Skill execute handler is required');
  }

  const tools = options.tools ?? [];

  return {
    id: options.id,
    name: options.name,
    description: options.description,
    version: options.version,
    capabilities: options.capabilities,
    execute: options.execute,
    getToolDefinitions: () => [...tools],
  };
}
