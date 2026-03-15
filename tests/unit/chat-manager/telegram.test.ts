import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramAdapter } from '@agentorg/chat-manager';

describe('Chat Manager — TelegramAdapter', () => {
  const botToken = 'test-bot-token-123';
  const allowedChatIds = ['1001', '1002'];

  let adapter: TelegramAdapter;

  beforeEach(() => {
    adapter = new TelegramAdapter({ botToken, allowedChatIds });
  });

  // ─── Constructor ──────────────────────────────────────────────────────────

  it('should store allowed chat IDs from config', () => {
    expect(adapter.isAllowed('1001')).toBe(true);
    expect(adapter.isAllowed('1002')).toBe(true);
  });

  it('should default to empty allowed list when none provided', () => {
    const open = new TelegramAdapter({ botToken: 'tok' });
    expect(open.isAllowed('any_chat')).toBe(true);
  });

  // ─── isAllowed ────────────────────────────────────────────────────────────

  it('should allow any chat when allowedChatIds is empty', () => {
    const open = new TelegramAdapter({ botToken: 'tok' });
    expect(open.isAllowed('any_chat')).toBe(true);
  });

  it('should allow chats in the allowed list', () => {
    expect(adapter.isAllowed('1001')).toBe(true);
    expect(adapter.isAllowed('1002')).toBe(true);
  });

  it('should reject chats not in the allowed list', () => {
    expect(adapter.isAllowed('9999')).toBe(false);
  });

  // ─── handleUpdate — slash commands ────────────────────────────────────────

  it('should parse slash commands and call the registered handler', async () => {
    const handler = vi.fn();
    adapter.onMessage(handler);

    await adapter.handleUpdate({
      update_id: 1,
      message: {
        message_id: 100,
        chat: { id: 1001 },
        text: '/status',
        date: Date.now(),
      },
    });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: '1001',
        text: '/status',
        parsed: { command: 'status', args: {} },
      }),
    );
  });

  it('should parse /budget command with arguments', async () => {
    const handler = vi.fn();
    adapter.onMessage(handler);

    await adapter.handleUpdate({
      update_id: 2,
      message: {
        message_id: 101,
        chat: { id: 1001 },
        text: '/budget maya 40',
        date: Date.now(),
      },
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        parsed: { command: 'budget', args: { agent: 'maya', amount: 40 } },
      }),
    );
  });

  // ─── handleUpdate — natural language ──────────────────────────────────────

  it('should parse natural language and call the handler', async () => {
    const handler = vi.fn();
    adapter.onMessage(handler);

    await adapter.handleUpdate({
      update_id: 3,
      message: {
        message_id: 102,
        chat: { id: 1002 },
        text: 'show status',
        date: Date.now(),
      },
    });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: '1002',
        text: 'show status',
        parsed: { command: 'status', args: {} },
      }),
    );
  });

  it('should call handler with null parsed when message cannot be understood', async () => {
    const handler = vi.fn();
    adapter.onMessage(handler);

    await adapter.handleUpdate({
      update_id: 4,
      message: {
        message_id: 103,
        chat: { id: 1001 },
        text: 'hello there friend',
        date: Date.now(),
      },
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: '1001',
        text: 'hello there friend',
        parsed: null,
      }),
    );
  });

  // ─── handleUpdate — security ──────────────────────────────────────────────

  it('should ignore messages from non-allowed chat IDs', async () => {
    const handler = vi.fn();
    adapter.onMessage(handler);

    await adapter.handleUpdate({
      update_id: 5,
      message: {
        message_id: 104,
        chat: { id: 9999 },
        text: '/status',
        date: Date.now(),
      },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should ignore updates without a message', async () => {
    const handler = vi.fn();
    adapter.onMessage(handler);

    await adapter.handleUpdate({ update_id: 6 });

    expect(handler).not.toHaveBeenCalled();
  });

  // ─── sendMessage ──────────────────────────────────────────────────────────

  it('should format and store outgoing messages correctly', async () => {
    // sendMessage returns the formatted request body
    const result = await adapter.sendMessage('1001', 'Hello from AgentOrg!');

    expect(result).toEqual({
      chat_id: '1001',
      text: 'Hello from AgentOrg!',
      parse_mode: 'Markdown',
    });
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  it('should start and stop without errors', async () => {
    await expect(adapter.start()).resolves.not.toThrow();
    await expect(adapter.stop()).resolves.not.toThrow();
  });

  it('should track running state through start and stop', async () => {
    expect(adapter.isRunning).toBe(false);
    await adapter.start();
    expect(adapter.isRunning).toBe(true);
    await adapter.stop();
    expect(adapter.isRunning).toBe(false);
  });
});
