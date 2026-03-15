import { describe, it, expect, beforeEach } from 'vitest';
import { InboxRouter } from '@agentorg/core';
import type { InboxConfig, RoutingRule } from '@agentorg/core';

const defaultConfig: InboxConfig = {
  routing: [
    { match: 'billing', assignTo: 'account-mgr', priority: 'high' },
    { match: 'blog|content', assignTo: 'writer', priority: 'normal' },
    { match: 'urgent', assignTo: 'ceo', priority: 'urgent' },
  ],
  defaultAgent: 'support',
};

describe('InboxRouter', () => {
  let router: InboxRouter;

  beforeEach(() => {
    router = new InboxRouter(defaultConfig);
  });

  it('should route message matching a keyword rule to assigned agent', () => {
    const result = router.route('I have a billing question');

    expect(result).toBeDefined();
    expect(result!.agentId).toBe('account-mgr');
    expect(result!.priority).toBe('high');
  });

  it('should route message matching regex rule', () => {
    const result = router.route('Please write a blog post about AI');

    expect(result).toBeDefined();
    expect(result!.agentId).toBe('writer');
    expect(result!.priority).toBe('normal');
  });

  it('should route to default agent when no rule matches', () => {
    const result = router.route('Hello, how are you?');

    expect(result).toBeDefined();
    expect(result!.agentId).toBe('support');
  });

  it('should handle multiple rules with first match wins', () => {
    // "urgent billing" matches both 'billing' and 'urgent', first rule wins
    const result = router.route('urgent billing issue');

    expect(result).toBeDefined();
    expect(result!.agentId).toBe('account-mgr');
  });

  it('should return routing result with agentId and priority', () => {
    const result = router.route('This is urgent');

    expect(result).toBeDefined();
    expect(result).toHaveProperty('agentId');
    expect(result).toHaveProperty('priority');
    expect(result!.agentId).toBe('ceo');
    expect(result!.priority).toBe('urgent');
  });

  it('should handle empty rules array with default agent', () => {
    const emptyRouter = new InboxRouter({
      routing: [],
      defaultAgent: 'fallback',
    });

    const result = emptyRouter.route('Any message');

    expect(result).toBeDefined();
    expect(result!.agentId).toBe('fallback');
  });

  it('should return null when no default agent and no match', () => {
    const noDefaultRouter = new InboxRouter({
      routing: [{ match: 'billing', assignTo: 'account-mgr', priority: 'high' }],
    });

    const result = noDefaultRouter.route('Hello, random question');

    expect(result).toBeNull();
  });
});
