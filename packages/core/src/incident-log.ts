import type { IncidentRecord } from './types.js';

type IncidentSeverity = IncidentRecord['severity'];
type IncidentType = IncidentRecord['type'];

/**
 * IncidentLog — Tracks safety violations, budget breaches, SLA misses, errors, and escalations.
 * Incidents can be reported, queried, and resolved.
 */
export class IncidentLog {
  private incidents: IncidentRecord[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  /** Report a new incident */
  report(incident: IncidentRecord): void {
    if (this.incidents.length >= this.maxEntries) {
      this.incidents.splice(0, this.incidents.length - this.maxEntries + 1);
    }
    this.incidents.push({ ...incident });
  }

  /** Get all incidents */
  getAll(): IncidentRecord[] {
    return [...this.incidents];
  }

  /** Get incidents for a specific agent */
  getByAgent(agentId: string): IncidentRecord[] {
    return this.incidents.filter((i) => i.agentId === agentId);
  }

  /** Get incidents by type */
  getByType(type: IncidentType): IncidentRecord[] {
    return this.incidents.filter((i) => i.type === type);
  }

  /** Get incidents by severity */
  getBySeverity(severity: IncidentSeverity): IncidentRecord[] {
    return this.incidents.filter((i) => i.severity === severity);
  }

  /** Resolve an incident by ID */
  resolve(incidentId: string): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.resolved = true;
      incident.resolvedAt = new Date();
    }
  }

  /** Get all unresolved incidents */
  getUnresolved(): IncidentRecord[] {
    return this.incidents.filter((i) => i.resolved === false);
  }

  /** Count incidents grouped by severity */
  countBySeverity(): Record<IncidentSeverity, number> {
    const counts: Record<IncidentSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const incident of this.incidents) {
      counts[incident.severity]++;
    }
    return counts;
  }
}
