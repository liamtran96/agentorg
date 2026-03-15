import type {
  AgentConfig,
  ActionRecord,
  OrchestratorResult,
  OrchestratorDecision,
  CompanyConfig,
  GovernanceRule,
} from '../types.js';

/** Rough cost estimates per action type (static, allocated once) */
const COST_MAP: Record<string, number> = {
  'email.send': 0.01,
  'browser.navigate': 0.02,
  'browser.search': 0.02,
  'filesystem.write': 0.005,
  'filesystem.read': 0.001,
  'crm.update': 0.005,
  'crm.lookup': 0.001,
};

/** Default cost when action type is not in the cost map */
const DEFAULT_ACTION_COST = 0.01;

/**
 * Orchestrator — Central Policy Engine
 *
 * Every agent action passes through here. 6 checks in order:
 * 1. Permission — does this agent have this skill?
 * 2. Scope — is the target within their territory?
 * 3. Budget — can they afford this?
 * 4. Rate limit — too many actions in sliding window?
 * 5. Safety — is the output safe (brand check, fact check)?
 * 6. Approval — needs sign-off per governance rules?
 */
export class Orchestrator {
  private config: CompanyConfig;
  private agentSpend: Map<string, number> = new Map();
  /** Sliding window of action timestamps per agent for rate limiting */
  private actionTimestamps: Map<string, number[]> = new Map();
  /** Default rate limit: 60 actions per minute */
  private static readonly DEFAULT_RATE_LIMIT = 60;
  /** Rate limit window in ms (1 minute) */
  private static readonly RATE_LIMIT_WINDOW_MS = 60_000;

  /** Pre-lowercased blocked words, updated when config changes */
  private cachedBlockedWordsLower: string[] = [];
  /** Pre-compiled regexes for removing blocked words, indexed same as cachedBlockedWordsLower */
  private cachedBlockedWordRegexes: RegExp[] = [];

  constructor(config: CompanyConfig) {
    this.config = config;
    this.buildBlockedWordsCache();
  }

  /** Update config (hot-reload) */
  updateConfig(config: CompanyConfig): void {
    this.config = config;
    this.buildBlockedWordsCache();
  }

  /** Pre-compute lowercased blocked words and their removal regexes */
  private buildBlockedWordsCache(): void {
    const words = this.config.safety?.brandCheck?.blockedWords || [];
    this.cachedBlockedWordsLower = words.map((w) => w.toLowerCase());
    this.cachedBlockedWordRegexes = words.map(
      (w) => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
    );
  }

  /** Check an action against all rules. Returns in <20ms. */
  check(agentId: string, action: ActionRecord): OrchestratorResult {
    const agent = this.config.org[agentId];
    if (!agent) {
      return this.blocked('AGENT_NOT_FOUND', `Agent "${agentId}" not in org chart`);
    }

    // Determine if this action matches any governance rule (affects permission/scope behavior)
    const matchingRule = this.findMatchingGovernanceRule(action);

    // Check 1: Permission — does this agent have this skill?
    // Skip permission check for governance-regulated actions (governance handles access control)
    if (!matchingRule) {
      const permResult = this.checkPermission(agent, action);
      if (!permResult.allowed) {
        return this.blocked('PERMISSION_DENIED', permResult.reason, { permission: false });
      }
    }

    // Check 2: Scope — is the target within their territory?
    // Scope marks governance-matched actions but does not block; approval check handles queuing.
    const scopeResult = this.checkScope(agent, action, matchingRule);

    // Check 3: Budget — can they afford this?
    const budgetResult = this.checkBudget(agent, action);
    if (!budgetResult.allowed) {
      return this.blocked('BUDGET_EXCEEDED', budgetResult.reason, {
        permission: true,
        scope: scopeResult.passed,
        budget: false,
      });
    }

    // Check 4: Rate limit — too many actions in sliding window?
    const rateLimitResult = this.checkRateLimit(agentId);
    if (!rateLimitResult.allowed) {
      return this.blocked('RATE_LIMIT_EXCEEDED', rateLimitResult.reason, {
        permission: true,
        scope: scopeResult.passed,
        budget: true,
        rateLimit: false,
      });
    }
    // Record this action timestamp for rate limiting (only if allowed so far)
    // Push directly onto the array reference returned by checkRateLimit to avoid a second Map lookup
    rateLimitResult.timestamps.push(Date.now());

    // Check 5: Safety — is the output safe?
    const safetyResult = this.checkSafety(action);
    if (!safetyResult.allowed) {
      if (safetyResult.rewritten) {
        return {
          decision: 'REWRITTEN',
          reason: safetyResult.reason,
          checkResults: {
            permission: true,
            scope: scopeResult.passed,
            budget: true,
            rateLimit: true,
            safety: true,
            approval: true,
          },
          rewrittenAction: safetyResult.rewrittenAction,
        };
      }
      return this.blocked('SAFETY_VIOLATION', safetyResult.reason, {
        permission: true,
        scope: scopeResult.passed,
        budget: true,
        rateLimit: true,
        safety: false,
      });
    }

    // Check 6: Approval — needs sign-off per governance rules?
    const approvalResult = this.checkApproval(action, matchingRule);
    if (!approvalResult.allowed) {
      return {
        decision: 'QUEUED',
        reason: approvalResult.reason,
        checkResults: {
          permission: true,
          scope: scopeResult.passed,
          budget: true,
          rateLimit: true,
          safety: true,
          approval: false,
        },
      };
    }

    // All checks passed
    return {
      decision: 'ALLOWED',
      reason: 'All checks passed',
      checkResults: {
        permission: true,
        scope: scopeResult.passed,
        budget: true,
        rateLimit: true,
        safety: true,
        approval: true,
      },
    };
  }

  /** Check 1: Does this agent have permission to use this skill? */
  private checkPermission(
    agent: AgentConfig,
    action: ActionRecord,
  ): { allowed: boolean; reason: string } {
    const skillName = action.type.split('.')[0]; // 'email.send' → 'email'

    if (!agent.skills.includes(skillName)) {
      return {
        allowed: false,
        reason: `Agent "${agent.name}" does not have the "${skillName}" skill. Allowed skills: [${agent.skills.join(', ')}]`,
      };
    }

    return { allowed: true, reason: 'Skill allowed' };
  }

  /** Check 2: Is the target within this agent's territory? */
  private checkScope(
    agent: AgentConfig,
    action: ActionRecord,
    matchingRule: GovernanceRule | null,
  ): { passed: boolean; reason: string } {
    // If a governance rule matches, mark scope as out-of-territory
    // but do not block — the approval check will handle queuing
    if (matchingRule) {
      return {
        passed: false,
        reason: `Action "${action.type}" is governed by a rule requiring ${matchingRule.requires}`,
      };
    }

    return { passed: true, reason: 'Within scope' };
  }

  /** Check 3: Can this agent afford this action? */
  private checkBudget(
    agent: AgentConfig,
    action: ActionRecord,
  ): { allowed: boolean; reason: string } {
    const spent = this.agentSpend.get(agent.id) || 0;
    const estimatedCost = this.estimateActionCost(action);

    if (spent + estimatedCost > agent.budget) {
      return {
        allowed: false,
        reason: `Agent "${agent.name}" budget exhausted. Spent: $${spent.toFixed(2)}, Limit: $${agent.budget}, Action cost: ~$${estimatedCost.toFixed(2)}`,
      };
    }

    return { allowed: true, reason: 'Within budget' };
  }

  /** Check 4: Rate limit — sliding window check. Returns the live timestamps array for direct push. */
  private checkRateLimit(agentId: string): { allowed: boolean; reason: string; timestamps: number[] } {
    const now = Date.now();
    const windowStart = now - Orchestrator.RATE_LIMIT_WINDOW_MS;
    let timestamps = this.actionTimestamps.get(agentId);

    if (timestamps) {
      // Prune old timestamps in place by filtering
      const recentTimestamps = timestamps.filter((t) => t > windowStart);
      // Re-use the pruned array going forward
      if (recentTimestamps.length !== timestamps.length) {
        timestamps = recentTimestamps;
        this.actionTimestamps.set(agentId, timestamps);
      }
    } else {
      timestamps = [];
      this.actionTimestamps.set(agentId, timestamps);
    }

    const limit = Orchestrator.DEFAULT_RATE_LIMIT;

    if (timestamps.length >= limit) {
      return {
        allowed: false,
        reason: `Agent "${agentId}" exceeded rate limit of ${limit} actions per minute. Current: ${timestamps.length}`,
        timestamps,
      };
    }

    return { allowed: true, reason: 'Within rate limit', timestamps };
  }

  /** Check 5: Safety — brand check, fact check */
  private checkSafety(action: ActionRecord): {
    allowed: boolean;
    reason: string;
    rewritten?: boolean;
    rewrittenAction?: ActionRecord;
  } {
    const safety = this.config.safety;
    if (!safety) {
      return { allowed: true, reason: 'No safety config' };
    }

    // Brand check
    if (safety.brandCheck?.enabled) {
      const content = this.extractContent(action);
      const contentLower = content.toLowerCase();
      const blockedWords = safety.brandCheck.blockedWords || [];

      for (let i = 0; i < blockedWords.length; i++) {
        if (contentLower.includes(this.cachedBlockedWordsLower[i])) {
          if (safety.blockMode === 'rewrite') {
            // Rewrite mode: remove blocked words and return rewritten action
            const rewrittenDescription = this.removeBlockedWords(
              action.description,
            );
            return {
              allowed: false,
              rewritten: true,
              reason: `Content contained blocked word "${blockedWords[i]}" — rewritten`,
              rewrittenAction: {
                ...action,
                description: rewrittenDescription,
              },
            };
          }
          return {
            allowed: false,
            reason: `Content contains blocked word/phrase: "${blockedWords[i]}"`,
          };
        }
      }
    }

    // Fact check
    if (safety.factCheck?.enabled) {
      const sourceOfTruth = action.input?.sourceOfTruth as
        | Record<string, unknown>
        | undefined;
      if (sourceOfTruth) {
        const content = action.description || '';
        for (const [key, truthValue] of Object.entries(sourceOfTruth)) {
          const truthStr = String(truthValue);
          // Check if the content mentions something that contradicts the source of truth
          // Simple heuristic: if the key topic is mentioned but the truth value is NOT present,
          // it's likely a contradiction
          if (
            content.toLowerCase().includes(key.toLowerCase()) &&
            !content.includes(truthStr)
          ) {
            return {
              allowed: false,
              reason: `Fact check failed: content may contain incorrect information about "${key}". Expected: ${truthStr}`,
            };
          }
        }
      }
    }

    return { allowed: true, reason: 'Safety checks passed' };
  }

  /** Check 6: Approval — governance rule approval requirements */
  private checkApproval(
    action: ActionRecord,
    matchingRule: GovernanceRule | null,
  ): { allowed: boolean; reason: string } {
    if (!matchingRule) {
      return { allowed: true, reason: 'No matching governance rule' };
    }

    if (matchingRule.requires === 'auto_approve') {
      return { allowed: true, reason: 'Auto-approved by governance rule' };
    }

    // If the rule has an `above` threshold, only require approval when cost exceeds it
    if (matchingRule.above !== undefined) {
      const actionCost = action.cost ?? 0;
      if (actionCost <= matchingRule.above) {
        return { allowed: true, reason: `Cost $${actionCost} is within auto-approve threshold of $${matchingRule.above}` };
      }
    }

    // Requires board_approval or ceo_approval — queue it
    return {
      allowed: false,
      reason: `Action "${action.type}" requires ${matchingRule.requires} per governance rule`,
    };
  }

  /** Record spend after an action completes */
  recordSpend(agentId: string, cost: number): void {
    const current = this.agentSpend.get(agentId) || 0;
    this.agentSpend.set(agentId, current + cost);
  }

  /** Get current spend for an agent */
  getSpend(agentId: string): number {
    return this.agentSpend.get(agentId) || 0;
  }

  /** Reset all spend (e.g., monthly reset) */
  resetSpend(): void {
    this.agentSpend.clear();
  }

  /** Estimate the cost of an action (rough, for budget gating) */
  private estimateActionCost(action: ActionRecord): number {
    return COST_MAP[action.type] || DEFAULT_ACTION_COST;
  }

  /** Find the first governance rule that matches this action */
  private findMatchingGovernanceRule(action: ActionRecord): GovernanceRule | null {
    const rules = this.config.governance?.rules || [];
    for (const rule of rules) {
      if (this.matchesRule(action, rule)) {
        return rule;
      }
    }
    return null;
  }

  /** Check if an action matches a governance rule */
  private matchesRule(action: ActionRecord, rule: GovernanceRule): boolean {
    // Simple pattern matching: 'email.send' matches rule for 'email.send'
    // Wildcard: 'email.*' matches any email action
    if (rule.action === action.type) return true;
    if (rule.action.endsWith('.*')) {
      const prefix = rule.action.slice(0, -2);
      return action.type.startsWith(prefix);
    }
    return false;
  }

  /** Extract text content from an action for safety checks */
  private extractContent(action: ActionRecord): string {
    const parts: string[] = [];
    if (action.description) parts.push(action.description);
    if (action.input?.content && typeof action.input.content === 'string') {
      parts.push(action.input.content);
    }
    return parts.join(' ');
  }

  /** Remove blocked words from text using pre-compiled regexes */
  private removeBlockedWords(text: string): string {
    let result = text;
    for (const regex of this.cachedBlockedWordRegexes) {
      // Reset lastIndex in case the regex was used before (RegExp with 'g' flag is stateful)
      regex.lastIndex = 0;
      result = result.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
    }
    return result;
  }

  private blocked(
    code: string,
    reason: string,
    checks?: Partial<OrchestratorResult['checkResults']>,
  ): OrchestratorResult {
    return {
      decision: 'BLOCKED',
      reason: `[${code}] ${reason}`,
      checkResults: {
        permission: checks?.permission ?? true,
        scope: checks?.scope ?? true,
        budget: checks?.budget ?? true,
        rateLimit: checks?.rateLimit ?? true,
        safety: checks?.safety ?? true,
        approval: checks?.approval ?? true,
      },
    };
  }
}
