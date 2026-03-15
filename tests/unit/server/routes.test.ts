import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '@agentorg/server';
import request from 'supertest';
import type { CompanyConfig } from '@agentorg/core';

const testConfig: CompanyConfig = {
  company: {
    name: 'Test Co',
    description: 'A test company',
    timezone: 'UTC',
    businessHours: '09:00-18:00',
  },
  org: {
    ceo: {
      id: 'ceo',
      name: 'Alex',
      role: 'ceo',
      runtime: 'anthropic-api',
      personality: 'Strategic leader',
      budget: 50,
      reportsTo: 'board',
      skills: ['email'],
      heartbeat: { schedule: '0 */4 * * *', tasks: ['review_agents'] },
    },
    writer: {
      id: 'writer',
      name: 'Maya',
      role: 'writer',
      runtime: 'claude-agent-sdk',
      personality: 'Creative content writer',
      budget: 30,
      reportsTo: 'ceo',
      skills: ['browser', 'filesystem'],
      heartbeat: { schedule: '0 */2 * * *', tasks: ['write_content'] },
    },
  },
};

describe('Server — REST API Routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(testConfig);
  });

  // ─── Health ─────────────────────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  // ─── Agents ─────────────────────────────────────────────────────────────

  describe('GET /api/agents', () => {
    it('should return array of agents from config', async () => {
      const res = await request(app).get('/api/agents');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toContain('ceo');
      expect(ids).toContain('writer');
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should return a single agent by ID', async () => {
      const res = await request(app).get('/api/agents/ceo');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('ceo');
      expect(res.body.name).toBe('Alex');
      expect(res.body.role).toBe('ceo');
      expect(res.body.runtime).toBe('anthropic-api');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await request(app).get('/api/agents/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ─── Tasks ──────────────────────────────────────────────────────────────

  describe('GET /api/tasks', () => {
    it('should return all tasks', async () => {
      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Write blog post',
          description: 'Write about AI agents',
          assignedTo: 'writer',
          createdBy: 'ceo',
          priority: 'normal',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Write blog post');
      expect(res.body.description).toBe('Write about AI agents');
      expect(res.body.assignedTo).toBe('writer');
      expect(res.body.createdBy).toBe('ceo');
      expect(res.body.status).toBe('pending');
      expect(res.body.priority).toBe('normal');
    });

    it('should return 400 if missing required fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Incomplete task',
          // missing description, assignedTo, createdBy, priority
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          description: 'No title',
          assignedTo: 'writer',
          createdBy: 'ceo',
          priority: 'normal',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/tasks/:id/status', () => {
    it('should update task status', async () => {
      // First create a task
      const createRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task to update',
          description: 'Will be updated',
          assignedTo: 'writer',
          createdBy: 'ceo',
          priority: 'normal',
        });

      const taskId = createRes.body.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
    });

    it('should update task status with result', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task with result',
          description: 'Will have a result',
          assignedTo: 'writer',
          createdBy: 'ceo',
          priority: 'high',
        });

      const taskId = createRes.body.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .send({
          status: 'completed',
          result: 'Blog post published successfully',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.result).toBe('Blog post published successfully');
    });

    it('should return 404 for unknown task ID', async () => {
      const res = await request(app)
        .put('/api/tasks/task_unknown/status')
        .send({ status: 'in_progress' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ─── Budget ─────────────────────────────────────────────────────────────

  describe('GET /api/budget', () => {
    it('should return budget info per agent', async () => {
      const res = await request(app).get('/api/budget');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      const ceoBudget = res.body.ceo;
      expect(ceoBudget).toBeDefined();
      expect(ceoBudget).toHaveProperty('spent');
      expect(ceoBudget).toHaveProperty('limit');
      expect(ceoBudget).toHaveProperty('remaining');
      expect(ceoBudget.limit).toBe(50);
    });
  });

  // ─── Heartbeat ──────────────────────────────────────────────────────────

  describe('POST /api/agents/:id/heartbeat', () => {
    it('should trigger heartbeat for agent', async () => {
      const res = await request(app).post('/api/agents/writer/heartbeat');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('agentId', 'writer');
    });

    it('should return 404 for unknown agent heartbeat', async () => {
      const res = await request(app).post('/api/agents/nonexistent/heartbeat');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ─── Audit ──────────────────────────────────────────────────────────────

  describe('GET /api/audit', () => {
    it('should return audit log entries', async () => {
      const res = await request(app).get('/api/audit');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── Config ─────────────────────────────────────────────────────────────

  describe('GET /api/config', () => {
    it('should return current config (company section only, not secrets)', async () => {
      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('company');
      expect(res.body.company.name).toBe('Test Co');
      expect(res.body.company.timezone).toBe('UTC');

      // Should not expose provider secrets
      expect(res.body).not.toHaveProperty('providers');
    });
  });

  describe('PUT /api/config/:section', () => {
    it('should update config section', async () => {
      const res = await request(app)
        .put('/api/config/company')
        .send({
          name: 'Updated Co',
          description: 'Updated description',
          timezone: 'America/New_York',
          businessHours: '08:00-17:00',
        });

      expect(res.status).toBe(200);
      expect(res.body.company.name).toBe('Updated Co');
    });

    it('should return 400 for invalid section', async () => {
      const res = await request(app)
        .put('/api/config/invalid_section')
        .send({ foo: 'bar' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
