import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLog } from '@agentorg/core';
import type { AuditEntry, OrchestratorDecision } from '@agentorg/core';

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'audit_1',
    timestamp: new Date('2026-03-15T10:00:00Z'),
    agentId: 'writer',
    action: 'send_email',
    decision: 'ALLOWED',
    reason: 'Permission granted',
    ...overrides,
  };
}

describe('AuditLog', () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog();
  });

  it('should record an audit entry', () => {
    const entry = makeEntry();
    log.record(entry);

    const all = log.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(entry);
  });

  it('should retrieve entries by agent ID', () => {
    log.record(makeEntry({ id: 'audit_1', agentId: 'writer' }));
    log.record(makeEntry({ id: 'audit_2', agentId: 'editor' }));
    log.record(makeEntry({ id: 'audit_3', agentId: 'writer' }));

    const writerEntries = log.getByAgent('writer');
    expect(writerEntries).toHaveLength(2);
    expect(writerEntries.every((e) => e.agentId === 'writer')).toBe(true);
  });

  it('should retrieve all entries', () => {
    log.record(makeEntry({ id: 'audit_1' }));
    log.record(makeEntry({ id: 'audit_2' }));
    log.record(makeEntry({ id: 'audit_3' }));

    expect(log.getAll()).toHaveLength(3);
  });

  it('should filter entries by decision type', () => {
    log.record(makeEntry({ id: 'audit_1', decision: 'ALLOWED' }));
    log.record(makeEntry({ id: 'audit_2', decision: 'BLOCKED' }));
    log.record(makeEntry({ id: 'audit_3', decision: 'ALLOWED' }));
    log.record(makeEntry({ id: 'audit_4', decision: 'REWRITTEN' }));

    const blocked = log.getByDecision('BLOCKED');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].id).toBe('audit_2');

    const allowed = log.getByDecision('ALLOWED');
    expect(allowed).toHaveLength(2);
  });

  it('should filter entries by date range', () => {
    log.record(makeEntry({ id: 'audit_1', timestamp: new Date('2026-03-10T00:00:00Z') }));
    log.record(makeEntry({ id: 'audit_2', timestamp: new Date('2026-03-15T12:00:00Z') }));
    log.record(makeEntry({ id: 'audit_3', timestamp: new Date('2026-03-20T00:00:00Z') }));

    const rangeEntries = log.getByDateRange(
      new Date('2026-03-14T00:00:00Z'),
      new Date('2026-03-16T00:00:00Z'),
    );
    expect(rangeEntries).toHaveLength(1);
    expect(rangeEntries[0].id).toBe('audit_2');
  });

  it('should get entry count', () => {
    expect(log.count()).toBe(0);

    log.record(makeEntry({ id: 'audit_1' }));
    log.record(makeEntry({ id: 'audit_2' }));

    expect(log.count()).toBe(2);
  });

  it('should clear all entries', () => {
    log.record(makeEntry({ id: 'audit_1' }));
    log.record(makeEntry({ id: 'audit_2' }));
    expect(log.count()).toBe(2);

    log.clear();
    expect(log.count()).toBe(0);
    expect(log.getAll()).toHaveLength(0);
  });

  it('should store entries in insertion order', () => {
    log.record(makeEntry({ id: 'audit_first', action: 'first_action' }));
    log.record(makeEntry({ id: 'audit_second', action: 'second_action' }));
    log.record(makeEntry({ id: 'audit_third', action: 'third_action' }));

    const all = log.getAll();
    expect(all[0].id).toBe('audit_first');
    expect(all[1].id).toBe('audit_second');
    expect(all[2].id).toBe('audit_third');
  });
});
