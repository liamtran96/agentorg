import { describe, it, expect, beforeEach } from 'vitest';
import { InvoicingSkill } from '@agentorg/skills';

describe('InvoicingSkill', () => {
  let skill: InvoicingSkill;

  beforeEach(() => {
    skill = new InvoicingSkill();
  });

  it('should have correct metadata', () => {
    expect(skill.id).toBe('invoicing');
    expect(skill.name).toBeDefined();
    expect(skill.version).toBeDefined();
    expect(skill.capabilities).toContain('create');
    expect(skill.capabilities).toContain('send');
    expect(skill.capabilities).toContain('list');
    expect(skill.capabilities).toContain('get');
    expect(skill.capabilities).toContain('markPaid');
  });

  describe('create action', () => {
    it('should create an invoice with line items and return id, total, and draft status', async () => {
      const result = await skill.execute('create', {
        clientName: 'Acme Corp',
        clientEmail: 'billing@acme.com',
        items: [
          { description: 'Web Design', quantity: 1, unitPrice: 5000 },
          { description: 'Hosting (monthly)', quantity: 12, unitPrice: 50 },
        ],
        dueDate: '2026-04-15',
      });

      expect(result.success).toBe(true);

      const data = result.data as {
        invoiceId: string;
        total: number;
        status: string;
      };
      expect(data.invoiceId).toBeDefined();
      expect(data.total).toBe(5000 + 12 * 50); // 5600
      expect(data.status).toBe('draft');
    });

    it('should calculate total from quantity * unitPrice summed across items', async () => {
      const result = await skill.execute('create', {
        clientName: 'Test Co',
        clientEmail: 'test@co.com',
        items: [
          { description: 'Item A', quantity: 3, unitPrice: 100 },
          { description: 'Item B', quantity: 2, unitPrice: 250 },
          { description: 'Item C', quantity: 5, unitPrice: 10 },
        ],
        dueDate: '2026-05-01',
      });

      expect(result.success).toBe(true);
      const data = result.data as { total: number };
      // 3*100 + 2*250 + 5*10 = 300 + 500 + 50 = 850
      expect(data.total).toBe(850);
    });
  });

  describe('send action', () => {
    it('should mark an invoice as sent', async () => {
      const created = await skill.execute('create', {
        clientName: 'Client A',
        clientEmail: 'a@client.com',
        items: [{ description: 'Service', quantity: 1, unitPrice: 1000 }],
        dueDate: '2026-04-01',
      });
      const invoiceId = (created.data as { invoiceId: string }).invoiceId;

      const result = await skill.execute('send', { invoiceId });

      expect(result.success).toBe(true);

      // Verify the status changed
      const fetched = await skill.execute('get', { invoiceId });
      expect(fetched.success).toBe(true);
      expect((fetched.data as { status: string }).status).toBe('sent');
    });

    it('should return error for unknown invoice ID', async () => {
      const result = await skill.execute('send', { invoiceId: 'inv-nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('list action', () => {
    it('should return all invoices', async () => {
      await skill.execute('create', {
        clientName: 'X',
        clientEmail: 'x@x.com',
        items: [{ description: 'A', quantity: 1, unitPrice: 100 }],
        dueDate: '2026-04-01',
      });
      await skill.execute('create', {
        clientName: 'Y',
        clientEmail: 'y@y.com',
        items: [{ description: 'B', quantity: 1, unitPrice: 200 }],
        dueDate: '2026-04-01',
      });

      const result = await skill.execute('list', {});

      expect(result.success).toBe(true);
      const data = result.data as Array<{ invoiceId: string }>;
      expect(data.length).toBe(2);
    });

    it('should filter invoices by status', async () => {
      const inv1 = await skill.execute('create', {
        clientName: 'Draft Co',
        clientEmail: 'draft@co.com',
        items: [{ description: 'Service', quantity: 1, unitPrice: 500 }],
        dueDate: '2026-04-01',
      });
      const inv2 = await skill.execute('create', {
        clientName: 'Sent Co',
        clientEmail: 'sent@co.com',
        items: [{ description: 'Service', quantity: 1, unitPrice: 700 }],
        dueDate: '2026-04-01',
      });
      const inv2Id = (inv2.data as { invoiceId: string }).invoiceId;
      await skill.execute('send', { invoiceId: inv2Id });

      const drafts = await skill.execute('list', { status: 'draft' });
      expect(drafts.success).toBe(true);
      expect((drafts.data as Array<unknown>).length).toBe(1);

      const sent = await skill.execute('list', { status: 'sent' });
      expect(sent.success).toBe(true);
      expect((sent.data as Array<unknown>).length).toBe(1);
    });
  });

  describe('get action', () => {
    it('should return a single invoice by ID', async () => {
      const created = await skill.execute('create', {
        clientName: 'Retrieve Inc',
        clientEmail: 'retrieve@inc.com',
        items: [{ description: 'Consulting', quantity: 10, unitPrice: 150 }],
        dueDate: '2026-06-01',
      });
      const invoiceId = (created.data as { invoiceId: string }).invoiceId;

      const result = await skill.execute('get', { invoiceId });

      expect(result.success).toBe(true);
      const data = result.data as {
        invoiceId: string;
        clientName: string;
        total: number;
        status: string;
      };
      expect(data.invoiceId).toBe(invoiceId);
      expect(data.clientName).toBe('Retrieve Inc');
      expect(data.total).toBe(1500);
      expect(data.status).toBe('draft');
    });

    it('should return error for unknown invoice ID', async () => {
      const result = await skill.execute('get', { invoiceId: 'inv-ghost' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('markPaid action', () => {
    it('should mark an invoice as paid with a paidAt date', async () => {
      const created = await skill.execute('create', {
        clientName: 'Payer LLC',
        clientEmail: 'pay@llc.com',
        items: [{ description: 'License', quantity: 1, unitPrice: 2000 }],
        dueDate: '2026-04-15',
      });
      const invoiceId = (created.data as { invoiceId: string }).invoiceId;

      // Send first (typical flow: draft -> sent -> paid)
      await skill.execute('send', { invoiceId });

      const result = await skill.execute('markPaid', { invoiceId });

      expect(result.success).toBe(true);

      const fetched = await skill.execute('get', { invoiceId });
      expect(fetched.success).toBe(true);
      const data = fetched.data as { status: string; paidAt: string };
      expect(data.status).toBe('paid');
      expect(data.paidAt).toBeDefined();
    });

    it('should return error for unknown invoice ID', async () => {
      const result = await skill.execute('markPaid', { invoiceId: 'inv-nope' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('unknown action', () => {
    it('should return success: false for an unknown action', async () => {
      const result = await skill.execute('void', { invoiceId: 'inv-1' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions with proper schema', () => {
      const tools = skill.getToolDefinitions();

      expect(tools.length).toBeGreaterThanOrEqual(5);

      const names = tools.map((t) => t.name);
      expect(names).toContain('invoicing_create');
      expect(names).toContain('invoicing_send');
      expect(names).toContain('invoicing_list');
      expect(names).toContain('invoicing_get');
      expect(names).toContain('invoicing_markPaid');

      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });
  });
});
