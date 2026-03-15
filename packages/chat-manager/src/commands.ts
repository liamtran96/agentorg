/**
 * Parsed command result from a chat message.
 */
export interface ParsedCommand {
  command: string;
  args: Record<string, unknown>;
}

/**
 * Parses a slash command from a chat message.
 * Returns null if the message is not a valid command.
 *
 * Supported commands:
 * - /status
 * - /budget <agent> <amount>
 * - /hire <role>
 * - /fire <agent>
 * - /approve
 * - /reject
 * - /digest
 * - /cost
 */
export function parseCommand(input: string): ParsedCommand | null {
  if (!input || !input.startsWith('/')) {
    return null;
  }

  const parts = input.trim().split(/\s+/);
  const command = parts[0].slice(1); // remove leading '/'

  switch (command) {
    case 'status':
    case 'approve':
    case 'reject':
    case 'digest':
    case 'cost':
      return { command, args: {} };

    case 'budget': {
      const agent = parts[1];
      const amount = Number(parts[2]);
      return { command, args: { agent, amount } };
    }

    case 'hire': {
      const role = parts[1];
      return { command, args: { role } };
    }

    case 'fire': {
      const agent = parts[1];
      return { command, args: { agent } };
    }

    default:
      return { command, args: {} };
  }
}
