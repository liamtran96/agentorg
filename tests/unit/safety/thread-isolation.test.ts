import { describe, it, expect, beforeEach } from 'vitest';
import { ThreadIsolator } from '@agentorg/safety';
import type { ThreadIsolationConfig } from '@agentorg/core';

describe('ThreadIsolator', () => {
  const config: ThreadIsolationConfig = {
    enabled: true,
    maxConcurrentPerAgent: 3,
  };

  let isolator: ThreadIsolator;

  beforeEach(() => {
    isolator = new ThreadIsolator(config);
  });

  it('should create an isolated context for a thread', () => {
    const ctx = isolator.createContext('agent-writer', 'thread-001');

    expect(ctx).toBeDefined();
    expect(ctx.agentId).toBe('agent-writer');
    expect(ctx.threadId).toBe('thread-001');
  });

  it('should retrieve context by thread ID', () => {
    isolator.createContext('agent-writer', 'thread-001');
    const ctx = isolator.getContext('thread-001');

    expect(ctx).toBeDefined();
    expect(ctx!.threadId).toBe('thread-001');
    expect(ctx!.agentId).toBe('agent-writer');
  });

  it('should return undefined for unknown thread ID', () => {
    const ctx = isolator.getContext('nonexistent-thread');
    expect(ctx).toBeUndefined();
  });

  it('should prevent cross-thread context leakage', () => {
    isolator.createContext('agent-writer', 'thread-001');
    isolator.createContext('agent-editor', 'thread-002');

    const ctx1 = isolator.getContext('thread-001');
    const ctx2 = isolator.getContext('thread-002');

    expect(ctx1).toBeDefined();
    expect(ctx2).toBeDefined();
    expect(ctx1!.agentId).toBe('agent-writer');
    expect(ctx2!.agentId).toBe('agent-editor');

    // Contexts should be independent objects
    expect(ctx1).not.toBe(ctx2);
    expect(ctx1!.threadId).not.toBe(ctx2!.threadId);
  });

  it('should enforce max concurrent threads per agent', () => {
    const strictConfig: ThreadIsolationConfig = {
      enabled: true,
      maxConcurrentPerAgent: 2,
    };
    const strictIsolator = new ThreadIsolator(strictConfig);

    strictIsolator.createContext('agent-writer', 'thread-001');
    strictIsolator.createContext('agent-writer', 'thread-002');

    // Third thread for the same agent should throw or return null
    expect(() => {
      strictIsolator.createContext('agent-writer', 'thread-003');
    }).toThrow();
  });

  it('should allow different agents to have separate concurrent limits', () => {
    const strictConfig: ThreadIsolationConfig = {
      enabled: true,
      maxConcurrentPerAgent: 2,
    };
    const strictIsolator = new ThreadIsolator(strictConfig);

    strictIsolator.createContext('agent-writer', 'thread-001');
    strictIsolator.createContext('agent-writer', 'thread-002');
    // Writer is at limit, but editor should still be fine
    const editorCtx = strictIsolator.createContext('agent-editor', 'thread-003');

    expect(editorCtx).toBeDefined();
    expect(editorCtx.agentId).toBe('agent-editor');
  });

  it('should clean up thread context on release', () => {
    isolator.createContext('agent-writer', 'thread-001');
    expect(isolator.getContext('thread-001')).toBeDefined();

    isolator.releaseContext('thread-001');
    expect(isolator.getContext('thread-001')).toBeUndefined();
  });

  it('should allow new threads after releasing old ones', () => {
    const strictConfig: ThreadIsolationConfig = {
      enabled: true,
      maxConcurrentPerAgent: 1,
    };
    const strictIsolator = new ThreadIsolator(strictConfig);

    strictIsolator.createContext('agent-writer', 'thread-001');

    // At limit — should throw
    expect(() => {
      strictIsolator.createContext('agent-writer', 'thread-002');
    }).toThrow();

    // Release the first one
    strictIsolator.releaseContext('thread-001');

    // Now should succeed
    const ctx = strictIsolator.createContext('agent-writer', 'thread-002');
    expect(ctx).toBeDefined();
    expect(ctx.threadId).toBe('thread-002');
  });

  it('should return correct active thread count per agent', () => {
    expect(isolator.getActiveThreadCount('agent-writer')).toBe(0);

    isolator.createContext('agent-writer', 'thread-001');
    expect(isolator.getActiveThreadCount('agent-writer')).toBe(1);

    isolator.createContext('agent-writer', 'thread-002');
    expect(isolator.getActiveThreadCount('agent-writer')).toBe(2);

    isolator.createContext('agent-editor', 'thread-003');
    expect(isolator.getActiveThreadCount('agent-writer')).toBe(2);
    expect(isolator.getActiveThreadCount('agent-editor')).toBe(1);

    isolator.releaseContext('thread-001');
    expect(isolator.getActiveThreadCount('agent-writer')).toBe(1);
  });

  it('should handle releasing a nonexistent thread gracefully', () => {
    // Should not throw
    expect(() => {
      isolator.releaseContext('nonexistent-thread');
    }).not.toThrow();
  });
});
