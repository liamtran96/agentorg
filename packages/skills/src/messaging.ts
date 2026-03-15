import { randomUUID } from 'node:crypto';
import type { Skill, SkillResult, ToolDefinition } from './base.js';

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  channel: string;
  timestamp: string;
  read: boolean;
}

/**
 * MessagingSkill — in-memory inter-agent messaging.
 * Supports send, receive (unread), list (with filters), and markRead actions.
 */
export class MessagingSkill implements Skill {
  readonly id = 'messaging';
  readonly name = 'Messaging';
  readonly description = 'Send and receive messages between agents across channels';
  readonly version = '0.1.0';
  capabilities = ['send', 'receive', 'list', 'markRead'];

  private messages: Message[] = [];
  private readonly maxMessages: number;

  constructor(maxMessages: number = 10000) {
    this.maxMessages = maxMessages;
  }

  async execute(action: string, params: Record<string, unknown>): Promise<SkillResult> {
    switch (action) {
      case 'send':
        return this.send(params);
      case 'receive':
        return this.receive(params);
      case 'list':
        return this.listMessages(params);
      case 'markRead':
        return this.markRead(params);
      default:
        return { success: false, data: null, error: `Unknown action: ${action}` };
    }
  }

  private async send(params: Record<string, unknown>): Promise<SkillResult> {
    const message: Message = {
      id: `msg-${randomUUID()}`,
      from: (params.from as string) || 'system',
      to: params.to as string,
      content: params.content as string,
      channel: params.channel as string,
      timestamp: new Date().toISOString(),
      read: false,
    };

    if (this.messages.length >= this.maxMessages) {
      this.messages.splice(0, this.messages.length - this.maxMessages + 1);
    }
    this.messages.push(message);

    return {
      success: true,
      data: { messageId: message.id },
    };
  }

  private async receive(params: Record<string, unknown>): Promise<SkillResult> {
    const recipient = params.recipient as string;
    const unread = this.messages.filter(
      (msg) => msg.to === recipient && !msg.read,
    );

    return { success: true, data: unread };
  }

  private async listMessages(params: Record<string, unknown>): Promise<SkillResult> {
    const channel = params.channel as string | undefined;
    const recipient = params.recipient as string | undefined;
    const limit = params.limit as number | undefined;

    const result: Message[] = [];
    for (const msg of this.messages) {
      if (channel && msg.channel !== channel) continue;
      if (recipient && msg.to !== recipient) continue;
      result.push(msg);
      if (limit !== undefined && limit > 0 && result.length >= limit) break;
    }

    return { success: true, data: result };
  }

  private async markRead(params: Record<string, unknown>): Promise<SkillResult> {
    const messageId = params.messageId as string;
    const message = this.messages.find((msg) => msg.id === messageId);

    if (!message) {
      return { success: false, data: null, error: `Message ${messageId} not found` };
    }

    message.read = true;

    return { success: true, data: { messageId, read: true } };
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'messaging_send',
        description: 'Send a message to an agent',
        input_schema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient agent ID' },
            content: { type: 'string', description: 'Message content' },
            channel: {
              type: 'string',
              description: 'Channel (internal, telegram, whatsapp, email)',
            },
            from: { type: 'string', description: 'Sender agent ID (defaults to system)' },
          },
          required: ['to', 'content', 'channel'],
        },
      },
      {
        name: 'messaging_receive',
        description: 'Receive unread messages for a recipient',
        input_schema: {
          type: 'object',
          properties: {
            recipient: { type: 'string', description: 'Recipient agent ID' },
          },
          required: ['recipient'],
        },
      },
      {
        name: 'messaging_list',
        description: 'List messages with optional filters',
        input_schema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Filter by channel' },
            recipient: { type: 'string', description: 'Filter by recipient' },
            limit: { type: 'number', description: 'Max number of messages to return' },
          },
          required: [],
        },
      },
      {
        name: 'messaging_markRead',
        description: 'Mark a message as read',
        input_schema: {
          type: 'object',
          properties: {
            messageId: { type: 'string', description: 'Message ID to mark as read' },
          },
          required: ['messageId'],
        },
      },
    ];
  }
}
