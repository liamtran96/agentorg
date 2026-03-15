import nodemailer from 'nodemailer';
import type { Skill, SkillResult, ToolDefinition } from './base.js';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

interface EmailConfig {
  smtp: SmtpConfig;
  imap?: ImapConfig;
}

/**
 * Email skill — send and receive emails via SMTP/IMAP.
 * Uses nodemailer for sending.
 */
export class EmailSkill implements Skill {
  readonly id = 'email';
  readonly name = 'Email';
  readonly description = 'Send and receive emails via SMTP and IMAP';
  readonly version = '0.1.0';
  capabilities = ['send', 'receive', 'recall'];

  private config: EmailConfig;
  private transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
  private static readonly MAX_SENT_MESSAGES = 1000;
  private sentMessages: Map<string, { to: string; subject: string; body: string; sentAt: Date }> =
    new Map();

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /** Lazily create the SMTP transporter */
  private getTransporter(): ReturnType<typeof nodemailer.createTransport> {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        auth: {
          user: this.config.smtp.user,
          pass: this.config.smtp.pass,
        },
      });
    }
    return this.transporter;
  }

  async execute(action: string, params: Record<string, unknown>): Promise<SkillResult> {
    switch (action) {
      case 'send':
        return this.send(params);
      case 'receive':
        return this.receive(params);
      case 'recall':
        return this.recall(params);
      default:
        return { success: false, data: null, error: `Unknown action: ${action}` };
    }
  }

  private async send(params: Record<string, unknown>): Promise<SkillResult> {
    try {
      const mailOptions: Record<string, unknown> = {
        from: this.config.smtp.user,
        to: params.to as string,
        subject: params.subject as string,
      };

      if (params.html) {
        mailOptions.html = params.body as string;
      } else {
        mailOptions.text = params.body as string;
      }

      if (params.attachments) {
        mailOptions.attachments = params.attachments;
      }

      const result = await this.getTransporter().sendMail(mailOptions);

      // Track sent message for recall
      this.sentMessages.set(result.messageId, {
        to: params.to as string,
        subject: params.subject as string,
        body: params.body as string,
        sentAt: new Date(),
      });

      // Evict oldest entries when exceeding the max size
      if (this.sentMessages.size > EmailSkill.MAX_SENT_MESSAGES) {
        const oldest = this.sentMessages.keys().next().value!;
        this.sentMessages.delete(oldest);
      }

      return { success: true, data: { messageId: result.messageId } };
    } catch (err) {
      return { success: false, data: null, error: `Send failed: ${(err as Error).message}` };
    }
  }

  private async receive(params: Record<string, unknown>): Promise<SkillResult> {
    try {
      if (!this.config.imap) {
        return { success: false, data: null, error: 'IMAP not configured' };
      }

      const Imap = (await import('imap')).default;
      const imap = new Imap({
        user: this.config.imap.user,
        password: this.config.imap.pass,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: true,
      });

      const emails: unknown[] = [];
      const folder = (params.folder as string) || 'INBOX';
      const limit = (params.limit as number) || 10;

      return new Promise((resolve) => {
        imap.once('ready', () => {
          imap.openBox(folder, true, (err: Error | null) => {
            if (err) {
              resolve({ success: false, data: null, error: `Failed to open box: ${err.message}` });
              return;
            }

            imap.search(['ALL'], (searchErr: Error | null, results: string[]) => {
              if (searchErr) {
                resolve({
                  success: false,
                  data: null,
                  error: `Search failed: ${searchErr.message}`,
                });
                return;
              }

              const ids = results.slice(-limit);
              if (ids.length === 0) {
                resolve({ success: true, data: [] });
                return;
              }

              const fetcher = imap.fetch(ids, { bodies: '' });
              fetcher.on('message', (msg: { on: Function }) => {
                msg.on('body', (body: unknown) => {
                  emails.push(body);
                });
              });
              fetcher.on('end', () => {
                imap.end();
                resolve({ success: true, data: emails });
              });
            });
          });
        });

        imap.once('error', (err: Error) => {
          resolve({ success: false, data: null, error: `IMAP error: ${err.message}` });
        });

        imap.connect();
      });
    } catch (err) {
      return { success: false, data: null, error: `Receive failed: ${(err as Error).message}` };
    }
  }

  private async recall(params: Record<string, unknown>): Promise<SkillResult> {
    const messageId = params.messageId as string;
    const sent = this.sentMessages.get(messageId);

    if (!sent) {
      return { success: false, data: null, error: `Message ${messageId} not found or not recallable` };
    }

    // Remove from sent tracking
    this.sentMessages.delete(messageId);
    return { success: true, data: { recalled: true, messageId } };
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'email_send',
        description: 'Send an email via SMTP',
        input_schema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject line' },
            body: { type: 'string', description: 'Email body content' },
            html: { type: 'boolean', description: 'Whether body is HTML' },
            attachments: { type: 'array', description: 'File attachments' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'email_receive',
        description: 'Receive emails from inbox via IMAP',
        input_schema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Mailbox folder (default: INBOX)' },
            limit: { type: 'number', description: 'Max emails to fetch' },
          },
        },
      },
      {
        name: 'email_recall',
        description: 'Recall a previously sent email',
        input_schema: {
          type: 'object',
          properties: {
            messageId: { type: 'string', description: 'Message ID to recall' },
          },
          required: ['messageId'],
        },
      },
    ];
  }
}
