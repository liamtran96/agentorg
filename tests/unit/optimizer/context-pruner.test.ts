import { describe, it, expect, beforeEach } from 'vitest';
import { ContextPruner } from '@agentorg/optimizer';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

describe('ContextPruner', () => {
  let pruner: ContextPruner;

  beforeEach(() => {
    pruner = new ContextPruner();
  });

  it('should prune messages to fit within token limit', () => {
    const messages: Message[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'First message with some content.' },
      { role: 'assistant', content: 'First response with some content.' },
      { role: 'user', content: 'Second message with more content.' },
      { role: 'assistant', content: 'Second response with more content.' },
      { role: 'user', content: 'Third and most recent message.' },
    ];

    // Set a low token limit so pruning is needed
    const pruned = pruner.prune(messages, 50);

    expect(pruned.length).toBeLessThan(messages.length);
    expect(pruned.length).toBeGreaterThan(0);
  });

  it('should keep most recent messages when pruning', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Old message from long ago.' },
      { role: 'assistant', content: 'Old response from long ago.' },
      { role: 'user', content: 'Recent message.' },
      { role: 'assistant', content: 'Recent response.' },
    ];

    const pruned = pruner.prune(messages, 20);

    // The most recent messages should be preserved
    const lastPruned = pruned[pruned.length - 1];
    expect(lastPruned.content).toBe('Recent response.');
  });

  it('should preserve system prompt when pruning', () => {
    const messages: Message[] = [
      { role: 'system', content: 'You are a writing assistant.' },
      { role: 'user', content: 'Old question.' },
      { role: 'assistant', content: 'Old answer.' },
      { role: 'user', content: 'New question.' },
      { role: 'assistant', content: 'New answer.' },
    ];

    const pruned = pruner.prune(messages, 30);

    expect(pruned[0].role).toBe('system');
    expect(pruned[0].content).toBe('You are a writing assistant.');
  });

  it('should return all messages if they fit within token limit', () => {
    const messages: Message[] = [
      { role: 'system', content: 'System prompt.' },
      { role: 'user', content: 'Hello.' },
      { role: 'assistant', content: 'Hi!' },
    ];

    const pruned = pruner.prune(messages, 10000);

    expect(pruned).toHaveLength(messages.length);
    expect(pruned).toEqual(messages);
  });

  it('should return pruned messages as an array', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Test.' },
    ];

    const pruned = pruner.prune(messages, 100);

    expect(Array.isArray(pruned)).toBe(true);
    expect(pruned).toHaveLength(1);
  });

  it('should handle empty messages array', () => {
    const pruned = pruner.prune([], 100);
    expect(pruned).toHaveLength(0);
  });
});
