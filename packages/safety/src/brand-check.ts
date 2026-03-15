import type { BrandCheckConfig } from '@agentorg/core';

export interface BrandCheckResult {
  passed: boolean;
  violations: string[];
  rewriteSuggestion?: string;
}

/**
 * Negative tone patterns used for brand voice enforcement.
 */
const NEGATIVE_PATTERNS = [
  'whatever',
  'figure it out',
  'not my problem',
  'deal with it',
  'already told you',
  'obviously',
  'as i said',
  'i don\'t care',
  'shut up',
  'stupid',
  'idiot',
  'get lost',
];

/**
 * BrandChecker ensures agent output adheres to brand guidelines.
 * Checks for blocked words, required sign-offs, and tone enforcement.
 */
export class BrandChecker {
  private config: BrandCheckConfig;

  constructor(config: BrandCheckConfig) {
    this.config = config;
  }

  /**
   * Check content against brand guidelines.
   */
  check(content: string): BrandCheckResult {
    if (!this.config.enabled) {
      return { passed: true, violations: [] };
    }

    const violations: string[] = [];

    // Check blocked words (case-insensitive)
    const contentLower = content.toLowerCase();
    for (const word of this.config.blockedWords) {
      if (contentLower.includes(word.toLowerCase())) {
        violations.push(`Blocked phrase detected: "${word}"`);
      }
    }

    // Check required sign-off
    if (this.config.requiredSignOff) {
      if (!content.includes(this.config.requiredSignOff)) {
        violations.push(`Missing required sign-off: "${this.config.requiredSignOff}"`);
      }
    }

    // Check tone enforcement
    let rewriteSuggestion: string | undefined;
    if (this.config.enforceTone && this.config.brandVoice) {
      const toneViolation = this.checkTone(content, this.config.brandVoice);
      if (toneViolation) {
        violations.push(toneViolation);
        rewriteSuggestion = this.generateRewriteSuggestion(content, this.config.brandVoice);
      }
    }

    const passed = violations.length === 0;
    return { passed, violations, rewriteSuggestion };
  }

  /**
   * Simple tone check using negative word detection.
   * Returns a violation string if the tone doesn't match, or null if it does.
   */
  private checkTone(content: string, brandVoice: string): string | null {
    const contentLower = content.toLowerCase();

    // Detect aggressive/rude/dismissive language
    const foundNegative = NEGATIVE_PATTERNS.filter((p) => contentLower.includes(p));
    if (foundNegative.length > 0) {
      return `Tone violation: content contains dismissive/aggressive language ("${foundNegative.join('", "')}") which conflicts with brand voice: ${brandVoice}`;
    }

    return null;
  }

  /**
   * Generate a rewrite suggestion for content that violates tone guidelines.
   */
  private generateRewriteSuggestion(content: string, brandVoice: string): string {
    return `Please rewrite the following message to match the brand voice (${brandVoice}): "${content}"`;
  }
}
