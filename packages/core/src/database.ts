import BetterSqlite3 from 'better-sqlite3';
import type {
  Task,
  TaskStatus,
  AuditEntry,
  IncidentRecord,
  Contact,
  Deal,
  DealStage,
  OrchestratorDecision,
} from './types.js';

/**
 * Provides insert/update/query methods that can operate on either
 * the main database connection or within a transaction.
 */
class DatabaseOperations {
  constructor(protected db: BetterSqlite3.Database) {}

  // ─── Tasks ──────────────────────────────────────────────────────────────

  /** Insert a task into the database. */
  async insertTask(task: Omit<Task, 'updatedAt'> & { dueAt?: Date; tokensUsed?: number; cost?: number }): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, assignedTo, createdBy, status, priority, createdAt, updatedAt, dueAt, result, tokensUsed, cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        task.id,
        task.title,
        task.description,
        task.assignedTo,
        task.createdBy,
        task.status,
        task.priority,
        now,
        now,
        task.dueAt instanceof Date ? task.dueAt.toISOString() : task.dueAt ?? null,
        (task as Task).result ?? null,
        task.tokensUsed ?? null,
        task.cost ?? null,
      );
  }

  /** Retrieve all tasks. */
  async getAllTasks(): Promise<Task[]> {
    const rows = this.db.prepare('SELECT * FROM tasks').all() as RawTaskRow[];
    return rows.map(rowToTask);
  }

  /** Retrieve tasks assigned to a specific agent. */
  async getTasksByAgent(agentId: string): Promise<Task[]> {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE assignedTo = ?')
      .all(agentId) as RawTaskRow[];
    return rows.map(rowToTask);
  }

  /** Update a task's status and optionally set a result string. */
  async updateTaskStatus(taskId: string, status: TaskStatus, result?: string): Promise<void> {
    const now = new Date().toISOString();
    if (result !== undefined) {
      this.db
        .prepare('UPDATE tasks SET status = ?, result = ?, updatedAt = ? WHERE id = ?')
        .run(status, result, now, taskId);
    } else {
      this.db
        .prepare('UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?')
        .run(status, now, taskId);
    }
  }

  // ─── Audit ──────────────────────────────────────────────────────────────

  /** Insert an audit entry. */
  async insertAudit(entry: AuditEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO audit_entries (id, timestamp, agentId, action, decision, reason, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
        entry.agentId,
        entry.action,
        entry.decision,
        entry.reason,
        entry.metadata !== undefined ? JSON.stringify(entry.metadata) : null,
      );
  }

  /** Retrieve all audit entries. */
  async getAuditAll(): Promise<AuditEntry[]> {
    const rows = this.db.prepare('SELECT * FROM audit_entries').all() as RawAuditRow[];
    return rows.map(rowToAudit);
  }

  /** Retrieve audit entries for a specific agent. */
  async getAuditByAgent(agentId: string): Promise<AuditEntry[]> {
    const rows = this.db
      .prepare('SELECT * FROM audit_entries WHERE agentId = ?')
      .all(agentId) as RawAuditRow[];
    return rows.map(rowToAudit);
  }

  // ─── Incidents ──────────────────────────────────────────────────────────

  /** Insert an incident record. */
  async insertIncident(incident: IncidentRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO incidents (id, timestamp, agentId, type, severity, description, resolved, resolvedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        incident.id,
        incident.timestamp instanceof Date ? incident.timestamp.toISOString() : incident.timestamp,
        incident.agentId,
        incident.type,
        incident.severity,
        incident.description,
        incident.resolved ? 1 : 0,
        incident.resolvedAt instanceof Date ? incident.resolvedAt.toISOString() : incident.resolvedAt ?? null,
      );
  }

  /** Retrieve incidents by type. */
  async getIncidentsByType(type: string): Promise<IncidentRecord[]> {
    const rows = this.db
      .prepare('SELECT * FROM incidents WHERE type = ?')
      .all(type) as RawIncidentRow[];
    return rows.map(rowToIncident);
  }

  /** Mark an incident as resolved. */
  async resolveIncident(id: string): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE incidents SET resolved = 1, resolvedAt = ? WHERE id = ?')
      .run(now, id);
  }

  // ─── Contacts ───────────────────────────────────────────────────────────

  /** Insert a contact. */
  async insertContact(contact: Contact): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO contacts (id, name, email, company, tags, interactions, createdAt, updatedAt, lifetimeValue)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        contact.id,
        contact.name,
        contact.email,
        contact.company ?? null,
        contact.tags ? JSON.stringify(contact.tags) : null,
        contact.interactions ? JSON.stringify(contact.interactions) : '[]',
        contact.createdAt instanceof Date ? contact.createdAt.toISOString() : contact.createdAt,
        contact.updatedAt instanceof Date ? contact.updatedAt.toISOString() : contact.updatedAt,
        contact.lifetimeValue ?? null,
      );
  }

  /** Retrieve all contacts. */
  async getAllContacts(): Promise<Contact[]> {
    const rows = this.db.prepare('SELECT * FROM contacts').all() as RawContactRow[];
    return rows.map(rowToContact);
  }

  /** Retrieve a contact by email address. Returns undefined if not found. */
  async getContactByEmail(email: string): Promise<Contact | undefined> {
    const row = this.db
      .prepare('SELECT * FROM contacts WHERE email = ?')
      .get(email) as RawContactRow | undefined;
    return row ? rowToContact(row) : undefined;
  }

  // ─── Deals ──────────────────────────────────────────────────────────────

  /** Insert a deal. */
  async insertDeal(deal: Deal): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO deals (id, contactId, title, value, stage, assignedTo, createdAt, updatedAt, closedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        deal.id,
        deal.contactId,
        deal.title,
        deal.value,
        deal.stage,
        deal.assignedTo,
        deal.createdAt instanceof Date ? deal.createdAt.toISOString() : deal.createdAt,
        deal.updatedAt instanceof Date ? deal.updatedAt.toISOString() : deal.updatedAt,
        deal.closedAt instanceof Date ? deal.closedAt.toISOString() : deal.closedAt ?? null,
      );
  }

  /** Retrieve deals by contact ID. */
  async getDealsByContact(contactId: string): Promise<Deal[]> {
    const rows = this.db
      .prepare('SELECT * FROM deals WHERE contactId = ?')
      .all(contactId) as RawDealRow[];
    return rows.map(rowToDeal);
  }

  /** Update a deal's stage. */
  async updateDealStage(dealId: string, stage: DealStage): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE deals SET stage = ?, updatedAt = ? WHERE id = ?')
      .run(stage, now, dealId);
  }
}

/**
 * SQLite database layer for AgentOrg, backed by better-sqlite3.
 *
 * Supports in-memory (`:memory:`) and file-backed databases.
 * All public methods are async for API consistency even though
 * better-sqlite3 is synchronous under the hood.
 */
export class Database extends DatabaseOperations {
  private closed = false;

  /**
   * Create a new Database instance.
   * @param path - SQLite database path, or `:memory:` for in-memory.
   */
  constructor(path: string) {
    const sqliteDb = new BetterSqlite3(path);
    super(sqliteDb);
  }

  /**
   * Initialize the database schema (creates all tables if they don't exist).
   */
  async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        assignedTo TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        dueAt TEXT,
        result TEXT,
        tokensUsed INTEGER,
        cost REAL
      );

      CREATE TABLE IF NOT EXISTS audit_entries (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        agentId TEXT NOT NULL,
        action TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        agentId TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolvedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        company TEXT,
        tags TEXT,
        interactions TEXT NOT NULL DEFAULT '[]',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lifetimeValue REAL
      );

      CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY,
        contactId TEXT NOT NULL,
        title TEXT NOT NULL,
        value REAL NOT NULL,
        stage TEXT NOT NULL,
        assignedTo TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        closedAt TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_assignedTo ON tasks (assignedTo);
      CREATE INDEX IF NOT EXISTS idx_audit_entries_agentId ON audit_entries (agentId);
      CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents (type);
      CREATE INDEX IF NOT EXISTS idx_deals_contactId ON deals (contactId);
    `);
  }

  /**
   * Close the database connection. Subsequent operations will throw.
   */
  async close(): Promise<void> {
    this.closed = true;
    this.db.close();
  }

  // Override every public method to check for closed state

  async insertTask(task: Omit<Task, 'updatedAt'> & { dueAt?: Date; tokensUsed?: number; cost?: number }): Promise<void> {
    this.assertOpen();
    return super.insertTask(task);
  }

  async getAllTasks(): Promise<Task[]> {
    this.assertOpen();
    return super.getAllTasks();
  }

  async getTasksByAgent(agentId: string): Promise<Task[]> {
    this.assertOpen();
    return super.getTasksByAgent(agentId);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, result?: string): Promise<void> {
    this.assertOpen();
    return super.updateTaskStatus(taskId, status, result);
  }

  async insertAudit(entry: AuditEntry): Promise<void> {
    this.assertOpen();
    return super.insertAudit(entry);
  }

  async getAuditAll(): Promise<AuditEntry[]> {
    this.assertOpen();
    return super.getAuditAll();
  }

  async getAuditByAgent(agentId: string): Promise<AuditEntry[]> {
    this.assertOpen();
    return super.getAuditByAgent(agentId);
  }

  async insertIncident(incident: IncidentRecord): Promise<void> {
    this.assertOpen();
    return super.insertIncident(incident);
  }

  async getIncidentsByType(type: string): Promise<IncidentRecord[]> {
    this.assertOpen();
    return super.getIncidentsByType(type);
  }

  async resolveIncident(id: string): Promise<void> {
    this.assertOpen();
    return super.resolveIncident(id);
  }

  async insertContact(contact: Contact): Promise<void> {
    this.assertOpen();
    return super.insertContact(contact);
  }

  async getAllContacts(): Promise<Contact[]> {
    this.assertOpen();
    return super.getAllContacts();
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    this.assertOpen();
    return super.getContactByEmail(email);
  }

  async insertDeal(deal: Deal): Promise<void> {
    this.assertOpen();
    return super.insertDeal(deal);
  }

  async getDealsByContact(contactId: string): Promise<Deal[]> {
    this.assertOpen();
    return super.getDealsByContact(contactId);
  }

  async updateDealStage(dealId: string, stage: DealStage): Promise<void> {
    this.assertOpen();
    return super.updateDealStage(dealId, stage);
  }

  /**
   * Run a function inside a database transaction.
   * If the function throws, the transaction is rolled back.
   * If it succeeds, the transaction is committed.
   *
   * The callback must be synchronous because better-sqlite3 transactions
   * are synchronous. DatabaseOperations methods (insertTask, etc.) perform
   * their work synchronously even though they return Promises, so call
   * them without `await` inside the transaction callback.
   */
  transaction<T>(fn: (tx: DatabaseOperations) => T): T {
    this.assertOpen();
    const txOps = new DatabaseOperations(this.db);
    const wrapped = this.db.transaction(() => fn(txOps));
    return wrapped();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('Database is closed');
    }
  }
}

// ─── Raw row types (what SQLite returns) ────────────────────────────────────

interface RawTaskRow {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  result: string | null;
  tokensUsed: number | null;
  cost: number | null;
}

interface RawAuditRow {
  id: string;
  timestamp: string;
  agentId: string;
  action: string;
  decision: string;
  reason: string;
  metadata: string | null;
}

interface RawIncidentRow {
  id: string;
  timestamp: string;
  agentId: string;
  type: string;
  severity: string;
  description: string;
  resolved: number;
  resolvedAt: string | null;
}

interface RawContactRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  tags: string | null;
  interactions: string;
  createdAt: string;
  updatedAt: string;
  lifetimeValue: number | null;
}

interface RawDealRow {
  id: string;
  contactId: string;
  title: string;
  value: number;
  stage: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// ─── Row to domain object mappers ──────────────────────────────────────────

function rowToTask(row: RawTaskRow): Task {
  const task: Task = {
    id: row.id,
    title: row.title,
    description: row.description,
    assignedTo: row.assignedTo,
    createdBy: row.createdBy,
    status: row.status as TaskStatus,
    priority: row.priority as Task['priority'],
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
  if (row.dueAt) task.dueAt = new Date(row.dueAt);
  if (row.result !== null) task.result = row.result;
  if (row.tokensUsed !== null) task.tokensUsed = row.tokensUsed;
  if (row.cost !== null) task.cost = row.cost;
  return task;
}

function rowToAudit(row: RawAuditRow): AuditEntry {
  const entry: AuditEntry = {
    id: row.id,
    timestamp: new Date(row.timestamp),
    agentId: row.agentId,
    action: row.action,
    decision: row.decision as OrchestratorDecision,
    reason: row.reason,
  };
  if (row.metadata !== null) {
    entry.metadata = JSON.parse(row.metadata);
  }
  return entry;
}

function rowToIncident(row: RawIncidentRow): IncidentRecord {
  const incident: IncidentRecord = {
    id: row.id,
    timestamp: new Date(row.timestamp),
    agentId: row.agentId,
    type: row.type as IncidentRecord['type'],
    severity: row.severity as IncidentRecord['severity'],
    description: row.description,
    resolved: row.resolved === 1,
  };
  if (row.resolvedAt) incident.resolvedAt = new Date(row.resolvedAt);
  return incident;
}

function rowToContact(row: RawContactRow): Contact {
  const contact: Contact = {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    interactions: JSON.parse(row.interactions),
  };
  if (row.company !== null) contact.company = row.company;
  if (row.tags !== null) contact.tags = JSON.parse(row.tags);
  if (row.lifetimeValue !== null) contact.lifetimeValue = row.lifetimeValue;
  return contact;
}

function rowToDeal(row: RawDealRow): Deal {
  const deal: Deal = {
    id: row.id,
    contactId: row.contactId,
    title: row.title,
    value: row.value,
    stage: row.stage as DealStage,
    assignedTo: row.assignedTo,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
  if (row.closedAt) deal.closedAt = new Date(row.closedAt);
  return deal;
}
