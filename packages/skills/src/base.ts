/**
 * Base skill interface — all native skills implement this.
 * Skills are the building blocks. The skill graph composes them.
 */
export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;

  /** What this skill can do */
  capabilities: string[];

  /** Execute an action */
  execute(action: string, params: Record<string, unknown>): Promise<SkillResult>;

  /** Revert the last action (error recovery) */
  revert?(actionId: string): Promise<boolean>;

  /** Get tool definitions for LLM function calling */
  getToolDefinitions(): ToolDefinition[];
}

export interface SkillResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
