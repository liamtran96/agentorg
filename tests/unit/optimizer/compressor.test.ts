import { describe, it, expect, beforeEach } from 'vitest';
import { Compressor } from '@agentorg/optimizer';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

describe('Compressor', () => {
  let compressor: Compressor;

  beforeEach(() => {
    compressor = new Compressor();
  });

  it('should compress a conversation into a summary', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'What is the capital of France?' },
      { role: 'assistant', content: 'The capital of France is Paris.' },
      { role: 'user', content: 'What about Germany?' },
      { role: 'assistant', content: 'The capital of Germany is Berlin.' },
      { role: 'user', content: 'And Italy?' },
      { role: 'assistant', content: 'The capital of Italy is Rome.' },
    ];

    const summary = await compressor.compress(messages);

    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThan(
      messages.map((m) => m.content).join(' ').length
    );
  });

  it('should preserve key facts in compression', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'Our budget for this quarter is $50,000.' },
      { role: 'assistant', content: 'Noted. Budget is $50,000 for Q1.' },
      { role: 'user', content: 'The deadline is March 15th.' },
      { role: 'assistant', content: 'Got it. Deadline is March 15th.' },
    ];

    const summary = await compressor.compress(messages);

    // Key facts should survive compression
    expect(summary).toContain('50,000');
    expect(summary).toContain('March 15');
  });

  it('should perform rolling compression keeping recent messages', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'First topic: weather is sunny today.' },
      { role: 'assistant', content: 'Yes, it is a beautiful day.' },
      { role: 'user', content: 'Second topic: let us plan the meeting.' },
      { role: 'assistant', content: 'Sure, how about 3pm?' },
      { role: 'user', content: 'Third topic: what about the budget review?' },
      { role: 'assistant', content: 'I will prepare the budget report.' },
    ];

    const result = await compressor.compressOldest(messages, 2);

    // Should keep the 2 most recent messages intact
    expect(result.recentMessages).toHaveLength(2);
    expect(result.recentMessages[0].content).toBe('Third topic: what about the budget review?');
    expect(result.recentMessages[1].content).toBe('I will prepare the budget report.');

    // Should have a summary of older messages
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should respect length limits on output', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'A '.repeat(500) },
      { role: 'assistant', content: 'B '.repeat(500) },
      { role: 'user', content: 'C '.repeat(500) },
      { role: 'assistant', content: 'D '.repeat(500) },
    ];

    const summary = await compressor.compress(messages, { maxLength: 200 });

    expect(summary.length).toBeLessThanOrEqual(200);
  });

  it('should handle single message conversation', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello, how are you?' },
    ];

    const summary = await compressor.compress(messages);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('should handle empty messages array', async () => {
    const summary = await compressor.compress([]);
    expect(summary).toBe('');
  });
});
