import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from '@agentorg/chat-manager';

describe('Chat Manager — Natural Language Parser', () => {
  it('should parse "set Maya\'s budget to forty dollars"', () => {
    const result = parseNaturalLanguage("set Maya's budget to forty dollars");
    expect(result).not.toBeNull();
    expect(result!.command).toBe('budget');
    expect(result!.args.agent).toBe('maya');
    expect(result!.args.amount).toBe(40);
  });

  it('should parse "hire a designer named Kim"', () => {
    const result = parseNaturalLanguage('hire a designer named Kim');
    expect(result).not.toBeNull();
    expect(result!.command).toBe('hire');
    expect(result!.args.role).toBe('designer');
    expect(result!.args.name).toBe('Kim');
  });

  it('should parse "how much have we spent"', () => {
    const result = parseNaturalLanguage('how much have we spent');
    expect(result).not.toBeNull();
    expect(result!.command).toBe('cost');
    expect(result!.args).toEqual({});
  });

  it('should parse "pause social until Monday"', () => {
    const result = parseNaturalLanguage('pause social until Monday');
    expect(result).not.toBeNull();
    expect(result!.command).toBe('pause');
    expect(result!.args.agent).toBe('social');
  });

  it('should return null for unrecognized input', () => {
    expect(parseNaturalLanguage('the weather is nice today')).toBeNull();
    expect(parseNaturalLanguage('random gibberish abc123')).toBeNull();
    expect(parseNaturalLanguage('')).toBeNull();
  });
});
