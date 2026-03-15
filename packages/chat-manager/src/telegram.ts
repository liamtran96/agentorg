import { parseCommand, type ParsedCommand } from './commands.js';
import { parseNaturalLanguage } from './natural-lang.js';

/**
 * Incoming Telegram update object (simplified).
 */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    date: number;
  };
}

/**
 * Message passed to the registered handler after parsing.
 */
export interface TelegramMessage {
  /** The chat ID the message came from. */
  chatId: string;
  /** Raw text of the message. */
  text: string;
  /** Parsed command (slash or NL), or null if unrecognised. */
  parsed: ParsedCommand | null;
  /** Original Telegram message ID. */
  messageId: number;
}

/**
 * Outgoing message payload sent to the Telegram Bot API.
 */
export interface TelegramOutgoingMessage {
  chat_id: string;
  text: string;
  parse_mode: 'Markdown' | 'MarkdownV2' | 'HTML';
}

/** Handler function type for incoming messages. */
export type MessageHandler = (message: TelegramMessage) => void | Promise<void>;

/**
 * Configuration for the TelegramAdapter.
 */
export interface TelegramAdapterConfig {
  /** Telegram Bot API token. */
  botToken: string;
  /** Chat IDs allowed to interact. Empty array means all chats are allowed. */
  allowedChatIds?: string[];
}

/**
 * TelegramAdapter — connects AgentOrg to Telegram Bot API.
 *
 * Parses incoming updates through the command parser and NLP parser,
 * then dispatches to a registered message handler. Only messages from
 * allowed chat IDs are processed (security gate).
 */
export class TelegramAdapter {
  /** The bot token used for API authentication. */
  private readonly botToken: string;
  /** Chat IDs permitted to interact with the bot. Empty = all allowed. */
  private readonly allowedChatIds: Set<string>;
  /** Whether the adapter is currently running (connected). */
  isRunning = false;

  private handler: MessageHandler | null = null;

  constructor(config: TelegramAdapterConfig) {
    this.botToken = config.botToken;
    this.allowedChatIds = new Set(config.allowedChatIds ?? []);
  }

  /**
   * Registers a handler for parsed incoming messages.
   * Only one handler is supported; subsequent calls replace the previous handler.
   *
   * @param handler - Callback invoked for each valid incoming message
   */
  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  /**
   * Checks whether a chat ID is allowed to interact with this adapter.
   * If no allowedChatIds were configured, all chats are permitted.
   *
   * @param chatId - The Telegram chat ID to verify
   * @returns true if the chat is allowed
   */
  isAllowed(chatId: string): boolean {
    if (this.allowedChatIds.size === 0) {
      return true;
    }
    return this.allowedChatIds.has(chatId);
  }

  /**
   * Processes an incoming Telegram update.
   *
   * 1. Extracts the message from the update
   * 2. Checks the chat ID against the allow-list
   * 3. Parses the text as a slash command, falling back to NLP parsing
   * 4. Calls the registered handler with the parsed result
   *
   * @param update - A Telegram update object
   */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message;
    if (!msg || !msg.text) {
      return;
    }

    const chatId = String(msg.chat.id);

    if (!this.isAllowed(chatId)) {
      return;
    }

    // Try slash command first, then natural language
    const parsed: ParsedCommand | null =
      parseCommand(msg.text) ?? parseNaturalLanguage(msg.text);

    if (this.handler) {
      await this.handler({
        chatId,
        text: msg.text,
        parsed,
        messageId: msg.message_id,
      });
    }
  }

  /**
   * Formats and returns an outgoing message payload.
   *
   * In a production implementation this would POST to the Telegram Bot API.
   * Currently returns the formatted payload for testing and downstream use.
   *
   * @param chatId - Target chat ID
   * @param text - Message text to send
   * @returns The formatted outgoing message payload
   */
  async sendMessage(chatId: string, text: string): Promise<TelegramOutgoingMessage> {
    const payload: TelegramOutgoingMessage = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };

    // In production: await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, { ... })
    return payload;
  }

  /**
   * Connects to the Telegram Bot API.
   * In production this would start long-polling or set up a webhook.
   */
  async start(): Promise<void> {
    this.isRunning = true;
  }

  /**
   * Disconnects from the Telegram Bot API and cleans up resources.
   */
  async stop(): Promise<void> {
    this.isRunning = false;
  }
}
