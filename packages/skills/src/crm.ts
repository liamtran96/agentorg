import { randomUUID } from 'node:crypto';
import type { Skill, SkillResult, ToolDefinition } from './base.js';

interface Contact {
  contactId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  [key: string]: unknown;
}

interface Deal {
  dealId: string;
  contactId: string;
  title: string;
  value: number;
  stage: string;
}

interface Interaction {
  interactionId: string;
  contactId: string;
  type: string;
  summary: string;
  timestamp: string;
}

/**
 * CRM skill — in-memory contact, deal, and interaction management.
 */
export class CRMSkill implements Skill {
  readonly id = 'crm';
  readonly name = 'CRM';
  readonly description = 'Manage contacts, deals, and interactions';
  readonly version = '0.1.0';
  capabilities = ['createContact', 'updateContact', 'lookupContact', 'createDeal', 'moveDeal'];

  private contacts: Map<string, Contact> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> contactId
  private deals: Map<string, Deal> = new Map();
  private interactions: Map<string, Interaction[]> = new Map(); // contactId -> interactions

  async execute(action: string, params: Record<string, unknown>): Promise<SkillResult> {
    switch (action) {
      case 'createContact':
        return this.createContact(params);
      case 'updateContact':
        return this.updateContact(params);
      case 'lookupContact':
        return this.lookupContact(params);
      case 'createDeal':
        return this.createDeal(params);
      case 'moveDeal':
        return this.moveDeal(params);
      case 'logInteraction':
        return this.logInteraction(params);
      case 'getInteractions':
        return this.getInteractions(params);
      case 'getLifetimeValue':
        return this.getLifetimeValue(params);
      default:
        return { success: false, data: null, error: `Unknown action: ${action}` };
    }
  }

  private async createContact(params: Record<string, unknown>): Promise<SkillResult> {
    const email = params.email as string;

    if (this.emailIndex.has(email)) {
      return { success: false, data: null, error: `Contact with email ${email} already exists` };
    }

    const contactId = randomUUID();
    const contact: Contact = {
      contactId,
      name: params.name as string,
      email,
      phone: params.phone as string | undefined,
      company: params.company as string | undefined,
    };

    this.contacts.set(contactId, contact);
    this.emailIndex.set(email, contactId);

    return { success: true, data: { contactId, name: contact.name, email: contact.email } };
  }

  private async updateContact(params: Record<string, unknown>): Promise<SkillResult> {
    const contactId = params.contactId as string;
    const contact = this.contacts.get(contactId);

    if (!contact) {
      return { success: false, data: null, error: `Contact ${contactId} not found` };
    }

    // Update all provided fields except contactId
    const { contactId: _, ...updates } = params;
    for (const [key, value] of Object.entries(updates)) {
      contact[key] = value;
    }

    this.contacts.set(contactId, contact);
    return { success: true, data: { ...contact } };
  }

  private async lookupContact(params: Record<string, unknown>): Promise<SkillResult> {
    const email = params.email as string;
    const contactId = this.emailIndex.get(email);

    if (!contactId) {
      return { success: false, data: null, error: `Contact with email ${email} not found` };
    }

    const contact = this.contacts.get(contactId)!;
    return { success: true, data: { ...contact } };
  }

  private async createDeal(params: Record<string, unknown>): Promise<SkillResult> {
    let contactId = params.contactId as string | undefined;

    // Auto-create contact if email provided but no contactId
    if (!contactId && params.email) {
      const existingContactId = this.emailIndex.get(params.email as string);
      if (existingContactId) {
        contactId = existingContactId;
      } else {
        const createResult = await this.createContact({
          name: params.name as string,
          email: params.email as string,
        });
        if (!createResult.success) {
          return createResult;
        }
        contactId = (createResult.data as { contactId: string }).contactId;
      }
    }

    const dealId = randomUUID();
    const deal: Deal = {
      dealId,
      contactId: contactId!,
      title: params.title as string,
      value: params.value as number,
      stage: params.stage as string,
    };

    this.deals.set(dealId, deal);
    return { success: true, data: { dealId, stage: deal.stage, value: deal.value } };
  }

  private async moveDeal(params: Record<string, unknown>): Promise<SkillResult> {
    const dealId = params.dealId as string;
    const deal = this.deals.get(dealId);

    if (!deal) {
      return { success: false, data: null, error: `Deal ${dealId} not found` };
    }

    deal.stage = params.stage as string;
    this.deals.set(dealId, deal);
    return { success: true, data: { dealId, stage: deal.stage, value: deal.value } };
  }

  private async logInteraction(params: Record<string, unknown>): Promise<SkillResult> {
    const contactId = params.contactId as string;
    const contact = this.contacts.get(contactId);

    if (!contact) {
      return { success: false, data: null, error: `Contact ${contactId} not found` };
    }

    const interaction: Interaction = {
      interactionId: randomUUID(),
      contactId,
      type: params.type as string,
      summary: params.summary as string,
      timestamp: new Date().toISOString(),
    };

    const existing = this.interactions.get(contactId) || [];
    existing.push(interaction);
    this.interactions.set(contactId, existing);

    return { success: true, data: interaction };
  }

  private async getInteractions(params: Record<string, unknown>): Promise<SkillResult> {
    const contactId = params.contactId as string;
    const interactions = this.interactions.get(contactId) || [];
    return { success: true, data: interactions };
  }

  private async getLifetimeValue(params: Record<string, unknown>): Promise<SkillResult> {
    const contactId = params.contactId as string;
    const contact = this.contacts.get(contactId);

    if (!contact) {
      return { success: false, data: null, error: `Contact ${contactId} not found` };
    }

    let lifetimeValue = 0;
    for (const deal of this.deals.values()) {
      if (deal.contactId === contactId && deal.stage === 'closed-won') {
        lifetimeValue += deal.value;
      }
    }

    return { success: true, data: { lifetimeValue } };
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'crm_createContact',
        description: 'Create a new contact in the CRM',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Contact name' },
            email: { type: 'string', description: 'Contact email' },
            phone: { type: 'string', description: 'Contact phone number' },
            company: { type: 'string', description: 'Company name' },
          },
          required: ['name', 'email'],
        },
      },
      {
        name: 'crm_updateContact',
        description: 'Update fields on an existing contact',
        input_schema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID to update' },
          },
          required: ['contactId'],
        },
      },
      {
        name: 'crm_lookupContact',
        description: 'Look up a contact by email address',
        input_schema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email to search for' },
          },
          required: ['email'],
        },
      },
      {
        name: 'crm_createDeal',
        description: 'Create a new deal in the pipeline',
        input_schema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Associated contact ID' },
            title: { type: 'string', description: 'Deal title' },
            value: { type: 'number', description: 'Deal value' },
            stage: { type: 'string', description: 'Pipeline stage' },
          },
          required: ['title', 'value', 'stage'],
        },
      },
      {
        name: 'crm_moveDeal',
        description: 'Move a deal to a different pipeline stage',
        input_schema: {
          type: 'object',
          properties: {
            dealId: { type: 'string', description: 'Deal ID' },
            stage: { type: 'string', description: 'New pipeline stage' },
          },
          required: ['dealId', 'stage'],
        },
      },
      {
        name: 'crm_logInteraction',
        description: 'Log an interaction with a contact',
        input_schema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            type: { type: 'string', description: 'Interaction type (email, call, meeting)' },
            summary: { type: 'string', description: 'Summary of the interaction' },
          },
          required: ['contactId', 'type', 'summary'],
        },
      },
      {
        name: 'crm_getLifetimeValue',
        description: 'Get the lifetime value of a contact from closed deals',
        input_schema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
          },
          required: ['contactId'],
        },
      },
    ];
  }
}
