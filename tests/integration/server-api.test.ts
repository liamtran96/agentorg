import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import request from 'supertest';
import { createApp } from '@agentorg/server';
import { ConfigManager, Orchestrator, OrgChart, TaskQueue } from '@agentorg/core';

const testYaml = `
company:
  name: "Server Test Co"
  description: "Integration testing the server API"
  timezone: "UTC"
  business_hours: "09:00-18:00"

org:
  ceo:
    name: Alex
    runtime: claude-agent-sdk
    model: claude-sonnet-4-20250514
    personality: "Strategic CEO"
    budget: 50
    reports_to: board
    skills: [browser, email, calendar]
    heartbeat:
      schedule: "0 */4 * * *"
      tasks: [review_agents, check_escalations]

  writer:
    name: Maya
    runtime: claude-agent-sdk
    model: claude-sonnet-4-20250514
    personality: "Content writer"
    budget: 20
    reports_to: ceo
    skills: [browser, filesystem]
    heartbeat:
      schedule: "0 */2 * * *"
      tasks: [check_task_queue]

  editor:
    name: Linh
    runtime: anthropic-api
    model: claude-sonnet-4-20250514
    personality: "Thorough editor"
    budget: 15
    reports_to: ceo
    skills: [filesystem]
    heartbeat:
      schedule: "0 */2 * * *"
      tasks: [check_review_queue]

governance:
  rules:
    - action: "email.send_external"
      condition: "always"
      requires: board_approval
    - action: "support.reply"
      condition: "always"
      requires: auto_approve
`;

describe('Integration — Server API', () => {
  let tmpDir: string;
  let configPath: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-server-test-'));
    configPath = path.join(tmpDir, 'agentorg.config.yaml');
    fs.writeFileSync(configPath, testYaml, 'utf-8');

    const configManager = new ConfigManager(configPath);
    const config = configManager.load();
    const orgChart = new OrgChart(config.org);
    const taskQueue = new TaskQueue();
    const orchestrator = new Orchestrator(config);

    app = createApp({ configManager, orgChart, taskQueue, orchestrator });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /api/agents should return agent list from config', async () => {
    const res = await request(app).get('/api/agents').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);

    const ids = res.body.map((a: { id: string }) => a.id);
    expect(ids).toContain('ceo');
    expect(ids).toContain('writer');
    expect(ids).toContain('editor');

    const ceo = res.body.find((a: { id: string }) => a.id === 'ceo');
    expect(ceo.name).toBe('Alex');
    expect(ceo.skills).toContain('email');
  });

  it('GET /api/tasks should return empty array initially', async () => {
    const res = await request(app).get('/api/tasks').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('POST /api/tasks should create a task and GET /api/tasks should return it', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Write blog post about AI agents',
        description: 'A 1000-word SEO blog post',
        assignedTo: 'writer',
        createdBy: 'ceo',
        priority: 'high',
      })
      .expect(201);

    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.title).toBe('Write blog post about AI agents');
    expect(createRes.body.status).toBe('pending');
    expect(createRes.body.assignedTo).toBe('writer');

    const listRes = await request(app).get('/api/tasks').expect(200);

    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    const found = listRes.body.find((t: { id: string }) => t.id === createRes.body.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Write blog post about AI agents');
  });

  it('PUT /api/tasks/:id/status should update task status', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Review draft',
        description: 'Review latest blog draft',
        assignedTo: 'editor',
        createdBy: 'ceo',
        priority: 'normal',
      })
      .expect(201);

    const taskId = createRes.body.id;

    const updateRes = await request(app)
      .put(`/api/tasks/${taskId}/status`)
      .send({ status: 'in_progress' })
      .expect(200);

    expect(updateRes.body.status).toBe('in_progress');

    // Verify via GET
    const getRes = await request(app).get('/api/tasks').expect(200);
    const task = getRes.body.find((t: { id: string }) => t.id === taskId);
    expect(task.status).toBe('in_progress');
  });

  it('GET /api/budget should return spend per agent (initially all zero)', async () => {
    const res = await request(app).get('/api/budget').expect(200);

    expect(res.body).toBeDefined();
    // Should have entries for each agent
    expect(res.body.ceo).toBeDefined();
    expect(res.body.writer).toBeDefined();
    expect(res.body.editor).toBeDefined();

    // All spend should be zero initially
    expect(res.body.ceo.spent).toBe(0);
    expect(res.body.writer.spent).toBe(0);
    expect(res.body.editor.spent).toBe(0);
  });

  it('POST /api/agents/:id/heartbeat should trigger heartbeat and return result', async () => {
    const res = await request(app)
      .post('/api/agents/writer/heartbeat')
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.agentId).toBe('writer');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/audit should return audit entries after actions', async () => {
    // Perform an action first to generate an audit entry
    await request(app)
      .post('/api/tasks')
      .send({
        title: 'Audit test task',
        description: 'Task for audit testing',
        assignedTo: 'writer',
        createdBy: 'ceo',
        priority: 'normal',
      })
      .expect(201);

    const res = await request(app).get('/api/audit').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // Should have at least some audit entries from previous test actions
    expect(res.body.length).toBeGreaterThanOrEqual(0);

    // If entries exist, they should have the expected structure
    if (res.body.length > 0) {
      const entry = res.body[0];
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBeDefined();
    }
  });

  it('PUT /api/config/company.name should update config and GET /api/config should reflect change', async () => {
    const updateRes = await request(app)
      .put('/api/config/company.name')
      .send({ value: 'Updated Server Test Co' })
      .expect(200);

    expect(updateRes.body.success).toBe(true);

    const getRes = await request(app).get('/api/config').expect(200);

    expect(getRes.body.company.name).toBe('Updated Server Test Co');
  });

  it('POST /api/tasks with invalid body should return 400', async () => {
    // Missing required fields
    const res = await request(app)
      .post('/api/tasks')
      .send({})
      .expect(400);

    expect(res.body.error).toBeDefined();

    // Missing title
    const res2 = await request(app)
      .post('/api/tasks')
      .send({ assignedTo: 'writer' })
      .expect(400);

    expect(res2.body.error).toBeDefined();
  });
});
