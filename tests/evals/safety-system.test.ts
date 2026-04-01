/**
 * Safety System Eval
 *
 * Evaluates BrandChecker and FactChecker precision/recall across many content
 * samples. Tests three modes (block, rewrite, warn/passthrough) and measures
 * that the safety system correctly catches violations without false positives.
 */
import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@agentorg/core';
import type { CompanyConfig, ActionRecord } from '@agentorg/core';

// ─── Configs for different safety modes ────────────────────────────────────

const makeConfig = (overrides: Partial<CompanyConfig['safety']> = {}): CompanyConfig => ({
  company: { name: 'Safety Eval Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
  org: {
    agent: {
      id: 'agent', name: 'Agent', role: 'worker', runtime: 'claude-agent-sdk',
      personality: '', budget: 100, reportsTo: 'ceo',
      skills: ['email', 'browser', 'filesystem', 'messaging'],
    },
  },
  governance: { rules: [] },
  safety: {
    brandCheck: {
      enabled: true,
      blockedWords: [
        "I'm an AI",
        'as an AI language model',
        'I cannot',
        'competitor-corp',
        'free forever',
        'guaranteed results',
        'no risk',
      ],
      enforceTone: true,
      brandVoice: 'professional',
    },
    factCheck: { enabled: true, sourceOfTruth: [], strictMode: true },
    blockMode: 'block',
    ...overrides,
  },
});

const makeAction = (description: string, input?: Record<string, unknown>): ActionRecord => ({
  id: `eval_${Math.random().toString(36).slice(2, 8)}`,
  agentId: 'agent',
  type: 'email.send',
  description,
  timestamp: new Date(),
  input: input ?? {},
  orchestratorDecision: 'ALLOWED',
});

// ─── Brand Check: True Positives (should be caught) ───────────────────────

const truePositives = [
  { name: 'Direct AI disclosure', content: "I'm an AI assistant here to help you." },
  { name: 'AI model phrasing', content: 'As an AI language model, I can help analyze your data.' },
  { name: 'Refusal phrase', content: 'I cannot provide financial advice on this matter.' },
  { name: 'Competitor mention', content: 'Our product is better than competitor-corp in every way.' },
  { name: 'False promise — free forever', content: 'Sign up now, our service is free forever!' },
  { name: 'False promise — guaranteed', content: 'We offer guaranteed results on all campaigns.' },
  { name: 'False promise — no risk', content: 'This is a no risk investment opportunity.' },
  { name: 'Blocked word in longer sentence', content: 'Many people wonder if competitor-corp offers similar features to ours.' },
  { name: 'Case-insensitive match', content: "i'm an ai and I want to help." },
  { name: 'Blocked word in input.content field', content: 'Sending email', },
];

// For the last case, we use input.content instead of description
const truePositiveInputOverride: Record<number, Record<string, unknown>> = {
  9: { content: "I'm an AI writing this email for you." },
};

describe('Eval — Safety System', () => {
  describe('Brand Check — True Positives (must be caught)', () => {
    const orch = new Orchestrator(makeConfig());

    it.each(truePositives.map((tp, i) => [tp.name, tp, i] as const))(
      '%s',
      (_name, tp, index) => {
        const input = truePositiveInputOverride[index];
        const action = makeAction(tp.content, input);
        const result = orch.check('agent', action);

        expect(result.decision).toBe('BLOCKED');
        expect(result.checkResults.safety).toBe(false);
        expect(result.reason).toContain('SAFETY');
      },
    );
  });

  // ─── Brand Check: True Negatives (should NOT be caught) ───────────────

  const trueNegatives = [
    { name: 'Professional email', content: 'Thank you for your inquiry. We would be happy to schedule a meeting to discuss your needs.' },
    { name: 'Product description', content: 'Our platform offers real-time analytics, automated reporting, and team collaboration tools.' },
    { name: 'Follow-up message', content: 'Following up on our conversation from last week regarding the Q3 deliverables.' },
    { name: 'Technical content', content: 'The API supports REST and GraphQL endpoints with OAuth 2.0 authentication.' },
    { name: 'Casual-professional tone', content: 'Hey team, great work on the launch! Let\'s regroup Monday to plan next steps.' },
    { name: 'Contains "AI" as part of other word', content: 'Our AIM is to deliver the best results for the campaign.' },
    { name: 'Contains "cannot" as part of sentence (without "I cannot")', content: 'Users cannot access the admin panel without proper credentials.' },
    { name: 'Contains word "free" without "forever"', content: 'We offer a free trial for 14 days.' },
    { name: 'Contains word "guarantee" in different form', content: 'We stand behind the quality of our work.' },
    { name: 'Empty description', content: '' },
  ];

  describe('Brand Check — True Negatives (must NOT be caught)', () => {
    const orch = new Orchestrator(makeConfig());

    it.each(trueNegatives.map((tn) => [tn.name, tn] as const))(
      '%s',
      (_name, tn) => {
        const action = makeAction(tn.content);
        const result = orch.check('agent', action);

        expect(result.decision).toBe('ALLOWED');
        expect(result.checkResults.safety).toBe(true);
      },
    );
  });

  // ─── Fact Check Eval ──────────────────────────────────────────────────

  describe('Fact Check — Contradiction Detection', () => {
    const orch = new Orchestrator(makeConfig());

    const factCases = [
      {
        name: 'Contradicts founding year',
        description: 'Our company was founded in 1995 and has grown significantly.',
        sourceOfTruth: { founded: '2024' },
        shouldBlock: true,
      },
      {
        name: 'Contradicts employee count',
        description: 'We have over 10,000 employees worldwide.',
        sourceOfTruth: { employees: '12' },
        shouldBlock: true,
      },
      {
        name: 'Matches source of truth',
        description: 'Our company was founded in 2024 with a small team of 12.',
        sourceOfTruth: { founded: '2024', employees: '12' },
        shouldBlock: false,
      },
      {
        name: 'Topic not mentioned — no contradiction',
        description: 'We are excited to announce our new product line.',
        sourceOfTruth: { founded: '2024', employees: '12' },
        shouldBlock: false,
      },
      {
        name: 'No source of truth provided — passes',
        description: 'We were established decades ago.',
        sourceOfTruth: undefined,
        shouldBlock: false,
      },
      {
        name: 'Multiple facts — first contradiction blocks',
        description: 'Founded in 1999 with 5000 employees across 30 countries.',
        sourceOfTruth: { founded: '2024', employees: '12', countries: '2' },
        shouldBlock: true,
      },
    ];

    it.each(factCases.map((fc) => [fc.name, fc] as const))('%s', (_name, fc) => {
      const input = fc.sourceOfTruth ? { sourceOfTruth: fc.sourceOfTruth } : {};
      const action = makeAction(fc.description, input);
      const result = orch.check('agent', action);

      if (fc.shouldBlock) {
        expect(result.decision).toBe('BLOCKED');
        expect(result.checkResults.safety).toBe(false);
      } else {
        expect(result.decision).toBe('ALLOWED');
        expect(result.checkResults.safety).toBe(true);
      }
    });
  });

  // ─── Rewrite Mode Eval ────────────────────────────────────────────────

  describe('Rewrite Mode — Blocked Words Are Removed', () => {
    const rewriteOrch = new Orchestrator(makeConfig({ blockMode: 'rewrite' }));

    const rewriteCases = [
      {
        name: 'Removes AI disclosure from content',
        content: "I'm an AI but let me help you with your project.",
        blockedWord: "I'm an AI",
      },
      {
        name: 'Removes competitor name',
        content: 'Unlike competitor-corp, we provide better support.',
        blockedWord: 'competitor-corp',
      },
      {
        name: 'Removes false promise',
        content: 'Our service is free forever and easy to use.',
        blockedWord: 'free forever',
      },
    ];

    it.each(rewriteCases.map((rc) => [rc.name, rc] as const))('%s', (_name, rc) => {
      const action = makeAction(rc.content);
      const result = rewriteOrch.check('agent', action);

      expect(result.decision).toBe('REWRITTEN');
      expect(result.rewrittenAction).toBeDefined();
      expect(result.rewrittenAction!.description).not.toContain(rc.blockedWord);
      // Check results should show safety passed (rewrite counts as handled)
      expect(result.checkResults.safety).toBe(true);
    });
  });

  // ─── No Safety Config — Passthrough ───────────────────────────────────

  describe('No Safety Config — Everything Passes', () => {
    const noSafetyConfig: CompanyConfig = {
      company: { name: 'No Safety Co', description: '', timezone: 'UTC', businessHours: '09:00-18:00' },
      org: {
        agent: {
          id: 'agent', name: 'Agent', role: 'worker', runtime: 'claude-agent-sdk',
          personality: '', budget: 100, reportsTo: 'ceo',
          skills: ['email'],
        },
      },
      governance: { rules: [] },
    };
    const orch = new Orchestrator(noSafetyConfig);

    it('allows content with blocked words when safety is disabled', () => {
      const action = makeAction("I'm an AI and competitor-corp is free forever");
      const result = orch.check('agent', action);
      expect(result.decision).toBe('ALLOWED');
      expect(result.checkResults.safety).toBe(true);
    });
  });
});
