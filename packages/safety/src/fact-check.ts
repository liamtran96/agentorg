import fs from 'node:fs';

export interface FactCheckResult {
  passed: boolean;
  violations: string[];
  fallbackMessage?: string;
}

/**
 * FactChecker validates content against source-of-truth files.
 * It detects when agent output contradicts known facts (pricing, policies, etc.).
 */
export class FactChecker {
  private sourceFiles: string[];
  private cachedFacts: string[] | null = null;

  constructor(sourceFiles: string[]) {
    this.sourceFiles = sourceFiles;
  }

  /**
   * Load and parse all source-of-truth files.
   * Returns an array of fact strings extracted from the files.
   * Results are cached after the first call.
   */
  private loadSources(): string[] {
    if (this.cachedFacts !== null) {
      return this.cachedFacts;
    }

    const facts: string[] = [];
    for (const filePath of this.sourceFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.replace(/^[-*#\s]+/, '').trim();
          if (trimmed.length > 0) {
            facts.push(trimmed);
          }
        }
      } catch {
        // Missing files are handled gracefully — just skip
      }
    }

    this.cachedFacts = facts;
    return facts;
  }

  /**
   * Extract numeric claims from text, e.g. "$29/month" or "60-day".
   * Returns an array of claim objects with value and context.
   */
  private extractClaims(text: string): Array<{ raw: string; value: string; context: string }> {
    const claims: Array<{ raw: string; value: string; context: string }> = [];

    // Match price patterns like $29/month, $499
    const pricePattern = /\$\d+(?:\/\w+)?/g;
    let match: RegExpExecArray | null;
    while ((match = pricePattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      claims.push({
        raw: match[0],
        value: match[0],
        context: text.slice(start, end),
      });
    }

    // Match N-day patterns like "30-day", "60-day", "14-day"
    const dayPattern = /(\d+)-day/g;
    while ((match = dayPattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      claims.push({
        raw: match[0],
        value: match[0],
        context: text.slice(start, end),
      });
    }

    return claims;
  }

  /**
   * Check content against source-of-truth files.
   * Returns a result indicating whether the content is factually consistent.
   */
  async check(content: string): Promise<FactCheckResult> {
    const facts = this.loadSources();
    const violations: string[] = [];

    if (facts.length === 0) {
      // No sources available — pass by default
      return { passed: true, violations: [] };
    }

    const contentClaims = this.extractClaims(content);

    for (const claim of contentClaims) {
      const contradicts = this.findContradiction(claim, facts);
      if (contradicts) {
        violations.push(contradicts);
      }
    }

    const passed = violations.length === 0;
    return {
      passed,
      violations,
      fallbackMessage: passed
        ? undefined
        : 'The content contains claims that contradict our source-of-truth documents. Please verify the facts before sending.',
    };
  }

  /**
   * Check if a claim from the content contradicts any source fact.
   * Uses simple string matching to find related facts and compare values.
   */
  private findContradiction(
    claim: { raw: string; value: string; context: string },
    facts: string[],
  ): string | null {
    const priceRegex = /\$(\d+)/;
    const dayRegex = /(\d+)-day/;

    // For price claims like "$49/month"
    const priceMatch = claim.value.match(priceRegex);
    if (priceMatch) {
      const claimAmount = priceMatch[1];
      for (const fact of facts) {
        const factPriceMatch = fact.match(priceRegex);
        if (!factPriceMatch) continue;

        const claimContext = claim.context.toLowerCase();
        const factLower = fact.toLowerCase();

        const keywords = ['basic', 'pro', 'enterprise', 'starter', 'premium', 'trial', 'free'];
        for (const keyword of keywords) {
          if (claimContext.includes(keyword) && factLower.includes(keyword)) {
            if (claimAmount !== factPriceMatch[1]) {
              return `Price mismatch for "${keyword}": content says $${claimAmount} but source says $${factPriceMatch[1]}`;
            }
          }
        }
      }
    }

    // For day-based claims like "60-day"
    const dayMatch = claim.value.match(dayRegex);
    if (dayMatch) {
      const claimDays = dayMatch[1];
      for (const fact of facts) {
        const factDayMatch = fact.match(dayRegex);
        if (!factDayMatch) continue;

        const claimContext = claim.context.toLowerCase();
        const factLower = fact.toLowerCase();

        const subjects = ['refund', 'return', 'trial', 'warranty', 'guarantee', 'cancellation'];
        for (const subject of subjects) {
          if (claimContext.includes(subject) && factLower.includes(subject)) {
            if (claimDays !== factDayMatch[1]) {
              return `Duration mismatch for "${subject}": content says ${claimDays}-day but source says ${factDayMatch[1]}-day`;
            }
          }
        }
      }
    }

    return null;
  }
}
