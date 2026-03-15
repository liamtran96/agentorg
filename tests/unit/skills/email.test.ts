import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock nodemailer
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: vi.fn().mockResolvedValue(true),
    })),
  },
}));

// Mock imap for receiving emails
const mockImapSearch = vi.fn();
const mockImapFetch = vi.fn();
vi.mock('imap', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      openBox: vi.fn((_box: string, _ro: boolean, cb: Function) => cb(null, {})),
      search: mockImapSearch,
      fetch: mockImapFetch,
      end: vi.fn(),
      on: vi.fn(),
      once: vi.fn((_event: string, cb: Function) => {
        if (_event === 'ready') setTimeout(() => cb(), 0);
      }),
    })),
  };
});

import { EmailSkill } from '@agentorg/skills';

describe('EmailSkill', () => {
  let skill: EmailSkill;

  const smtpConfig = {
    host: 'smtp.test.com',
    port: 587,
    user: 'agent@test.com',
    pass: 'secret',
  };

  const imapConfig = {
    host: 'imap.test.com',
    port: 993,
    user: 'agent@test.com',
    pass: 'secret',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    skill = new EmailSkill({ smtp: smtpConfig, imap: imapConfig });
  });

  it('should have correct metadata', () => {
    expect(skill.id).toBe('email');
    expect(skill.name).toBe('Email');
    expect(skill.capabilities).toContain('send');
    expect(skill.capabilities).toContain('receive');
    expect(skill.capabilities).toContain('recall');
  });

  describe('send action', () => {
    it('should send an email via SMTP', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-123' });

      const result = await skill.execute('send', {
        to: 'customer@example.com',
        subject: 'Hello',
        body: 'Welcome to our service',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'Hello',
        }),
      );
      expect((result.data as { messageId: string }).messageId).toBe('msg-123');
    });

    it('should handle SMTP errors', async () => {
      mockSendMail.mockRejectedValue(new Error('Connection refused'));

      const result = await skill.execute('send', {
        to: 'customer@example.com',
        subject: 'Hello',
        body: 'Content',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should pass attachments when provided', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-456' });

      const attachments = [
        { filename: 'report.pdf', content: Buffer.from('pdf-data') },
      ];

      const result = await skill.execute('send', {
        to: 'customer@example.com',
        subject: 'Report',
        body: 'See attached',
        attachments,
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: 'report.pdf' }),
          ]),
        }),
      );
    });
  });

  describe('receive action', () => {
    it('should return emails from inbox', async () => {
      const mockEmails = [
        {
          id: '1',
          from: 'sender@example.com',
          subject: 'Test email',
          body: 'Email body',
          date: '2026-03-15T10:00:00Z',
        },
      ];
      mockImapSearch.mockImplementation((_criteria: unknown, cb: Function) => {
        cb(null, ['1']);
      });
      mockImapFetch.mockReturnValue({
        on: vi.fn(function (this: unknown, event: string, cb: Function) {
          if (event === 'message') {
            cb({
              on: vi.fn((evt: string, handler: Function) => {
                if (evt === 'body') handler(mockEmails[0]);
              }),
            });
          }
          if (event === 'end') cb();
          return this;
        }),
      });

      const result = await skill.execute('receive', { folder: 'INBOX', limit: 10 });

      expect(result.success).toBe(true);
      const data = result.data as Array<{ from: string; subject: string }>;
      expect(data).toBeDefined();
    });
  });

  describe('email content parsing', () => {
    it('should handle HTML and plain text content', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-789' });

      const result = await skill.execute('send', {
        to: 'customer@example.com',
        subject: 'HTML Email',
        body: '<h1>Hello</h1>',
        html: true,
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Hello'),
        }),
      );
    });
  });

  describe('recall action', () => {
    it('should return success when within recall window', async () => {
      // First send an email
      mockSendMail.mockResolvedValue({ messageId: 'msg-recall-1' });
      await skill.execute('send', {
        to: 'customer@example.com',
        subject: 'Oops',
        body: 'Wrong content',
      });

      // Then recall it
      const result = await skill.execute('recall', { messageId: 'msg-recall-1' });

      expect(result.success).toBe(true);
    });

    it('should return success: false for unknown messageId', async () => {
      const result = await skill.execute('recall', { messageId: 'msg-nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('unknown action', () => {
    it('should return success: false for unknown action', async () => {
      const result = await skill.execute('archive', { messageId: '123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions for email actions', () => {
      const tools = skill.getToolDefinitions();

      expect(tools.length).toBeGreaterThanOrEqual(2);
      const names = tools.map((t) => t.name);
      expect(names).toContain('email_send');
      expect(names).toContain('email_receive');

      for (const tool of tools) {
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });
  });
});
