/**
 * Source-of-truth file loader and query engine for fact-checking.
 * Loads text files, splits into sentences, and searches by keyword match.
 * In-memory implementation — will be backed by vector store later.
 */

import { readFileSync } from 'node:fs';

interface Passage {
  text: string;
  source: string;
  /** Pre-computed lowercase word set for efficient keyword matching. */
  wordSet: Set<string>;
}

export class SourceOfTruth {
  private passages: Passage[] = [];

  /**
   * Load source-of-truth files. Throws if any file does not exist.
   */
  async load(filePaths: string[]): Promise<void> {
    this.passages = [];

    for (const filePath of filePaths) {
      const content = readFileSync(filePath, 'utf-8');
      // Split into sentences on period followed by space or end of string
      const sentences = content
        .split(/(?<=\.)\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const sentence of sentences) {
        const wordSet = new Set(
          sentence
            .toLowerCase()
            .split(/\s+/)
            .map((w) => w.replace(/[?.,!;:'"]/g, '')),
        );
        this.passages.push({ text: sentence, source: filePath, wordSet });
      }
    }
  }

  /**
   * Query loaded passages by keyword match. Returns passages containing
   * any word from the query (minimum 3 characters).
   */
  async query(queryText: string): Promise<Pick<Passage, 'text' | 'source'>[]> {
    const queryWords = queryText
      .split(/\s+/)
      .map((w) => w.replace(/[?.,!]/g, ''))
      .filter((w) => w.length >= 3);

    if (queryWords.length === 0) return [];

    return this.passages.filter((passage) => {
      return queryWords.some((qWord) => {
        const qLower = qWord.toLowerCase();
        // Exact substring match
        if (passage.text.toLowerCase().includes(qLower)) return true;
        // Prefix/stem match: query word and passage word share a common root (min 4 chars)
        if (qLower.length >= 4) {
          const stem = qLower.slice(0, Math.max(4, qLower.length - 2));
          for (const pWord of passage.wordSet) {
            if (pWord.startsWith(stem) || stem.startsWith(pWord.slice(0, Math.max(4, pWord.length - 2)))) {
              return true;
            }
          }
        }
        return false;
      });
    });
  }
}
