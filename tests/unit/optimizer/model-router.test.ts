import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter } from '@agentorg/optimizer';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter({
      defaultModel: 'claude-3-haiku',
      models: [
        { id: 'claude-3-haiku', costPer1kTokens: 0.00025, maxTokens: 4096, tier: 'fast' },
        { id: 'claude-3-sonnet', costPer1kTokens: 0.003, maxTokens: 8192, tier: 'balanced' },
        { id: 'claude-3-opus', costPer1kTokens: 0.015, maxTokens: 16384, tier: 'powerful' },
      ],
    });
  });

  it('should route to cheapest model for simple tasks', () => {
    const result = router.route({
      description: 'Say hello',
      agentId: 'greeter',
    });

    expect(result.modelId).toBe('claude-3-haiku');
  });

  it('should route to capable model for complex tasks', () => {
    const result = router.route({
      description:
        'Analyze the following codebase for security vulnerabilities, refactor the authentication module, and write comprehensive unit tests covering edge cases for the payment processing pipeline with multi-currency support.',
      agentId: 'developer',
      requiresCode: true,
    });

    expect(result.modelId).not.toBe('claude-3-haiku');
    expect(['claude-3-sonnet', 'claude-3-opus']).toContain(result.modelId);
  });

  it('should respect per-agent model override', () => {
    router.setAgentOverride('special-agent', 'claude-3-opus');

    const result = router.route({
      description: 'Say hello',
      agentId: 'special-agent',
    });

    expect(result.modelId).toBe('claude-3-opus');
  });

  it('should fall back to default model when no routing rules match', () => {
    const result = router.route({
      description: 'A medium complexity task',
      agentId: 'worker',
    });

    expect(result.modelId).toBe('claude-3-haiku');
  });

  it('should include cost estimate in routing result', () => {
    const result = router.route({
      description: 'Simple task',
      agentId: 'worker',
    });

    expect(result).toHaveProperty('modelId');
    expect(result).toHaveProperty('estimatedCostPer1kTokens');
    expect(typeof result.estimatedCostPer1kTokens).toBe('number');
  });

  it('should clear agent override', () => {
    router.setAgentOverride('agent-a', 'claude-3-opus');
    router.clearAgentOverride('agent-a');

    const result = router.route({
      description: 'Simple task',
      agentId: 'agent-a',
    });

    expect(result.modelId).toBe('claude-3-haiku');
  });
});
