import type { SkillDefinition, WorkflowDefinition } from '@agentorg/core';

export interface CapabilityTreeResult {
  capabilities: string[];
  skills: SkillDefinition[];
}

/**
 * Manages the capability tree: tracks installed skills and their capabilities,
 * detects missing capabilities for workflows, and suggests skills to install.
 */
export class CapabilityTree {
  private installedSkills = new Map<string, SkillDefinition>();
  private availableSkills = new Map<string, SkillDefinition>();

  /**
   * Build the capability tree from a list of installed skills.
   * @param skills - The installed skills
   * @returns The capability tree result
   */
  build(skills: SkillDefinition[]): CapabilityTreeResult {
    this.installedSkills.clear();
    for (const skill of skills) {
      this.installedSkills.set(skill.id, skill);
    }
    return {
      capabilities: this.getCapabilities(),
      skills: Array.from(this.installedSkills.values()),
    };
  }

  /**
   * Register a new skill as installed.
   * @param skill - The skill to register
   */
  register(skill: SkillDefinition): void {
    this.installedSkills.set(skill.id, skill);
  }

  /**
   * Register a skill as available (but not installed).
   * Used for suggesting skills to install.
   * @param skill - The available skill
   */
  registerAvailable(skill: SkillDefinition): void {
    this.availableSkills.set(skill.id, skill);
  }

  /**
   * Get all capabilities from installed skills (deduplicated).
   * @returns Array of capability strings
   */
  getCapabilities(): string[] {
    const caps = new Set<string>();
    for (const skill of this.installedSkills.values()) {
      for (const cap of skill.capabilities) {
        caps.add(cap);
      }
    }
    return Array.from(caps);
  }

  /**
   * Find capabilities required by a workflow that are not present.
   * @param workflow - The workflow to check
   * @param currentCapabilities - The currently available capabilities
   * @returns Array of missing capability strings
   */
  findMissing(workflow: WorkflowDefinition, currentCapabilities: string[]): string[] {
    const available = new Set(currentCapabilities);
    const missing = new Set<string>();

    for (const step of workflow.steps) {
      if (step.action && !available.has(step.action)) {
        missing.add(step.action);
      }
    }

    return Array.from(missing);
  }

  /**
   * Suggest available (not installed) skills that provide the given capabilities.
   * @param missingCapabilities - The capabilities that are needed
   * @returns Array of skill definitions that provide the missing capabilities
   */
  suggestSkills(missingCapabilities: string[]): SkillDefinition[] {
    const needed = new Set(missingCapabilities);
    const suggestions = new Map<string, SkillDefinition>();

    for (const skill of this.availableSkills.values()) {
      for (const cap of skill.capabilities) {
        if (needed.has(cap)) {
          suggestions.set(skill.id, skill);
          break;
        }
      }
    }

    return Array.from(suggestions.values());
  }
}
