import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import type { CompanyConfig, Task, TaskStatus, AuditEntry } from '@agentorg/core';
import { TaskQueue } from '@agentorg/core';

/**
 * Options for creating the app with injected services.
 */
interface AppOptions {
  configManager?: { getCurrent(): CompanyConfig; load(): CompanyConfig; update(key: string, value: unknown): void };
  orgChart?: { getAgent(id: string): unknown; getAllAgents(): unknown[] };
  taskQueue?: {
    create(params: { title: string; description: string; assignedTo: string; createdBy: string; priority?: string; dueAt?: Date }): Task;
    getAll(): Task[];
    get(id: string): Task | undefined;
    updateStatus(id: string, status: string, result?: string): void;
  };
  orchestrator?: { check(agentId: string, action: unknown): unknown; getSpend(agentId: string): number };
}

/**
 * Creates and configures an Express application with all AgentOrg REST API routes.
 *
 * @param configOrOptions - Either a CompanyConfig or an options object with injected services
 * @returns A configured Express application (not yet listening)
 */
export function createApp(configOrOptions: CompanyConfig | AppOptions): Express {
  const app = express();

  app.use(express.json());
  app.use(cors());

  // Determine if we got services or a plain config
  const hasServices = configOrOptions && 'configManager' in configOrOptions;

  let currentConfig: CompanyConfig;
  let configManager: AppOptions['configManager'] | undefined;
  let orchestrator: AppOptions['orchestrator'] | undefined;

  // Always use a TaskQueue — create a default one when none is injected
  let taskQueue: AppOptions['taskQueue'];

  if (hasServices) {
    const opts = configOrOptions as AppOptions;
    configManager = opts.configManager;
    taskQueue = opts.taskQueue ?? new TaskQueue();
    orchestrator = opts.orchestrator;
    currentConfig = configManager ? configManager.getCurrent() : ({} as CompanyConfig);
  } else {
    currentConfig = structuredClone(configOrOptions as CompanyConfig);
    taskQueue = new TaskQueue();
  }

  /** Returns the current company config, preferring the configManager when available. */
  const getConfig = (): CompanyConfig =>
    configManager ? configManager.getCurrent() : currentConfig;

  // In-memory audit log
  const auditLog: AuditEntry[] = [];

  // ─── Health ─────────────────────────────────────────────────────────────

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // ─── Agents ─────────────────────────────────────────────────────────────

  app.get('/api/agents', (_req: Request, res: Response) => {
    try {
      const cfg = getConfig();
      const agents = Object.values(cfg.org);
      res.json(agents);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/agents/:id', (req: Request, res: Response) => {
    const cfg = getConfig();
    const agent = cfg.org[req.params.id];
    if (!agent) {
      res.status(404).json({ error: `Agent '${req.params.id}' not found` });
      return;
    }
    res.json(agent);
  });

  // ─── Heartbeat ──────────────────────────────────────────────────────────

  app.post('/api/agents/:id/heartbeat', (req: Request, res: Response) => {
    try {
      const agentId = req.params.id;
      const cfg = getConfig();
      const agent = cfg.org[agentId];
      if (!agent) {
        res.status(404).json({ error: `Agent '${agentId}' not found` });
        return;
      }
      res.json({
        agentId,
        triggered: true,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ─── Tasks ──────────────────────────────────────────────────────────────

  app.get('/api/tasks', (_req: Request, res: Response) => {
    res.json(taskQueue.getAll());
  });

  app.post('/api/tasks', (req: Request, res: Response) => {
    const { title, description, assignedTo, createdBy, priority } = req.body;

    if (!title || !description || !assignedTo || !createdBy || !priority) {
      res.status(400).json({
        error: 'Missing required fields: title, description, assignedTo, createdBy, priority',
      });
      return;
    }

    const task = taskQueue.create({ title, description, assignedTo, createdBy, priority });
    res.status(201).json(task);
  });

  app.put('/api/tasks/:id/status', (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { status, result } = req.body;

    const task = taskQueue.get(taskId);
    if (!task) {
      res.status(404).json({ error: `Task '${taskId}' not found` });
      return;
    }
    taskQueue.updateStatus(taskId, status as TaskStatus, result);
    const updated = taskQueue.get(taskId);
    res.json(updated);
  });

  // ─── Budget ─────────────────────────────────────────────────────────────

  app.get('/api/budget', (_req: Request, res: Response) => {
    try {
      const cfg = getConfig();
      const budgets: Record<string, { spent: number; limit: number; remaining: number }> = {};
      for (const [id, agent] of Object.entries(cfg.org)) {
        const spent = orchestrator ? orchestrator.getSpend(id) : 0;
        budgets[id] = {
          spent,
          limit: agent.budget,
          remaining: agent.budget - spent,
        };
      }
      res.json(budgets);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ─── Audit ──────────────────────────────────────────────────────────────

  app.get('/api/audit', (_req: Request, res: Response) => {
    res.json(auditLog);
  });

  // ─── Config ─────────────────────────────────────────────────────────────

  app.get('/api/config', (_req: Request, res: Response) => {
    const cfg = getConfig();
    const { providers: _providers, ...safeConfig } = cfg;
    res.json(safeConfig);
  });

  app.put('/api/config/:section', (req: Request, res: Response) => {
    const section = req.params.section;

    const ALLOWED_SECTIONS = [
      'company', 'org', 'governance', 'safety', 'heartbeats',
      'inbox', 'crm', 'deadlines', 'performance', 'conflicts', 'workflows',
    ];

    // Block prototype pollution and restrict to allowed config sections
    const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    const keys = section.split('.');
    if (keys.some(k => FORBIDDEN_KEYS.has(k))) {
      res.status(400).json({ error: 'Invalid config path' });
      return;
    }

    // Validate the top-level section is allowed (blocks providers, etc.)
    if (!ALLOWED_SECTIONS.includes(keys[0])) {
      res.status(400).json({ error: `Invalid config section: '${keys[0]}'` });
      return;
    }

    // Dot-notation paths like "company.name"
    if (keys.length > 1) {
      if (configManager) {
        try {
          configManager.update(section, req.body.value);
          const cfg = configManager.getCurrent();
          const { providers: _p, ...safeConfig } = cfg;
          res.json({ success: true, ...safeConfig });
        } catch (err) {
          res.status(500).json({ error: String(err) });
        }
      } else {
        let target: Record<string, unknown> = currentConfig as unknown as Record<string, unknown>;
        for (let i = 0; i < keys.length - 1; i++) {
          target = target[keys[i]] as Record<string, unknown>;
          if (!target) {
            res.status(400).json({ error: `Invalid config path: '${section}'` });
            return;
          }
        }
        target[keys[keys.length - 1]] = req.body.value;
        const { providers: _p, ...safeConfig } = currentConfig;
        res.json({ success: true, ...safeConfig });
      }
      return;
    }

    // Top-level section update
    if (configManager) {
      try {
        configManager.update(section, req.body);
        const cfg = configManager.getCurrent();
        const { providers: _p, ...safeConfig } = cfg;
        res.json(safeConfig);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    } else {
      (currentConfig as Record<string, unknown>)[section] = req.body;
      const { providers: _providers, ...safeConfig } = currentConfig;
      res.json(safeConfig);
    }
  });

  return app;
}
