import { describe, it, expect, beforeEach } from 'vitest';
import { CRMSkill } from '@agentorg/skills';

describe('CRMSkill', () => {
  let skill: CRMSkill;

  beforeEach(() => {
    skill = new CRMSkill();
  });

  it('should have correct metadata', () => {
    expect(skill.id).toBe('crm');
    expect(skill.name).toBe('CRM');
    expect(skill.capabilities).toContain('createContact');
    expect(skill.capabilities).toContain('updateContact');
    expect(skill.capabilities).toContain('lookupContact');
    expect(skill.capabilities).toContain('createDeal');
    expect(skill.capabilities).toContain('moveDeal');
  });

  describe('createContact action', () => {
    it('should create a contact and return an id', async () => {
      const result = await skill.execute('createContact', {
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '+1-555-0100',
      });

      expect(result.success).toBe(true);
      const data = result.data as { contactId: string; name: string; email: string };
      expect(data.contactId).toBeDefined();
      expect(data.name).toBe('Alice Smith');
      expect(data.email).toBe('alice@example.com');
    });

    it('should reject duplicate email addresses', async () => {
      await skill.execute('createContact', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const duplicate = await skill.execute('createContact', {
        name: 'Alice Copy',
        email: 'alice@example.com',
      });

      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toContain('already exists');
    });
  });

  describe('updateContact action', () => {
    it('should update contact fields', async () => {
      const created = await skill.execute('createContact', {
        name: 'Bob',
        email: 'bob@example.com',
      });
      const contactId = (created.data as { contactId: string }).contactId;

      const result = await skill.execute('updateContact', {
        contactId,
        phone: '+1-555-0200',
        company: 'Acme Corp',
      });

      expect(result.success).toBe(true);
      const data = result.data as { phone: string; company: string };
      expect(data.phone).toBe('+1-555-0200');
      expect(data.company).toBe('Acme Corp');
    });

    it('should return success: false for unknown contact', async () => {
      const result = await skill.execute('updateContact', {
        contactId: 'nonexistent',
        phone: '+1-555-0000',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('lookupContact action', () => {
    it('should find a contact by email', async () => {
      await skill.execute('createContact', {
        name: 'Carol',
        email: 'carol@example.com',
      });

      const result = await skill.execute('lookupContact', {
        email: 'carol@example.com',
      });

      expect(result.success).toBe(true);
      const data = result.data as { name: string; email: string };
      expect(data.name).toBe('Carol');
      expect(data.email).toBe('carol@example.com');
    });

    it('should return success: false when contact not found', async () => {
      const result = await skill.execute('lookupContact', {
        email: 'nobody@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('createDeal action', () => {
    it('should create a deal with a stage', async () => {
      const contact = await skill.execute('createContact', {
        name: 'Dan',
        email: 'dan@example.com',
      });
      const contactId = (contact.data as { contactId: string }).contactId;

      const result = await skill.execute('createDeal', {
        contactId,
        title: 'Enterprise Plan',
        value: 50000,
        stage: 'lead',
      });

      expect(result.success).toBe(true);
      const data = result.data as { dealId: string; stage: string; value: number };
      expect(data.dealId).toBeDefined();
      expect(data.stage).toBe('lead');
      expect(data.value).toBe(50000);
    });
  });

  describe('moveDeal action', () => {
    it('should move deal through pipeline stages', async () => {
      const contact = await skill.execute('createContact', {
        name: 'Eve',
        email: 'eve@example.com',
      });
      const contactId = (contact.data as { contactId: string }).contactId;

      const deal = await skill.execute('createDeal', {
        contactId,
        title: 'Premium Subscription',
        value: 1200,
        stage: 'lead',
      });
      const dealId = (deal.data as { dealId: string }).dealId;

      // Move from lead -> qualified
      const result1 = await skill.execute('moveDeal', {
        dealId,
        stage: 'qualified',
      });
      expect(result1.success).toBe(true);
      expect((result1.data as { stage: string }).stage).toBe('qualified');

      // Move from qualified -> proposal
      const result2 = await skill.execute('moveDeal', {
        dealId,
        stage: 'proposal',
      });
      expect(result2.success).toBe(true);
      expect((result2.data as { stage: string }).stage).toBe('proposal');

      // Move to closed-won
      const result3 = await skill.execute('moveDeal', {
        dealId,
        stage: 'closed-won',
      });
      expect(result3.success).toBe(true);
      expect((result3.data as { stage: string }).stage).toBe('closed-won');
    });

    it('should return success: false for unknown deal', async () => {
      const result = await skill.execute('moveDeal', {
        dealId: 'nonexistent',
        stage: 'qualified',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('auto-create contact on first interaction', () => {
    it('should create contact automatically when creating a deal with email', async () => {
      const result = await skill.execute('createDeal', {
        email: 'frank@example.com',
        name: 'Frank',
        title: 'Auto Deal',
        value: 500,
        stage: 'lead',
      });

      expect(result.success).toBe(true);

      // Verify the contact was auto-created
      const lookup = await skill.execute('lookupContact', {
        email: 'frank@example.com',
      });
      expect(lookup.success).toBe(true);
      expect((lookup.data as { name: string }).name).toBe('Frank');
    });
  });

  describe('interaction history', () => {
    it('should track interactions for a contact', async () => {
      const contact = await skill.execute('createContact', {
        name: 'Grace',
        email: 'grace@example.com',
      });
      const contactId = (contact.data as { contactId: string }).contactId;

      // Log interactions
      await skill.execute('logInteraction', {
        contactId,
        type: 'email',
        summary: 'Sent welcome email',
      });

      await skill.execute('logInteraction', {
        contactId,
        type: 'call',
        summary: 'Discussed pricing',
      });

      const result = await skill.execute('getInteractions', { contactId });

      expect(result.success).toBe(true);
      const interactions = result.data as Array<{ type: string; summary: string }>;
      expect(interactions.length).toBe(2);
      expect(interactions[0].type).toBe('email');
      expect(interactions[1].type).toBe('call');
    });
  });

  describe('lifetime value', () => {
    it('should calculate lifetime value from closed deals', async () => {
      const contact = await skill.execute('createContact', {
        name: 'Henry',
        email: 'henry@example.com',
      });
      const contactId = (contact.data as { contactId: string }).contactId;

      // Create and close two deals
      const deal1 = await skill.execute('createDeal', {
        contactId,
        title: 'Deal A',
        value: 1000,
        stage: 'lead',
      });
      await skill.execute('moveDeal', {
        dealId: (deal1.data as { dealId: string }).dealId,
        stage: 'closed-won',
      });

      const deal2 = await skill.execute('createDeal', {
        contactId,
        title: 'Deal B',
        value: 2500,
        stage: 'lead',
      });
      await skill.execute('moveDeal', {
        dealId: (deal2.data as { dealId: string }).dealId,
        stage: 'closed-won',
      });

      const result = await skill.execute('getLifetimeValue', { contactId });

      expect(result.success).toBe(true);
      expect((result.data as { lifetimeValue: number }).lifetimeValue).toBe(3500);
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const tools = skill.getToolDefinitions();

      expect(tools.length).toBeGreaterThanOrEqual(3);
      const names = tools.map((t) => t.name);
      expect(names).toContain('crm_createContact');
      expect(names).toContain('crm_lookupContact');
      expect(names).toContain('crm_createDeal');

      for (const tool of tools) {
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });
  });
});
