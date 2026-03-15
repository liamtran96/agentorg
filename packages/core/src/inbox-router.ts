import type { InboxConfig, TaskPriority } from './types.js';

/** Result of routing an incoming message */
export interface RoutingResult {
  agentId: string;
  priority: TaskPriority;
}

/** A routing rule with its pre-compiled regex */
interface CompiledRule {
  regex: RegExp;
  assignTo: string;
  priority?: TaskPriority;
}

/**
 * InboxRouter — Routes incoming messages to the appropriate agent based on keyword/regex rules.
 * First matching rule wins. Falls back to defaultAgent if no rule matches.
 */
export class InboxRouter {
  private config: InboxConfig;
  private compiledRules: CompiledRule[];

  constructor(config: InboxConfig) {
    this.config = config;
    this.compiledRules = [];

    for (const rule of config.routing) {
      try {
        const regex = new RegExp(rule.match, 'i');
        this.compiledRules.push({
          regex,
          assignTo: rule.assignTo,
          priority: rule.priority,
        });
      } catch {
        // Skip rules with invalid regex patterns
      }
    }
  }

  /** Route a message to an agent based on configured rules */
  route(message: string): RoutingResult | null {
    for (const rule of this.compiledRules) {
      if (rule.regex.test(message)) {
        return {
          agentId: rule.assignTo,
          priority: rule.priority ?? 'normal',
        };
      }
    }

    if (this.config.defaultAgent) {
      return {
        agentId: this.config.defaultAgent,
        priority: 'normal',
      };
    }

    return null;
  }
}
