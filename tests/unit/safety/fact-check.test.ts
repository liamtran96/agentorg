import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FactChecker } from '@agentorg/safety';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('FactChecker', () => {
  let tmpDir: string;
  let pricingPath: string;
  let policiesPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-fact-check-'));

    pricingPath = path.join(tmpDir, 'pricing.md');
    fs.writeFileSync(
      pricingPath,
      [
        '# Pricing',
        '',
        '- Basic plan: $29/month',
        '- Pro plan: $99/month',
        '- Enterprise plan: $499/month',
        '',
        'All plans include 14-day free trial.',
      ].join('\n'),
    );

    policiesPath = path.join(tmpDir, 'policies.md');
    fs.writeFileSync(
      policiesPath,
      [
        '# Policies',
        '',
        '- 30-day refund policy',
        '- Support available Monday-Friday 9am-5pm EST',
        '- Data stored in US-East region only',
      ].join('\n'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should pass when content matches source-of-truth', async () => {
    const checker = new FactChecker([pricingPath, policiesPath]);
    const result = await checker.check('Our basic plan is $29/month.');

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail when content contradicts source-of-truth pricing', async () => {
    const checker = new FactChecker([pricingPath]);
    const result = await checker.check('Our basic plan is $49/month.');

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.toLowerCase().includes('price') || v.toLowerCase().includes('$49') || v.toLowerCase().includes('basic'))).toBe(true);
  });

  it('should return a fallback message on failure', async () => {
    const checker = new FactChecker([pricingPath]);
    const result = await checker.check('Our basic plan is $49/month.');

    expect(result.passed).toBe(false);
    expect(result.fallbackMessage).toBeDefined();
    expect(typeof result.fallbackMessage).toBe('string');
    expect(result.fallbackMessage!.length).toBeGreaterThan(0);
  });

  it('should handle missing source-of-truth files gracefully', async () => {
    const checker = new FactChecker(['/nonexistent/path/to/file.md']);
    const result = await checker.check('Our basic plan is $29/month.');

    // Should not throw — should handle gracefully
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('should check against multiple source files', async () => {
    const checker = new FactChecker([pricingPath, policiesPath]);

    // Contradicts policies.md (30-day, not 60-day)
    const result = await checker.check('We offer a 60-day refund policy.');

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should pass when content aligns with policy source', async () => {
    const checker = new FactChecker([policiesPath]);
    const result = await checker.check('We have a 30-day refund policy and support is available Monday-Friday.');

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail when content contradicts multiple sources', async () => {
    const checker = new FactChecker([pricingPath, policiesPath]);
    const result = await checker.check(
      'Our basic plan is $49/month and we offer a 60-day refund policy.',
    );

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
  });
});
