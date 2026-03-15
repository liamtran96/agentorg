import { describe, it, expect } from 'vitest';
import { parseCommand } from '@agentorg/chat-manager';

describe('Chat Manager — Command Parser', () => {
  it('should parse "/status" command', () => {
    const result = parseCommand('/status');
    expect(result).toEqual({ command: 'status', args: {} });
  });

  it('should parse "/budget maya 40" command', () => {
    const result = parseCommand('/budget maya 40');
    expect(result).toEqual({
      command: 'budget',
      args: { agent: 'maya', amount: 40 },
    });
  });

  it('should parse "/hire designer" command', () => {
    const result = parseCommand('/hire designer');
    expect(result).toEqual({
      command: 'hire',
      args: { role: 'designer' },
    });
  });

  it('should parse "/fire social" command', () => {
    const result = parseCommand('/fire social');
    expect(result).toEqual({
      command: 'fire',
      args: { agent: 'social' },
    });
  });

  it('should parse "/approve" command', () => {
    const result = parseCommand('/approve');
    expect(result).toEqual({ command: 'approve', args: {} });
  });

  it('should parse "/reject" command', () => {
    const result = parseCommand('/reject');
    expect(result).toEqual({ command: 'reject', args: {} });
  });

  it('should parse "/digest" command', () => {
    const result = parseCommand('/digest');
    expect(result).toEqual({ command: 'digest', args: {} });
  });

  it('should parse "/cost" command', () => {
    const result = parseCommand('/cost');
    expect(result).toEqual({ command: 'cost', args: {} });
  });

  it('should return null for non-command messages', () => {
    expect(parseCommand('hello world')).toBeNull();
    expect(parseCommand('just a regular message')).toBeNull();
    expect(parseCommand('')).toBeNull();
  });

  it('should return null for messages without slash prefix', () => {
    expect(parseCommand('status')).toBeNull();
    expect(parseCommand('budget maya 40')).toBeNull();
  });
});
