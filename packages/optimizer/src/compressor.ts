import type { Message } from './types.js';

export type { Message };

/**
 * Options for compression.
 */
export interface CompressOptions {
  maxLength?: number;
}

/**
 * Result of rolling compression.
 */
export interface RollingCompressResult {
  summary: string;
  recentMessages: Message[];
}

/**
 * Compresses conversation history by extracting and summarizing key information.
 */
export class Compressor {
  /**
   * Compress an entire conversation into a summary string.
   */
  async compress(messages: Message[], options?: CompressOptions): Promise<string> {
    if (messages.length === 0) return '';

    // Extract key facts (numbers, dates, proper nouns patterns)
    const keyFacts = this.extractKeyFacts(messages);

    // Build a condensed summary from all messages
    const contentParts: string[] = [];
    for (const msg of messages) {
      const trimmed = msg.content.trim();
      if (trimmed.length > 0) {
        contentParts.push(trimmed);
      }
    }

    let summary = this.summarizeContent(contentParts, keyFacts);

    // Respect maxLength
    if (options?.maxLength && summary.length > options.maxLength) {
      summary = summary.substring(0, options.maxLength - 3).trimEnd() + '...';
      // Ensure we don't exceed maxLength
      if (summary.length > options.maxLength) {
        summary = summary.substring(0, options.maxLength);
      }
    }

    return summary;
  }

  /**
   * Compress oldest messages while keeping the N most recent intact.
   */
  async compressOldest(messages: Message[], keepRecent: number): Promise<RollingCompressResult> {
    if (messages.length <= keepRecent) {
      return { summary: '', recentMessages: [...messages] };
    }

    const olderMessages = messages.slice(0, messages.length - keepRecent);
    const recentMessages = messages.slice(messages.length - keepRecent);

    const summary = await this.compress(olderMessages);

    return { summary, recentMessages };
  }

  /**
   * Extract key facts from messages (numbers, dates, proper nouns).
   */
  private extractKeyFacts(messages: Message[]): string[] {
    const facts: string[] = [];
    const seen = new Set<string>();

    for (const msg of messages) {
      // Extract dollar amounts
      const moneyMatches = msg.content.match(/\$[\d,]+(?:\.\d+)?/g);
      if (moneyMatches) {
        for (const m of moneyMatches) {
          if (!seen.has(m)) {
            seen.add(m);
            facts.push(m);
          }
        }
      }

      // Extract dates
      const dateMatches = msg.content.match(
        /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?/gi
      );
      if (dateMatches) {
        for (const d of dateMatches) {
          if (!seen.has(d)) {
            seen.add(d);
            facts.push(d);
          }
        }
      }
    }

    return facts;
  }

  /**
   * Create a condensed summary from content parts, ensuring key facts are included.
   */
  private summarizeContent(parts: string[], keyFacts: string[]): string {
    // For short conversations, just concatenate with separator
    const joined = parts.join(' | ');

    // Compress by taking key sentences
    const sentences = joined.split(/[.|]+/).map((s) => s.trim()).filter((s) => s.length > 0);

    if (sentences.length <= 2) {
      const result = sentences.join('. ');
      return this.ensureKeyFacts(result, keyFacts);
    }

    // Keep a representative subset of sentences
    const kept: string[] = [];
    const step = Math.max(1, Math.floor(sentences.length / 3));
    for (let i = 0; i < sentences.length; i += step) {
      kept.push(sentences[i]);
    }
    // Always include the last sentence
    if (kept[kept.length - 1] !== sentences[sentences.length - 1]) {
      kept.push(sentences[sentences.length - 1]);
    }

    let result = kept.join('. ');
    result = this.ensureKeyFacts(result, keyFacts);

    return result;
  }

  /**
   * Ensure key facts appear in the summary.
   */
  private ensureKeyFacts(summary: string, keyFacts: string[]): string {
    let result = summary;
    const missingFacts: string[] = [];

    for (const fact of keyFacts) {
      if (!result.includes(fact)) {
        missingFacts.push(fact);
      }
    }

    if (missingFacts.length > 0) {
      result += ' [Key: ' + missingFacts.join(', ') + ']';
    }

    return result;
  }
}
