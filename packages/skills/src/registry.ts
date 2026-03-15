import type { Skill, SkillResult, ToolDefinition } from './base.js';

/**
 * SkillRegistry — central registry for all skills in the system.
 * Supports registration, lookup, capability-based filtering, and
 * proxied execution via `execute(skillId, action, params)`.
 */
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  constructor(initialSkills?: Skill[]) {
    if (initialSkills) {
      for (const skill of initialSkills) {
        this.register(skill);
      }
    }
  }

  /**
   * Register a skill. Throws if a skill with the same ID is already registered.
   */
  register(skill: Skill): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill with id "${skill.id}" is already registered`);
    }
    this.skills.set(skill.id, skill);
  }

  /**
   * Remove a skill by ID.
   */
  unregister(id: string): void {
    this.skills.delete(id);
  }

  /**
   * Check whether a skill with the given ID is registered.
   */
  has(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * Get a skill by ID, or undefined if not registered.
   */
  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * Get all registered skills as an array.
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Return the number of registered skills.
   */
  count(): number {
    return this.skills.size;
  }

  /**
   * Return the IDs of all registered skills.
   */
  listSkillIds(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Return all skills that declare the given capability.
   */
  getByCapability(capability: string): Skill[] {
    return this.getAll().filter((skill) => skill.capabilities.includes(capability));
  }

  /**
   * Aggregate tool definitions from every registered skill.
   */
  getAllToolDefinitions(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const skill of this.skills.values()) {
      tools.push(...skill.getToolDefinitions());
    }
    return tools;
  }

  /**
   * Alias used by integration tests — delegates to getAllToolDefinitions.
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.getAllToolDefinitions();
  }

  /**
   * Execute an action on a specific skill by ID.
   * Returns an error result if the skill is not found.
   */
  async execute(
    skillId: string,
    action: string,
    params: Record<string, unknown>,
  ): Promise<SkillResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        success: false,
        data: null,
        error: `Skill "${skillId}" not found in registry`,
      };
    }
    return skill.execute(action, params);
  }
}
