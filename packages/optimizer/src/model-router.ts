/**
 * Model configuration for routing decisions.
 */
export interface ModelConfig {
  id: string;
  costPer1kTokens: number;
  maxTokens: number;
  tier: 'fast' | 'balanced' | 'powerful';
}

/**
 * Configuration for the ModelRouter.
 */
export interface ModelRouterConfig {
  defaultModel: string;
  models: ModelConfig[];
}

/**
 * A task to be routed to an appropriate model.
 */
export interface RouteRequest {
  description: string;
  agentId: string;
  requiresCode?: boolean;
}

/**
 * The result of a routing decision.
 */
export interface RouteResult {
  modelId: string;
  estimatedCostPer1kTokens: number;
}

/**
 * Routes tasks to the most cost-effective model based on task complexity.
 */
export class ModelRouter {
  private config: ModelRouterConfig;
  private agentOverrides: Map<string, string> = new Map();

  constructor(config: ModelRouterConfig) {
    this.config = config;
  }

  /**
   * Route a task to the most appropriate model.
   */
  route(request: RouteRequest): RouteResult {
    // Check for agent-level override first
    const override = this.agentOverrides.get(request.agentId);
    if (override) {
      const model = this.config.models.find((m) => m.id === override);
      if (model) {
        return { modelId: model.id, estimatedCostPer1kTokens: model.costPer1kTokens };
      }
    }

    // Determine complexity
    const complexity = this.assessComplexity(request);

    let targetTier: 'fast' | 'balanced' | 'powerful';
    if (complexity >= 0.7) {
      targetTier = 'powerful';
    } else if (complexity >= 0.4) {
      targetTier = 'balanced';
    } else {
      targetTier = 'fast';
    }

    // Find model matching tier, fall back to default
    const model =
      this.config.models.find((m) => m.tier === targetTier) ??
      this.config.models.find((m) => m.id === this.config.defaultModel);

    if (model) {
      return { modelId: model.id, estimatedCostPer1kTokens: model.costPer1kTokens };
    }

    // Ultimate fallback
    return { modelId: this.config.defaultModel, estimatedCostPer1kTokens: 0 };
  }

  /**
   * Set a model override for a specific agent.
   */
  setAgentOverride(agentId: string, modelId: string): void {
    this.agentOverrides.set(agentId, modelId);
  }

  /**
   * Clear a model override for a specific agent.
   */
  clearAgentOverride(agentId: string): void {
    this.agentOverrides.delete(agentId);
  }

  /**
   * Assess the complexity of a task (0-1 scale).
   */
  private assessComplexity(request: RouteRequest): number {
    let score = 0;
    const desc = request.description;

    // Length-based heuristic
    const wordCount = desc.split(/\s+/).length;
    if (wordCount > 30) score += 0.3;
    else if (wordCount > 15) score += 0.15;

    // Code-related tasks are more complex
    if (request.requiresCode) score += 0.3;

    // Keywords that suggest complexity
    const complexKeywords = [
      'analyze', 'refactor', 'security', 'vulnerabilities', 'comprehensive',
      'pipeline', 'architecture', 'multi-', 'edge cases', 'unit tests',
    ];
    for (const keyword of complexKeywords) {
      if (desc.toLowerCase().includes(keyword)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1);
  }
}
