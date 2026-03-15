import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { CompanyConfig, AgentConfig } from './types.js';

/**
 * ConfigManager — loads, validates, and hot-reloads the YAML config.
 * Source of truth for all three paths (YAML, Dashboard, Telegram).
 */
export class ConfigManager {
  private config: CompanyConfig | null = null;
  private filePath: string;
  private watchers: Array<(config: CompanyConfig) => void> = [];

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  /** Load config from YAML file */
  load(): CompanyConfig {
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    const parsed = YAML.parse(raw);
    this.config = this.normalize(parsed);
    return this.config;
  }

  /** Get current config (throws if load() has not been called) */
  getCurrent(): CompanyConfig {
    if (!this.config) {
      throw new Error('Config not loaded. Call load() first.');
    }
    return this.config;
  }

  /** Update a config value and write back to YAML */
  update(keyPath: string, value: unknown): void {
    // Block prototype pollution via key path
    const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    const keys = keyPath.split('.');
    if (keys.some(k => FORBIDDEN_KEYS.has(k))) {
      throw new Error(`Invalid config key path: "${keyPath}"`);
    }

    if (!this.config) this.load();
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    const doc = YAML.parseDocument(raw);

    // Navigate YAML AST and set value
    let node: any = doc;
    for (let i = 0; i < keys.length - 1; i++) {
      node = node.get(keys[i], true);
    }
    node.set(keys[keys.length - 1], value);

    fs.writeFileSync(this.filePath, doc.toString(), 'utf-8');
    this.config = this.normalize(doc.toJSON());
    this.notifyWatchers();
  }

  /** Watch for config changes */
  onChange(callback: (config: CompanyConfig) => void): void {
    this.watchers.push(callback);
  }

  private watcher: { close: () => Promise<void> } | null = null;

  /** Start watching the file for external changes */
  async startWatching(): Promise<void> {
    const { watch } = await import('chokidar');
    const watcher = watch(this.filePath, { ignoreInitial: true });
    watcher.on('change', () => {
      try {
        this.load();
        this.notifyWatchers();
      } catch (err) {
        console.error('[config] Failed to reload:', err);
      }
    });
    this.watcher = watcher;
  }

  /** Stop watching the file for changes */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private notifyWatchers(): void {
    if (!this.config) return;
    for (const cb of this.watchers) {
      cb(this.config);
    }
  }

  /** Normalize raw YAML into typed CompanyConfig */
  private normalize(raw: Record<string, any>): CompanyConfig {
    const org: Record<string, AgentConfig> = {};

    if (raw.org) {
      for (const [id, agentRaw] of Object.entries(raw.org) as [string, any][]) {
        org[id] = {
          id,
          name: agentRaw.name || id,
          role: id,
          runtime: agentRaw.runtime || 'claude-agent-sdk',
          model: agentRaw.model,
          personality: agentRaw.personality || '',
          budget: agentRaw.budget || 50,
          reportsTo: agentRaw.reports_to || 'board',
          skills: agentRaw.skills || [],
          heartbeat: agentRaw.heartbeat
            ? {
                schedule: agentRaw.heartbeat.schedule || agentRaw.heartbeat,
                tasks: agentRaw.heartbeat.tasks || [],
                reactive: agentRaw.heartbeat.reactive,
              }
            : undefined,
          endpoint: agentRaw.endpoint,
          allowedTools: agentRaw.allowed_tools,
          cwd: agentRaw.cwd,
        };
      }
    }

    return {
      company: {
        name: raw.company?.name || 'My Company',
        description: raw.company?.description || '',
        timezone: raw.company?.timezone || 'UTC',
        businessHours: raw.company?.businessHours || raw.company?.business_hours || '09:00-18:00',
        outOfHoursReply: raw.company?.out_of_hours_reply || 'We will reply during business hours.',
      },
      org,
      governance: raw.governance,
      safety: raw.safety,
      heartbeats: raw.heartbeats,
      providers: raw.providers,
    };
  }
}
