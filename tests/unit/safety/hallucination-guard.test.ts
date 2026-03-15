import { describe, it, expect } from 'vitest';
import { HallucinationGuard } from '@agentorg/safety';
import type { HallucinationGuardConfig } from '@agentorg/core';

describe('HallucinationGuard', () => {
  const sources: Record<string, string[]> = {
    source_of_truth: [
      'Basic plan costs $29/month',
      'Pro plan costs $99/month',
      'We support email and chat channels',
      'Office hours are Monday-Friday 9am-5pm EST',
    ],
    crm_records: [
      'Customer Acme Corp has an Enterprise plan',
      'Customer Beta Inc has a Basic plan',
    ],
    recent_conversations: [
      'Customer asked about upgrading from Basic to Pro',
      'Discussed refund timeline with customer',
    ],
  };

  const blockConfig: HallucinationGuardConfig = {
    enabled: true,
    mode: 'block',
    sources: ['source_of_truth', 'crm_records'],
  };

  const warnConfig: HallucinationGuardConfig = {
    enabled: true,
    mode: 'warn',
    sources: ['source_of_truth', 'crm_records'],
  };

  it('should pass when all claims are supported by sources', () => {
    const guard = new HallucinationGuard(blockConfig, sources);
    const result = guard.check(
      'The Basic plan costs $29/month.',
      ['Basic plan costs $29/month'],
    );

    expect(result.passed).toBe(true);
    expect(result.unsupportedClaims).toHaveLength(0);
    expect(result.mode).toBe('block');
  });

  it('should flag unsupported claims and block in block mode', () => {
    const guard = new HallucinationGuard(blockConfig, sources);
    const result = guard.check(
      'We offer 24/7 phone support and a 90-day money-back guarantee.',
      ['24/7 phone support available', '90-day money-back guarantee'],
    );

    expect(result.passed).toBe(false);
    expect(result.unsupportedClaims.length).toBeGreaterThan(0);
    expect(result.mode).toBe('block');
  });

  it('should flag unsupported claims but allow in warn mode', () => {
    const guard = new HallucinationGuard(warnConfig, sources);
    const result = guard.check(
      'We offer 24/7 phone support.',
      ['24/7 phone support available'],
    );

    expect(result.passed).toBe(true);
    expect(result.unsupportedClaims.length).toBeGreaterThan(0);
    expect(result.mode).toBe('warn');
  });

  it('should return empty unsupportedClaims when all claims are verified', () => {
    const guard = new HallucinationGuard(blockConfig, sources);
    const result = guard.check(
      'Customer Acme Corp has an Enterprise plan.',
      ['Acme Corp has an Enterprise plan'],
    );

    expect(result.passed).toBe(true);
    expect(result.unsupportedClaims).toHaveLength(0);
  });

  it('should handle check with no explicit claims argument', () => {
    const guard = new HallucinationGuard(blockConfig, sources);
    // When no claims are passed, the guard should extract/analyze claims from content
    const result = guard.check('The Basic plan costs $29/month.');

    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
    expect(Array.isArray(result.unsupportedClaims)).toBe(true);
    expect(result.mode).toBe('block');
  });

  it('should pass everything when disabled', () => {
    const disabledConfig: HallucinationGuardConfig = {
      enabled: false,
      mode: 'block',
      sources: ['source_of_truth'],
    };
    const guard = new HallucinationGuard(disabledConfig, sources);
    const result = guard.check(
      'We offer teleportation services.',
      ['Teleportation services available'],
    );

    expect(result.passed).toBe(true);
    expect(result.unsupportedClaims).toHaveLength(0);
  });

  it('should only check against configured sources', () => {
    const limitedConfig: HallucinationGuardConfig = {
      enabled: true,
      mode: 'block',
      sources: ['crm_records'], // Only CRM, not source_of_truth
    };
    const guard = new HallucinationGuard(limitedConfig, sources);

    // This claim is in source_of_truth but NOT in crm_records
    const result = guard.check(
      'The Basic plan costs $29/month.',
      ['Basic plan costs $29/month'],
    );

    // Should fail because source_of_truth is not in the configured sources
    expect(result.passed).toBe(false);
    expect(result.unsupportedClaims.length).toBeGreaterThan(0);
  });
});
