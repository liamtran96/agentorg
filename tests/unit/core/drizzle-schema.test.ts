import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  tasks,
  auditEntries,
  incidents,
  contacts,
  deals,
} from '@agentorg/core';

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Return a column config object from getTableConfig by JS property name. */
function col(tableCfg: ReturnType<typeof getTableConfig>, name: string) {
  return tableCfg.columns.find((c) => c.name === name);
}

/** Return an index config by name. */
function idx(tableCfg: ReturnType<typeof getTableConfig>, name: string) {
  return tableCfg.indexes.find((i) => i.config.name === name);
}

// ─── Tasks table ─────────────────────────────────────────────────────────────

describe('Drizzle schema — tasks table', () => {
  const cfg = getTableConfig(tasks);

  it('should be named "tasks"', () => {
    expect(cfg.name).toBe('tasks');
  });

  it('should define all expected columns', () => {
    const names = cfg.columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'title',
        'description',
        'assigned_to',
        'created_by',
        'status',
        'priority',
        'created_at',
        'updated_at',
        'due_at',
        'result',
        'tokens_used',
        'cost',
      ]),
    );
    expect(cfg.columns).toHaveLength(13);
  });

  it('should have id as text primary key', () => {
    const c = col(cfg, 'id')!;
    expect(c.columnType).toBe('PgText');
    expect(c.primary).toBe(true);
    expect(c.notNull).toBe(true);
  });

  it('should have text columns for title, description, assigned_to, created_by, status, priority, result', () => {
    for (const name of ['title', 'description', 'assigned_to', 'created_by', 'status', 'priority', 'result']) {
      const c = col(cfg, name)!;
      expect(c.columnType).toBe('PgText');
    }
  });

  it('should have timestamp columns for created_at, updated_at, due_at', () => {
    for (const name of ['created_at', 'updated_at', 'due_at']) {
      const c = col(cfg, name)!;
      expect(c.columnType).toBe('PgTimestamp');
    }
  });

  it('should have integer column for tokens_used', () => {
    const c = col(cfg, 'tokens_used')!;
    expect(c.columnType).toBe('PgInteger');
    expect(c.dataType).toBe('number');
  });

  it('should have real column for cost', () => {
    const c = col(cfg, 'cost')!;
    expect(c.columnType).toBe('PgReal');
    expect(c.dataType).toBe('number');
  });

  it('should mark required columns as notNull', () => {
    for (const name of ['title', 'description', 'assigned_to', 'created_by', 'status', 'priority', 'created_at', 'updated_at']) {
      const c = col(cfg, name)!;
      expect(c.notNull).toBe(true);
    }
  });

  it('should allow null for optional columns', () => {
    for (const name of ['due_at', 'result', 'tokens_used', 'cost']) {
      const c = col(cfg, name)!;
      expect(c.notNull).toBe(false);
    }
  });

  it('should set default for status and priority', () => {
    expect(col(cfg, 'status')!.hasDefault).toBe(true);
    expect(col(cfg, 'priority')!.hasDefault).toBe(true);
  });

  it('should set defaultNow for created_at and updated_at', () => {
    expect(col(cfg, 'created_at')!.hasDefault).toBe(true);
    expect(col(cfg, 'updated_at')!.hasDefault).toBe(true);
  });

  it('should define index on assigned_to', () => {
    const i = idx(cfg, 'idx_tasks_assigned_to');
    expect(i).toBeDefined();
    expect(i!.config.unique).toBeFalsy();
  });

  it('should define index on status', () => {
    const i = idx(cfg, 'idx_tasks_status');
    expect(i).toBeDefined();
    expect(i!.config.unique).toBeFalsy();
  });
});

// ─── Audit entries table ─────────────────────────────────────────────────────

describe('Drizzle schema — audit_entries table', () => {
  const cfg = getTableConfig(auditEntries);

  it('should be named "audit_entries"', () => {
    expect(cfg.name).toBe('audit_entries');
  });

  it('should define all expected columns', () => {
    const names = cfg.columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'timestamp',
        'agent_id',
        'action',
        'decision',
        'reason',
        'metadata',
      ]),
    );
    expect(cfg.columns).toHaveLength(7);
  });

  it('should have id as text primary key', () => {
    const c = col(cfg, 'id')!;
    expect(c.columnType).toBe('PgText');
    expect(c.primary).toBe(true);
  });

  it('should have timestamp column for timestamp', () => {
    const c = col(cfg, 'timestamp')!;
    expect(c.columnType).toBe('PgTimestamp');
    expect(c.notNull).toBe(true);
    expect(c.hasDefault).toBe(true);
  });

  it('should have text columns for agent_id, action, decision, reason', () => {
    for (const name of ['agent_id', 'action', 'decision', 'reason']) {
      const c = col(cfg, name)!;
      expect(c.columnType).toBe('PgText');
      expect(c.notNull).toBe(true);
    }
  });

  it('should have jsonb column for metadata', () => {
    const c = col(cfg, 'metadata')!;
    expect(c.columnType).toBe('PgJsonb');
    expect(c.dataType).toBe('json');
    expect(c.notNull).toBe(false);
  });

  it('should define index on agent_id', () => {
    const i = idx(cfg, 'idx_audit_agent');
    expect(i).toBeDefined();
  });
});

// ─── Incidents table ─────────────────────────────────────────────────────────

describe('Drizzle schema — incidents table', () => {
  const cfg = getTableConfig(incidents);

  it('should be named "incidents"', () => {
    expect(cfg.name).toBe('incidents');
  });

  it('should define all expected columns', () => {
    const names = cfg.columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'timestamp',
        'agent_id',
        'type',
        'severity',
        'description',
        'resolved',
        'resolved_at',
      ]),
    );
    expect(cfg.columns).toHaveLength(8);
  });

  it('should have id as text primary key', () => {
    const c = col(cfg, 'id')!;
    expect(c.columnType).toBe('PgText');
    expect(c.primary).toBe(true);
  });

  it('should have boolean column for resolved with default false', () => {
    const c = col(cfg, 'resolved')!;
    expect(c.columnType).toBe('PgBoolean');
    expect(c.dataType).toBe('boolean');
    expect(c.notNull).toBe(true);
    expect(c.hasDefault).toBe(true);
  });

  it('should have timestamp column for resolved_at (nullable)', () => {
    const c = col(cfg, 'resolved_at')!;
    expect(c.columnType).toBe('PgTimestamp');
    expect(c.notNull).toBe(false);
  });

  it('should mark required text columns as notNull', () => {
    for (const name of ['agent_id', 'type', 'severity', 'description']) {
      const c = col(cfg, name)!;
      expect(c.columnType).toBe('PgText');
      expect(c.notNull).toBe(true);
    }
  });

  it('should define index on type', () => {
    const i = idx(cfg, 'idx_incidents_type');
    expect(i).toBeDefined();
  });
});

// ─── Contacts table ──────────────────────────────────────────────────────────

describe('Drizzle schema — contacts table', () => {
  const cfg = getTableConfig(contacts);

  it('should be named "contacts"', () => {
    expect(cfg.name).toBe('contacts');
  });

  it('should define all expected columns', () => {
    const names = cfg.columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'email',
        'company',
        'tags',
        'interactions',
        'created_at',
        'updated_at',
        'lifetime_value',
      ]),
    );
    expect(cfg.columns).toHaveLength(9);
  });

  it('should have id as text primary key', () => {
    const c = col(cfg, 'id')!;
    expect(c.columnType).toBe('PgText');
    expect(c.primary).toBe(true);
  });

  it('should have required text columns for name and email', () => {
    for (const name of ['name', 'email']) {
      const c = col(cfg, name)!;
      expect(c.columnType).toBe('PgText');
      expect(c.notNull).toBe(true);
    }
  });

  it('should have optional text column for company', () => {
    const c = col(cfg, 'company')!;
    expect(c.columnType).toBe('PgText');
    expect(c.notNull).toBe(false);
  });

  it('should have jsonb columns for tags and interactions', () => {
    for (const name of ['tags', 'interactions']) {
      const c = col(cfg, name)!;
      expect(c.columnType).toBe('PgJsonb');
      expect(c.dataType).toBe('json');
    }
  });

  it('should have real column for lifetime_value', () => {
    const c = col(cfg, 'lifetime_value')!;
    expect(c.columnType).toBe('PgReal');
    expect(c.dataType).toBe('number');
    expect(c.notNull).toBe(false);
  });

  it('should have timestamp columns for created_at and updated_at', () => {
    for (const name of ['created_at', 'updated_at']) {
      const c = col(cfg, name)!;
      expect(c.columnType).toBe('PgTimestamp');
      expect(c.notNull).toBe(true);
      expect(c.hasDefault).toBe(true);
    }
  });

  it('should define unique index on email', () => {
    const i = idx(cfg, 'idx_contacts_email');
    expect(i).toBeDefined();
    expect(i!.config.unique).toBe(true);
  });
});

// ─── Deals table ─────────────────────────────────────────────────────────────

describe('Drizzle schema — deals table', () => {
  const cfg = getTableConfig(deals);

  it('should be named "deals"', () => {
    expect(cfg.name).toBe('deals');
  });

  it('should define all expected columns', () => {
    const names = cfg.columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'contact_id',
        'title',
        'value',
        'stage',
        'assigned_to',
        'created_at',
        'updated_at',
        'closed_at',
      ]),
    );
    expect(cfg.columns).toHaveLength(9);
  });

  it('should have id as text primary key', () => {
    const c = col(cfg, 'id')!;
    expect(c.columnType).toBe('PgText');
    expect(c.primary).toBe(true);
  });

  it('should have real column for value', () => {
    const c = col(cfg, 'value')!;
    expect(c.columnType).toBe('PgReal');
    expect(c.notNull).toBe(true);
  });

  it('should have text column for stage with default', () => {
    const c = col(cfg, 'stage')!;
    expect(c.columnType).toBe('PgText');
    expect(c.notNull).toBe(true);
    expect(c.hasDefault).toBe(true);
  });

  it('should have optional timestamp for closed_at', () => {
    const c = col(cfg, 'closed_at')!;
    expect(c.columnType).toBe('PgTimestamp');
    expect(c.notNull).toBe(false);
  });

  it('should define foreign key from contact_id to contacts.id', () => {
    expect(cfg.foreignKeys).toHaveLength(1);

    const fk = cfg.foreignKeys[0];
    const ref = fk.reference();

    // Local column is contact_id
    expect(ref.columns).toHaveLength(1);
    expect(ref.columns[0].name).toBe('contact_id');

    // Foreign table is contacts, foreign column is id
    const foreignTableCfg = getTableConfig(ref.foreignTable);
    expect(foreignTableCfg.name).toBe('contacts');
    expect(ref.foreignColumns).toHaveLength(1);
    expect(ref.foreignColumns[0].name).toBe('id');
  });

  it('should define index on contact_id', () => {
    const i = idx(cfg, 'idx_deals_contact');
    expect(i).toBeDefined();
  });
});
