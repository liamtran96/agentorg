import type { HallucinationGuardConfig } from '@agentorg/core';

export interface HallucinationGuardResult {
  passed: boolean;
  unsupportedClaims: string[];
  mode: 'block' | 'warn';
}

/**
 * HallucinationGuard checks that agent claims are supported by known sources.
 * It can operate in 'block' mode (fails on unsupported claims) or 'warn' mode (passes but flags them).
 */
export class HallucinationGuard {
  private config: HallucinationGuardConfig;
  private sources: Record<string, string[]>;
  private cachedConfiguredSources: string[] | null = null;

  constructor(config: HallucinationGuardConfig, sources: Record<string, string[]>) {
    this.config = config;
    this.sources = sources;
  }

  /**
   * Get the combined source entries for the configured source types only.
   * Results are cached after the first call.
   */
  private getConfiguredSources(): string[] {
    if (this.cachedConfiguredSources !== null) {
      return this.cachedConfiguredSources;
    }

    const entries: string[] = [];
    for (const sourceKey of this.config.sources) {
      const sourceEntries = this.sources[sourceKey];
      if (sourceEntries) {
        entries.push(...sourceEntries);
      }
    }

    this.cachedConfiguredSources = entries;
    return entries;
  }

  /**
   * Check whether a claim is supported by any source entry.
   * Uses word overlap / substring matching to determine support.
   */
  private isClaimSupported(claim: string, sourceEntries: string[]): boolean {
    const claimLower = claim.toLowerCase();
    const claimWords = claimLower
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .map((w) => w.replace(/[^a-z0-9$]/g, ''));

    for (const entry of sourceEntries) {
      const entryLower = entry.toLowerCase();

      // Direct substring match
      if (entryLower.includes(claimLower) || claimLower.includes(entryLower)) {
        return true;
      }

      // Word overlap: if most significant words from the claim appear in a source entry
      if (claimWords.length > 0) {
        const matchedWords = claimWords.filter((w) => entryLower.includes(w));
        const overlapRatio = matchedWords.length / claimWords.length;
        if (overlapRatio >= 0.6) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check content and optional explicit claims against configured sources.
   * If no explicit claims are provided, sentences from the content are used as claims.
   */
  check(content: string, claims?: string[]): HallucinationGuardResult {
    if (!this.config.enabled) {
      return {
        passed: true,
        unsupportedClaims: [],
        mode: this.config.mode,
      };
    }

    const sourceEntries = this.getConfiguredSources();

    // If no explicit claims, extract sentences from content as claims
    const claimsToCheck = claims ?? this.extractClaims(content);

    const unsupportedClaims: string[] = [];
    for (const claim of claimsToCheck) {
      if (!this.isClaimSupported(claim, sourceEntries)) {
        unsupportedClaims.push(claim);
      }
    }

    // In warn mode, pass even if there are unsupported claims
    const passed =
      this.config.mode === 'warn' ? true : unsupportedClaims.length === 0;

    return {
      passed,
      unsupportedClaims,
      mode: this.config.mode,
    };
  }

  /**
   * Extract simple claims from content by splitting into sentences.
   */
  private extractClaims(content: string): string[] {
    return content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
