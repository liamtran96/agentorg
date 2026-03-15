import { describe, it, expect, beforeEach } from 'vitest';
import { IncidentLog } from '@agentorg/core';
import type { IncidentRecord } from '@agentorg/core';

function makeIncident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: 'inc_1',
    timestamp: new Date('2026-03-15T10:00:00Z'),
    agentId: 'writer',
    type: 'error',
    severity: 'medium',
    description: 'Task execution failed unexpectedly',
    resolved: false,
    ...overrides,
  };
}

describe('IncidentLog', () => {
  let log: IncidentLog;

  beforeEach(() => {
    log = new IncidentLog();
  });

  it('should report an incident', () => {
    const incident = makeIncident();
    log.report(incident);

    const all = log.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(incident);
  });

  it('should get incidents by agent', () => {
    log.report(makeIncident({ id: 'inc_1', agentId: 'writer' }));
    log.report(makeIncident({ id: 'inc_2', agentId: 'editor' }));
    log.report(makeIncident({ id: 'inc_3', agentId: 'writer' }));

    const writerIncidents = log.getByAgent('writer');
    expect(writerIncidents).toHaveLength(2);
    expect(writerIncidents.every((i) => i.agentId === 'writer')).toBe(true);
  });

  it('should get incidents by type', () => {
    log.report(makeIncident({ id: 'inc_1', type: 'error' }));
    log.report(makeIncident({ id: 'inc_2', type: 'safety_violation' }));
    log.report(makeIncident({ id: 'inc_3', type: 'error' }));
    log.report(makeIncident({ id: 'inc_4', type: 'budget_exceeded' }));

    const errors = log.getByType('error');
    expect(errors).toHaveLength(2);
    expect(errors.every((i) => i.type === 'error')).toBe(true);

    const safetyViolations = log.getByType('safety_violation');
    expect(safetyViolations).toHaveLength(1);
  });

  it('should get incidents by severity', () => {
    log.report(makeIncident({ id: 'inc_1', severity: 'low' }));
    log.report(makeIncident({ id: 'inc_2', severity: 'critical' }));
    log.report(makeIncident({ id: 'inc_3', severity: 'low' }));
    log.report(makeIncident({ id: 'inc_4', severity: 'high' }));

    const critical = log.getBySeverity('critical');
    expect(critical).toHaveLength(1);
    expect(critical[0].id).toBe('inc_2');

    const low = log.getBySeverity('low');
    expect(low).toHaveLength(2);
  });

  it('should resolve an incident', () => {
    log.report(makeIncident({ id: 'inc_1' }));

    log.resolve('inc_1');

    const all = log.getAll();
    expect(all[0].resolved).toBe(true);
    expect(all[0].resolvedAt).toBeInstanceOf(Date);
  });

  it('should get unresolved incidents', () => {
    log.report(makeIncident({ id: 'inc_1' }));
    log.report(makeIncident({ id: 'inc_2' }));
    log.report(makeIncident({ id: 'inc_3' }));

    log.resolve('inc_2');

    const unresolved = log.getUnresolved();
    expect(unresolved).toHaveLength(2);
    expect(unresolved.every((i) => i.resolved === false)).toBe(true);
  });

  it('should get all incidents', () => {
    log.report(makeIncident({ id: 'inc_1' }));
    log.report(makeIncident({ id: 'inc_2' }));

    expect(log.getAll()).toHaveLength(2);
  });

  it('should count by severity', () => {
    log.report(makeIncident({ id: 'inc_1', severity: 'low' }));
    log.report(makeIncident({ id: 'inc_2', severity: 'critical' }));
    log.report(makeIncident({ id: 'inc_3', severity: 'low' }));
    log.report(makeIncident({ id: 'inc_4', severity: 'high' }));
    log.report(makeIncident({ id: 'inc_5', severity: 'medium' }));

    const counts = log.countBySeverity();
    expect(counts.low).toBe(2);
    expect(counts.medium).toBe(1);
    expect(counts.high).toBe(1);
    expect(counts.critical).toBe(1);
  });
});
