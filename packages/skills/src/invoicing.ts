import { randomUUID } from 'node:crypto';
import type { Skill, SkillResult, ToolDefinition } from './base.js';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  invoiceId: string;
  clientName: string;
  clientEmail: string;
  items: LineItem[];
  total: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid';
  createdAt: string;
  paidAt?: string;
}

/**
 * InvoicingSkill — in-memory invoice management.
 * Supports create, send, list, get, and markPaid actions.
 */
export class InvoicingSkill implements Skill {
  readonly id = 'invoicing';
  readonly name = 'Invoicing';
  readonly description = 'Create, send, and manage invoices';
  readonly version = '0.1.0';
  capabilities = ['create', 'send', 'list', 'get', 'markPaid'];

  private invoices: Map<string, Invoice> = new Map();

  async execute(action: string, params: Record<string, unknown>): Promise<SkillResult> {
    switch (action) {
      case 'create':
        return this.create(params);
      case 'send':
        return this.send(params);
      case 'list':
        return this.list(params);
      case 'get':
        return this.getInvoice(params);
      case 'markPaid':
        return this.markPaid(params);
      default:
        return { success: false, data: null, error: `Unknown action: ${action}` };
    }
  }

  private async create(params: Record<string, unknown>): Promise<SkillResult> {
    const items = params.items as LineItem[];
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const invoiceId = `inv-${randomUUID()}`;

    const invoice: Invoice = {
      invoiceId,
      clientName: params.clientName as string,
      clientEmail: params.clientEmail as string,
      items,
      total,
      dueDate: params.dueDate as string,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    this.invoices.set(invoiceId, invoice);

    return {
      success: true,
      data: { invoiceId, total, status: invoice.status },
    };
  }

  private async send(params: Record<string, unknown>): Promise<SkillResult> {
    const invoiceId = params.invoiceId as string;
    const invoice = this.invoices.get(invoiceId);

    if (!invoice) {
      return { success: false, data: null, error: `Invoice ${invoiceId} not found` };
    }

    invoice.status = 'sent';
    this.invoices.set(invoiceId, invoice);

    return { success: true, data: { invoiceId, status: 'sent' } };
  }

  private async list(params: Record<string, unknown>): Promise<SkillResult> {
    let invoices = Array.from(this.invoices.values());

    const status = params.status as string | undefined;
    if (status) {
      invoices = invoices.filter((inv) => inv.status === status);
    }

    return { success: true, data: invoices };
  }

  private async getInvoice(params: Record<string, unknown>): Promise<SkillResult> {
    const invoiceId = params.invoiceId as string;
    const invoice = this.invoices.get(invoiceId);

    if (!invoice) {
      return { success: false, data: null, error: `Invoice ${invoiceId} not found` };
    }

    return { success: true, data: { ...invoice } };
  }

  private async markPaid(params: Record<string, unknown>): Promise<SkillResult> {
    const invoiceId = params.invoiceId as string;
    const invoice = this.invoices.get(invoiceId);

    if (!invoice) {
      return { success: false, data: null, error: `Invoice ${invoiceId} not found` };
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();
    this.invoices.set(invoiceId, invoice);

    return { success: true, data: { invoiceId, status: 'paid', paidAt: invoice.paidAt } };
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'invoicing_create',
        description: 'Create a new invoice with line items',
        input_schema: {
          type: 'object',
          properties: {
            clientName: { type: 'string', description: 'Client name' },
            clientEmail: { type: 'string', description: 'Client email address' },
            items: {
              type: 'array',
              description: 'Line items',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                },
                required: ['description', 'quantity', 'unitPrice'],
              },
            },
            dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
          },
          required: ['clientName', 'clientEmail', 'items', 'dueDate'],
        },
      },
      {
        name: 'invoicing_send',
        description: 'Send an invoice to the client',
        input_schema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string', description: 'Invoice ID' },
          },
          required: ['invoiceId'],
        },
      },
      {
        name: 'invoicing_list',
        description: 'List all invoices, optionally filtered by status',
        input_schema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status (draft, sent, paid)' },
          },
          required: [],
        },
      },
      {
        name: 'invoicing_get',
        description: 'Get a single invoice by ID',
        input_schema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string', description: 'Invoice ID' },
          },
          required: ['invoiceId'],
        },
      },
      {
        name: 'invoicing_markPaid',
        description: 'Mark an invoice as paid',
        input_schema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string', description: 'Invoice ID' },
          },
          required: ['invoiceId'],
        },
      },
    ];
  }
}
