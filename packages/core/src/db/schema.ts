import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Tasks table — stores all agent tasks with status tracking.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    assignedTo: text('assigned_to').notNull(),
    createdBy: text('created_by').notNull(),
    status: text('status').notNull().default('pending'),
    priority: text('priority').notNull().default('normal'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    dueAt: timestamp('due_at'),
    result: text('result'),
    tokensUsed: integer('tokens_used'),
    cost: real('cost'),
  },
  (table) => [
    index('idx_tasks_assigned_to').on(table.assignedTo),
    index('idx_tasks_status').on(table.status),
  ],
);

/**
 * Audit entries table — immutable log of every orchestrator decision.
 */
export const auditEntries = pgTable(
  'audit_entries',
  {
    id: text('id').primaryKey(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    agentId: text('agent_id').notNull(),
    action: text('action').notNull(),
    decision: text('decision').notNull(),
    reason: text('reason').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => [index('idx_audit_agent').on(table.agentId)],
);

/**
 * Incidents table — tracks safety violations, budget overruns, SLA breaches.
 */
export const incidents = pgTable(
  'incidents',
  {
    id: text('id').primaryKey(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    agentId: text('agent_id').notNull(),
    type: text('type').notNull(),
    severity: text('severity').notNull(),
    description: text('description').notNull(),
    resolved: boolean('resolved').default(false).notNull(),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => [index('idx_incidents_type').on(table.type)],
);

/**
 * Contacts table — CRM contact records with unique email constraint.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    company: text('company'),
    tags: jsonb('tags').$type<string[]>(),
    interactions: jsonb('interactions').$type<unknown[]>().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lifetimeValue: real('lifetime_value'),
  },
  (table) => [uniqueIndex('idx_contacts_email').on(table.email)],
);

/**
 * Deals table — sales pipeline with foreign key to contacts.
 */
export const deals = pgTable(
  'deals',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id')
      .notNull()
      .references(() => contacts.id),
    title: text('title').notNull(),
    value: real('value').notNull(),
    stage: text('stage').notNull().default('lead'),
    assignedTo: text('assigned_to').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
  },
  (table) => [index('idx_deals_contact').on(table.contactId)],
);
