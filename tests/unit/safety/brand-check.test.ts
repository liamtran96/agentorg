import { describe, it, expect } from 'vitest';
import { BrandChecker } from '@agentorg/safety';
import type { BrandCheckConfig } from '@agentorg/core';

describe('BrandChecker', () => {
  const baseConfig: BrandCheckConfig = {
    enabled: true,
    blockedWords: ["I'm an AI", 'as a language model', 'I cannot'],
  };

  it('should pass when content is clean and matches brand guide', () => {
    const checker = new BrandChecker(baseConfig);
    const result = checker.check('Thank you for reaching out! We would love to help you with your question.');

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail when content contains blocked words', () => {
    const checker = new BrandChecker(baseConfig);

    const result1 = checker.check("I'm an AI assistant and I'm here to help.");
    expect(result1.passed).toBe(false);
    expect(result1.violations.length).toBeGreaterThan(0);

    const result2 = checker.check('As a language model, I have limitations.');
    expect(result2.passed).toBe(false);
    expect(result2.violations.length).toBeGreaterThan(0);

    const result3 = checker.check('I cannot provide that information.');
    expect(result3.passed).toBe(false);
    expect(result3.violations.length).toBeGreaterThan(0);
  });

  it('should detect multiple blocked words in a single message', () => {
    const checker = new BrandChecker(baseConfig);
    const result = checker.check("I'm an AI and as a language model I cannot do that.");

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('should enforce required sign-off when configured', () => {
    const config: BrandCheckConfig = {
      ...baseConfig,
      requiredSignOff: '— The AgentOrg Team',
    };
    const checker = new BrandChecker(config);

    const withoutSignOff = checker.check('Thanks for your patience, we will get back to you soon.');
    expect(withoutSignOff.passed).toBe(false);
    expect(withoutSignOff.violations.some((v) => v.toLowerCase().includes('sign-off') || v.toLowerCase().includes('sign off'))).toBe(true);

    const withSignOff = checker.check(
      'Thanks for your patience, we will get back to you soon.\n\n— The AgentOrg Team',
    );
    expect(withSignOff.passed).toBe(true);
    expect(withSignOff.violations).toHaveLength(0);
  });

  it('should provide rewrite suggestion when enforceTone is enabled and tone is wrong', () => {
    const config: BrandCheckConfig = {
      ...baseConfig,
      enforceTone: true,
      brandVoice: 'professional, warm, and helpful',
    };
    const checker = new BrandChecker(config);

    // Aggressive/rude tone that violates brand voice
    const result = checker.check('Whatever. Figure it out yourself. We already told you the answer.');

    expect(result.passed).toBe(false);
    expect(result.rewriteSuggestion).toBeDefined();
    expect(typeof result.rewriteSuggestion).toBe('string');
    expect(result.rewriteSuggestion!.length).toBeGreaterThan(0);
  });

  it('should pass when enforceTone is enabled and tone matches brand voice', () => {
    const config: BrandCheckConfig = {
      ...baseConfig,
      enforceTone: true,
      brandVoice: 'professional, warm, and helpful',
    };
    const checker = new BrandChecker(config);

    const result = checker.check(
      'We appreciate your feedback and are happy to assist you with this matter. Please let us know how we can help!',
    );

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should not check anything when disabled', () => {
    const config: BrandCheckConfig = {
      enabled: false,
      blockedWords: ["I'm an AI"],
    };
    const checker = new BrandChecker(config);

    const result = checker.check("I'm an AI and I cannot help.");
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
