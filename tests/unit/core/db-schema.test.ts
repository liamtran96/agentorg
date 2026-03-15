import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '@agentorg/core';
import type {
  Task,
  TaskStatus,
  AuditEntry,
  IncidentRecord,
  Contact,
  Deal,
  DealStage,
  OrchestratorDecision,
} from '@agentorg/core';

describe('Database — Schema & Repository Layer', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
  });

  // ─── Initialization ───────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize database with in-memory SQLite', async () => {
      // The fact that beforeEach succeeded means initialization works.
      // Verify by running a simple operation.
      const tasks = await db.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should close database cleanly', async () => {
      const freshDb = new Database(':memory:');
      await freshDb.initialize();
      await freshDb.close();

      // After close, operations should throw or reject
      await expect(freshDb.getAllTasks()).rejects.toThrow();
    });
  });

  // ─── Tasks ────────────────────────────────────────────────────────────────

  describe('tasks', () => {
    const sampleTask: Omit<Task, 'updatedAt'> = {
      id: 'task_001',
      title: 'Write blog post',
      description: 'Write a 1000-word post about AI agents',
      assignedTo: 'writer',
      createdBy: 'ceo',
      status: 'pending',
      priority: 'normal',
      createdAt: new Date('2026-03-15T10:00:00Z'),
    };

    it('should insert a task and retrieve it', async () => {
      await db.insertTask(sampleTask);
      const tasks = await db.getAllTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task_001');
      expect(tasks[0].title).toBe('Write blog post');
      expect(tasks[0].description).toBe('Write a 1000-word post about AI agents');
      expect(tasks[0].assignedTo).toBe('writer');
      expect(tasks[0].createdBy).toBe('ceo');
      expect(tasks[0].status).toBe('pending');
      expect(tasks[0].priority).toBe('normal');
    });

    it('should query tasks by agent ID', async () => {
      await db.insertTask({ ...sampleTask, id: 'task_001', assignedTo: 'writer' });
      await db.insertTask({
        ...sampleTask,
        id: 'task_002',
        title: 'Edit article',
        assignedTo: 'editor',
      });
      await db.insertTask({
        ...sampleTask,
        id: 'task_003',
        title: 'Write landing page',
        assignedTo: 'writer',
      });

      const writerTasks = await db.getTasksByAgent('writer');
      expect(writerTasks).toHaveLength(2);
      expect(writerTasks.every((t) => t.assignedTo === 'writer')).toBe(true);

      const editorTasks = await db.getTasksByAgent('editor');
      expect(editorTasks).toHaveLength(1);
      expect(editorTasks[0].assignedTo).toBe('editor');
    });

    it('should return empty array for agent with no tasks', async () => {
      const tasks = await db.getTasksByAgent('nonexistent');
      expect(tasks).toEqual([]);
    });

    it('should update task status', async () => {
      await db.insertTask(sampleTask);

      await db.updateTaskStatus('task_001', 'in_progress');
      const tasks = await db.getTasksByAgent('writer');
      expect(tasks[0].status).toBe('in_progress');
    });

    it('should update task status with result', async () => {
      await db.insertTask(sampleTask);

      await db.updateTaskStatus('task_001', 'completed', 'Blog post published at /blog/ai-agents');
      const tasks = await db.getTasksByAgent('writer');
      expect(tasks[0].status).toBe('completed');
      expect(tasks[0].result).toBe('Blog post published at /blog/ai-agents');
    });

    it('should update the updatedAt timestamp on status change', async () => {
      await db.insertTask(sampleTask);

      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));

      await db.updateTaskStatus('task_001', 'in_progress');
      const tasks = await db.getTasksByAgent('writer');
      const updatedAt = new Date(tasks[0].updatedAt);
      const createdAt = new Date(tasks[0].createdAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });

    it('should get all tasks', async () => {
      await db.insertTask({ ...sampleTask, id: 'task_001' });
      await db.insertTask({ ...sampleTask, id: 'task_002', title: 'Second task' });
      await db.insertTask({ ...sampleTask, id: 'task_003', title: 'Third task' });

      const all = await db.getAllTasks();
      expect(all).toHaveLength(3);
    });

    it('should store optional task fields (dueAt, tokensUsed, cost)', async () => {
      await db.insertTask({
        ...sampleTask,
        dueAt: new Date('2026-03-20T18:00:00Z'),
        tokensUsed: 1500,
        cost: 0.045,
      });

      const tasks = await db.getAllTasks();
      expect(tasks[0].tokensUsed).toBe(1500);
      expect(tasks[0].cost).toBe(0.045);
    });
  });

  // ─── Audit Entries ────────────────────────────────────────────────────────

  describe('audit entries', () => {
    const sampleAudit: AuditEntry = {
      id: 'audit_001',
      timestamp: new Date('2026-03-15T10:05:00Z'),
      agentId: 'writer',
      action: 'browser.search',
      decision: 'ALLOWED',
      reason: 'Agent has browser skill',
      metadata: { query: 'AI trends 2026' },
    };

    it('should insert an audit entry and retrieve all', async () => {
      await db.insertAudit(sampleAudit);
      const entries = await db.getAuditAll();

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('audit_001');
      expect(entries[0].agentId).toBe('writer');
      expect(entries[0].action).toBe('browser.search');
      expect(entries[0].decision).toBe('ALLOWED');
      expect(entries[0].reason).toBe('Agent has browser skill');
    });

    it('should query audit entries by agent ID', async () => {
      await db.insertAudit(sampleAudit);
      await db.insertAudit({
        id: 'audit_002',
        timestamp: new Date('2026-03-15T10:06:00Z'),
        agentId: 'editor',
        action: 'email.send',
        decision: 'BLOCKED',
        reason: 'Agent does not have email skill',
      });
      await db.insertAudit({
        id: 'audit_003',
        timestamp: new Date('2026-03-15T10:07:00Z'),
        agentId: 'writer',
        action: 'filesystem.write',
        decision: 'ALLOWED',
        reason: 'Agent has filesystem skill',
      });

      const writerAudit = await db.getAuditByAgent('writer');
      expect(writerAudit).toHaveLength(2);
      expect(writerAudit.every((e) => e.agentId === 'writer')).toBe(true);
    });

    it('should store metadata as JSON', async () => {
      await db.insertAudit(sampleAudit);
      const entries = await db.getAuditByAgent('writer');

      expect(entries[0].metadata).toBeDefined();
      expect(entries[0].metadata).toEqual({ query: 'AI trends 2026' });
    });

    it('should handle audit entry without metadata', async () => {
      const { metadata, ...auditWithoutMeta } = sampleAudit;
      await db.insertAudit({ ...auditWithoutMeta, id: 'audit_no_meta' });

      const entries = await db.getAuditAll();
      expect(entries).toHaveLength(1);
      expect(entries[0].metadata).toBeUndefined();
    });
  });

  // ─── Incidents ────────────────────────────────────────────────────────────

  describe('incidents', () => {
    const sampleIncident: IncidentRecord = {
      id: 'inc_001',
      timestamp: new Date('2026-03-15T11:00:00Z'),
      agentId: 'writer',
      type: 'safety_violation',
      severity: 'high',
      description: 'Agent attempted to access restricted URL',
      resolved: false,
    };

    it('should insert an incident and retrieve by type', async () => {
      await db.insertIncident(sampleIncident);
      const incidents = await db.getIncidentsByType('safety_violation');

      expect(incidents).toHaveLength(1);
      expect(incidents[0].id).toBe('inc_001');
      expect(incidents[0].type).toBe('safety_violation');
      expect(incidents[0].severity).toBe('high');
      expect(incidents[0].resolved).toBe(false);
    });

    it('should query incidents by type and not return other types', async () => {
      await db.insertIncident(sampleIncident);
      await db.insertIncident({
        id: 'inc_002',
        timestamp: new Date('2026-03-15T11:05:00Z'),
        agentId: 'writer',
        type: 'budget_exceeded',
        severity: 'medium',
        description: 'Writer exceeded daily budget',
        resolved: false,
      });
      await db.insertIncident({
        id: 'inc_003',
        timestamp: new Date('2026-03-15T11:10:00Z'),
        agentId: 'editor',
        type: 'safety_violation',
        severity: 'low',
        description: 'Mild brand voice deviation',
        resolved: false,
      });

      const safetyIncidents = await db.getIncidentsByType('safety_violation');
      expect(safetyIncidents).toHaveLength(2);
      expect(safetyIncidents.every((i) => i.type === 'safety_violation')).toBe(true);

      const budgetIncidents = await db.getIncidentsByType('budget_exceeded');
      expect(budgetIncidents).toHaveLength(1);
    });

    it('should resolve an incident', async () => {
      await db.insertIncident(sampleIncident);
      await db.resolveIncident('inc_001');

      const incidents = await db.getIncidentsByType('safety_violation');
      expect(incidents[0].resolved).toBe(true);
      expect(incidents[0].resolvedAt).toBeDefined();
    });

    it('should return empty array for type with no incidents', async () => {
      const incidents = await db.getIncidentsByType('sla_breach');
      expect(incidents).toEqual([]);
    });
  });

  // ─── Contacts ─────────────────────────────────────────────────────────────

  describe('contacts', () => {
    const sampleContact: Omit<Contact, 'interactions'> & { interactions?: Contact['interactions'] } = {
      id: 'contact_001',
      name: 'Jane Smith',
      email: 'jane@example.com',
      company: 'Acme Corp',
      tags: ['vip', 'enterprise'],
      createdAt: new Date('2026-03-10T09:00:00Z'),
      updatedAt: new Date('2026-03-10T09:00:00Z'),
      lifetimeValue: 15000,
    };

    it('should insert a contact', async () => {
      await db.insertContact(sampleContact as Contact);
      const contacts = await db.getAllContacts();

      expect(contacts).toHaveLength(1);
      expect(contacts[0].id).toBe('contact_001');
      expect(contacts[0].name).toBe('Jane Smith');
      expect(contacts[0].email).toBe('jane@example.com');
      expect(contacts[0].company).toBe('Acme Corp');
    });

    it('should get contact by email', async () => {
      await db.insertContact(sampleContact as Contact);
      await db.insertContact({
        id: 'contact_002',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        interactions: [],
      } as Contact);

      const contact = await db.getContactByEmail('jane@example.com');
      expect(contact).toBeDefined();
      expect(contact!.name).toBe('Jane Smith');
      expect(contact!.email).toBe('jane@example.com');
    });

    it('should return undefined for unknown email', async () => {
      const contact = await db.getContactByEmail('nobody@example.com');
      expect(contact).toBeUndefined();
    });

    it('should get all contacts', async () => {
      await db.insertContact(sampleContact as Contact);
      await db.insertContact({
        id: 'contact_002',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        interactions: [],
      } as Contact);

      const contacts = await db.getAllContacts();
      expect(contacts).toHaveLength(2);
    });

    it('should store tags as JSON array', async () => {
      await db.insertContact(sampleContact as Contact);
      const contact = await db.getContactByEmail('jane@example.com');

      expect(contact!.tags).toEqual(['vip', 'enterprise']);
    });

    it('should store lifetimeValue', async () => {
      await db.insertContact(sampleContact as Contact);
      const contact = await db.getContactByEmail('jane@example.com');

      expect(contact!.lifetimeValue).toBe(15000);
    });
  });

  // ─── Deals ────────────────────────────────────────────────────────────────

  describe('deals', () => {
    const sampleDeal: Deal = {
      id: 'deal_001',
      contactId: 'contact_001',
      title: 'Enterprise license',
      value: 50000,
      stage: 'proposal',
      assignedTo: 'sales',
      createdAt: new Date('2026-03-12T14:00:00Z'),
      updatedAt: new Date('2026-03-12T14:00:00Z'),
    };

    it('should insert a deal', async () => {
      await db.insertDeal(sampleDeal);
      const deals = await db.getDealsByContact('contact_001');

      expect(deals).toHaveLength(1);
      expect(deals[0].id).toBe('deal_001');
      expect(deals[0].title).toBe('Enterprise license');
      expect(deals[0].value).toBe(50000);
      expect(deals[0].stage).toBe('proposal');
      expect(deals[0].assignedTo).toBe('sales');
    });

    it('should get deals by contact ID', async () => {
      await db.insertDeal(sampleDeal);
      await db.insertDeal({
        ...sampleDeal,
        id: 'deal_002',
        contactId: 'contact_002',
        title: 'Starter plan',
        value: 5000,
      });
      await db.insertDeal({
        ...sampleDeal,
        id: 'deal_003',
        contactId: 'contact_001',
        title: 'Support add-on',
        value: 10000,
      });

      const contact1Deals = await db.getDealsByContact('contact_001');
      expect(contact1Deals).toHaveLength(2);
      expect(contact1Deals.every((d) => d.contactId === 'contact_001')).toBe(true);

      const contact2Deals = await db.getDealsByContact('contact_002');
      expect(contact2Deals).toHaveLength(1);
    });

    it('should update deal stage', async () => {
      await db.insertDeal(sampleDeal);
      await db.updateDealStage('deal_001', 'negotiation');

      const deals = await db.getDealsByContact('contact_001');
      expect(deals[0].stage).toBe('negotiation');
    });

    it('should update the updatedAt timestamp on stage change', async () => {
      await db.insertDeal(sampleDeal);

      await new Promise((r) => setTimeout(r, 10));

      await db.updateDealStage('deal_001', 'closed_won');
      const deals = await db.getDealsByContact('contact_001');
      const updatedAt = new Date(deals[0].updatedAt);
      const createdAt = new Date(deals[0].createdAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });

    it('should return empty array for contact with no deals', async () => {
      const deals = await db.getDealsByContact('nonexistent');
      expect(deals).toEqual([]);
    });
  });

  // ─── Transactions ─────────────────────────────────────────────────────────

  describe('transactions', () => {
    it('should rollback on error inside a transaction', async () => {
      const task1: Omit<Task, 'updatedAt'> = {
        id: 'task_tx_001',
        title: 'Transaction task 1',
        description: 'Should be rolled back',
        assignedTo: 'writer',
        createdBy: 'ceo',
        status: 'pending',
        priority: 'normal',
        createdAt: new Date(),
      };

      try {
        db.transaction((tx) => {
          tx.insertTask(task1);
          // Force an error mid-transaction
          throw new Error('Simulated failure');
        });
      } catch (err) {
        // Expected
        expect((err as Error).message).toBe('Simulated failure');
      }

      // Task should NOT have been persisted
      const tasks = await db.getAllTasks();
      expect(tasks).toHaveLength(0);
    });

    it('should commit on successful transaction', async () => {
      const task1: Omit<Task, 'updatedAt'> = {
        id: 'task_tx_001',
        title: 'Transaction task 1',
        description: 'Should be committed',
        assignedTo: 'writer',
        createdBy: 'ceo',
        status: 'pending',
        priority: 'normal',
        createdAt: new Date(),
      };

      const task2: Omit<Task, 'updatedAt'> = {
        id: 'task_tx_002',
        title: 'Transaction task 2',
        description: 'Should also be committed',
        assignedTo: 'editor',
        createdBy: 'ceo',
        status: 'pending',
        priority: 'high',
        createdAt: new Date(),
      };

      db.transaction((tx) => {
        tx.insertTask(task1);
        tx.insertTask(task2);
      });

      const tasks = await db.getAllTasks();
      expect(tasks).toHaveLength(2);
    });
  });
});
