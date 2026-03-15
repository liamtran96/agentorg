import { describe, it, expect, beforeEach } from 'vitest';
import { MessagingSkill } from '@agentorg/skills';

describe('MessagingSkill', () => {
  let skill: MessagingSkill;

  beforeEach(() => {
    skill = new MessagingSkill();
  });

  it('should have correct metadata', () => {
    expect(skill.id).toBe('messaging');
    expect(skill.name).toBeDefined();
    expect(skill.version).toBeDefined();
    expect(skill.capabilities).toContain('send');
    expect(skill.capabilities).toContain('receive');
    expect(skill.capabilities).toContain('list');
    expect(skill.capabilities).toContain('markRead');
  });

  describe('send action', () => {
    it('should send a message and return a messageId', async () => {
      const result = await skill.execute('send', {
        to: 'agent-maya',
        content: 'Please review the latest blog draft.',
        channel: 'internal',
      });

      expect(result.success).toBe(true);
      const data = result.data as { messageId: string };
      expect(data.messageId).toBeDefined();
    });

    it('should support different channels', async () => {
      const channels = ['internal', 'telegram', 'whatsapp', 'email'] as const;

      for (const channel of channels) {
        const result = await skill.execute('send', {
          to: 'agent-ceo',
          content: `Test via ${channel}`,
          channel,
        });

        expect(result.success).toBe(true);
        expect((result.data as { messageId: string }).messageId).toBeDefined();
      }
    });
  });

  describe('receive action', () => {
    it('should return unread messages for a recipient', async () => {
      // Send two messages to the same recipient
      await skill.execute('send', {
        to: 'agent-writer',
        content: 'First message',
        channel: 'internal',
      });
      await skill.execute('send', {
        to: 'agent-writer',
        content: 'Second message',
        channel: 'internal',
      });

      const result = await skill.execute('receive', { recipient: 'agent-writer' });

      expect(result.success).toBe(true);
      const messages = result.data as Array<{ content: string; read: boolean }>;
      expect(messages.length).toBe(2);
      expect(messages[0].read).toBe(false);
      expect(messages[1].read).toBe(false);
    });

    it('should return an empty array when there are no unread messages', async () => {
      const result = await skill.execute('receive', { recipient: 'agent-idle' });

      expect(result.success).toBe(true);
      const messages = result.data as Array<unknown>;
      expect(messages.length).toBe(0);
    });
  });

  describe('list action', () => {
    it('should list all messages', async () => {
      await skill.execute('send', {
        to: 'agent-a',
        content: 'Msg 1',
        channel: 'internal',
      });
      await skill.execute('send', {
        to: 'agent-b',
        content: 'Msg 2',
        channel: 'telegram',
      });
      await skill.execute('send', {
        to: 'agent-c',
        content: 'Msg 3',
        channel: 'whatsapp',
      });

      const result = await skill.execute('list', {});

      expect(result.success).toBe(true);
      const messages = result.data as Array<unknown>;
      expect(messages.length).toBe(3);
    });

    it('should filter by channel', async () => {
      await skill.execute('send', {
        to: 'agent-a',
        content: 'Internal msg',
        channel: 'internal',
      });
      await skill.execute('send', {
        to: 'agent-b',
        content: 'Telegram msg',
        channel: 'telegram',
      });

      const result = await skill.execute('list', { channel: 'telegram' });

      expect(result.success).toBe(true);
      const messages = result.data as Array<{ channel: string }>;
      expect(messages.length).toBe(1);
      expect(messages[0].channel).toBe('telegram');
    });

    it('should filter by recipient', async () => {
      await skill.execute('send', {
        to: 'agent-x',
        content: 'For X',
        channel: 'internal',
      });
      await skill.execute('send', {
        to: 'agent-y',
        content: 'For Y',
        channel: 'internal',
      });

      const result = await skill.execute('list', { recipient: 'agent-x' });

      expect(result.success).toBe(true);
      const messages = result.data as Array<{ to: string }>;
      expect(messages.length).toBe(1);
      expect(messages[0].to).toBe('agent-x');
    });

    it('should respect the limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await skill.execute('send', {
          to: 'agent-bulk',
          content: `Message ${i}`,
          channel: 'internal',
        });
      }

      const result = await skill.execute('list', { limit: 3 });

      expect(result.success).toBe(true);
      const messages = result.data as Array<unknown>;
      expect(messages.length).toBe(3);
    });
  });

  describe('markRead action', () => {
    it('should mark a message as read', async () => {
      const sent = await skill.execute('send', {
        to: 'agent-reader',
        content: 'Read me',
        channel: 'internal',
      });
      const messageId = (sent.data as { messageId: string }).messageId;

      const result = await skill.execute('markRead', { messageId });

      expect(result.success).toBe(true);

      // After marking read, receive should not return it
      const unread = await skill.execute('receive', { recipient: 'agent-reader' });
      const messages = unread.data as Array<{ id: string }>;
      const found = messages.find((m) => m.id === messageId);
      expect(found).toBeUndefined();
    });
  });

  describe('message structure', () => {
    it('should include all required fields on a message', async () => {
      await skill.execute('send', {
        to: 'agent-struct',
        content: 'Structure test',
        channel: 'email',
      });

      const result = await skill.execute('list', {});
      expect(result.success).toBe(true);

      const messages = result.data as Array<{
        id: string;
        from: string;
        to: string;
        content: string;
        channel: string;
        timestamp: string;
        read: boolean;
      }>;

      expect(messages.length).toBe(1);
      const msg = messages[0];
      expect(msg.id).toBeDefined();
      expect(typeof msg.to).toBe('string');
      expect(msg.content).toBe('Structure test');
      expect(msg.channel).toBe('email');
      expect(msg.timestamp).toBeDefined();
      expect(msg.read).toBe(false);
    });
  });

  describe('unknown action', () => {
    it('should return success: false for an unknown action', async () => {
      const result = await skill.execute('archive', { messageId: 'msg-1' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions with proper schema', () => {
      const tools = skill.getToolDefinitions();

      expect(tools.length).toBeGreaterThanOrEqual(4);

      const names = tools.map((t) => t.name);
      expect(names).toContain('messaging_send');
      expect(names).toContain('messaging_receive');
      expect(names).toContain('messaging_list');
      expect(names).toContain('messaging_markRead');

      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });
  });
});
