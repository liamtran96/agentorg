import type { Message } from './types.js';

/**
 * Prunes conversation context to fit within token limits,
 * preserving system prompts and the most recent messages.
 */
export class ContextPruner {
  /**
   * Prune messages to fit within a token limit.
   * Keeps system messages and the most recent non-system messages.
   * Uses a simple word-based token estimation (~1 token per word).
   */
  prune(messages: Message[], tokenLimit: number): Message[] {
    if (messages.length === 0) return [];

    const totalTokens = this.estimateTokens(messages);
    if (totalTokens <= tokenLimit) return [...messages];

    // Separate system messages from the rest
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const systemTokens = this.estimateTokens(systemMessages);
    const remainingBudget = tokenLimit - systemTokens;

    if (remainingBudget <= 0) {
      // Only return system messages if that's all that fits
      return systemMessages.length > 0 ? [systemMessages[0]] : [];
    }

    // Keep recent messages from the end, fitting within budget
    const kept: Message[] = [];
    let usedTokens = 0;

    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateMessageTokens(nonSystemMessages[i]);
      if (usedTokens + msgTokens > remainingBudget) break;
      usedTokens += msgTokens;
      kept.unshift(nonSystemMessages[i]);
    }

    return [...systemMessages, ...kept];
  }

  /**
   * Estimate total tokens for an array of messages.
   */
  private estimateTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + this.estimateMessageTokens(m), 0);
  }

  /**
   * Estimate tokens for a single message (~4 characters per token, plus overhead for role).
   */
  private estimateMessageTokens(message: Message): number {
    // ~4 chars per token is a common LLM heuristic, plus a small overhead per message
    return Math.ceil(message.content.length / 4) + 3;
  }
}
