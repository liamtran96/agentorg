import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

const testConfig: CompanyConfig = {
  company: { name: 'Test Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    writer: {
      id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk',
      personality: '', budget: 30, reportsTo: 'ceo',
      skills: ['browser', 'filesystem', 'email'],
      heartbeat: { schedule: '0 */2 * * *', tasks: [] },
    },
  },
  governance: { rules: [] },
  safety: {
    brandCheck: {
      enabled: true,
      blockedWords: ["I'm an AI", 'as an AI language model', 'I cannot'],
      enforceTone: true,
      brandVoice: 'professional',
    },
    factCheck: {
      enabled: true,
      sourceOfTruth: ['docs/facts.md'],
      strictMode: true,
    },
    blockMode: 'block',
  },
};

const makeAction = (type: string, extra?: Partial<ActionRecord>): ActionRecord => ({
  id: 'act_1', agentId: 'writer', type, description: 'test',
  timestamp: new Date(), input: {}, orchestratorDecision: 'ALLOWED', ...extra,
});

describe('Orchestrator — Safety Check', () => {
  it('should ALLOW safe content (no brand check issues)', () => {
    const orch = new Orchestrator(testConfig);
    const action = makeAction('email.send', {
      description: 'Sending a professional follow-up email to the client about their project.',
    });

    const result = orch.check('writer', action);

    expect(result.checkResults.safety).toBe(true);
    expect(result.decision).toBe('ALLOWED');
  });

  it('should BLOCK content with blocked words from brandCheck.blockedWords', () => {
    const orch = new Orchestrator(testConfig);
    const action = makeAction('email.send', {
      description: "I'm an AI assistant and I'd like to help you with your project.",
    });

    const result = orch.check('writer', action);

    expect(result.checkResults.safety).toBe(false);
    expect(result.decision).toBe('BLOCKED');
    expect(result.reason).toContain('SAFETY');
  });

  it('should BLOCK content failing fact-check', () => {
    const orch = new Orchestrator(testConfig);
    const action = makeAction('email.send', {
      description: 'Our company was founded in 1842 and has over 10,000 employees.',
      input: {
        // Providing contradicting source-of-truth context for the orchestrator to check against
        sourceOfTruth: { founded: '2024', employees: 6 },
      },
    });

    const result = orch.check('writer', action);

    expect(result.checkResults.safety).toBe(false);
    expect(result.decision).toBe('BLOCKED');
  });

  it('should REWRITE content with wrong tone when blockMode is rewrite', () => {
    const rewriteConfig: CompanyConfig = {
      ...testConfig,
      safety: {
        ...testConfig.safety,
        blockMode: 'rewrite',
        brandCheck: {
          enabled: true,
          blockedWords: ["I'm an AI"],
          enforceTone: true,
          brandVoice: 'professional',
        },
      },
    };

    const orch = new Orchestrator(rewriteConfig);
    const action = makeAction('email.send', {
      description: "Hey dude!! I'm an AI but let me help u out lol",
    });

    const result = orch.check('writer', action);

    expect(result.decision).toBe('REWRITTEN');
    expect(result.rewrittenAction).toBeDefined();
    expect(result.rewrittenAction!.description).not.toContain("I'm an AI");
  });

  it('should pass through when safety config is not defined', () => {
    const configNoSafety: CompanyConfig = {
      company: { name: 'Test Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
      org: {
        writer: {
          id: 'writer', name: 'Maya', role: 'writer', runtime: 'claude-agent-sdk',
          personality: '', budget: 30, reportsTo: 'ceo',
          skills: ['browser', 'filesystem', 'email'],
          heartbeat: { schedule: '0 */2 * * *', tasks: [] },
        },
      },
      governance: { rules: [] },
    };

    const orch = new Orchestrator(configNoSafety);
    const action = makeAction('email.send', {
      description: "I'm an AI and I want to help you.",
    });

    const result = orch.check('writer', action);

    // Without safety config, the safety check should pass through
    expect(result.checkResults.safety).toBe(true);
    expect(result.decision).toBe('ALLOWED');
  });
});
