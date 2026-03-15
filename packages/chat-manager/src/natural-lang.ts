import type { ParsedCommand } from './commands.js';

/**
 * Word-to-number mapping for common English number words.
 */
const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
};

/**
 * Extracts a number from text, supporting both digits and English words.
 */
function extractNumber(text: string): number | null {
  // Try digit match first
  const digitMatch = text.match(/\b(\d+)\b/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  // Try word match
  const lower = text.toLowerCase();
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    if (lower.includes(word)) {
      return num;
    }
  }

  return null;
}

/**
 * Parses natural language input into a command.
 * Returns null if the input cannot be understood.
 */
export function parseNaturalLanguage(input: string): ParsedCommand | null {
  if (!input || input.trim().length === 0) {
    return null;
  }

  const lower = input.toLowerCase().trim();

  // Budget: "set Maya's budget to 40", "set Maya's budget to forty dollars"
  const budgetMatch = lower.match(/(?:set|change|update)\s+(\w+)(?:'s|s)?\s+budget\s+to\s+(.+)/i);
  if (budgetMatch) {
    const agent = budgetMatch[1].toLowerCase();
    const amount = extractNumber(budgetMatch[2]);
    if (amount !== null) {
      return { command: 'budget', args: { agent, amount } };
    }
  }

  // Hire: "hire a designer named Kim", "hire a writer"
  const hireMatch = lower.match(/hire\s+(?:a\s+)?(\w+)(?:\s+named\s+(\w+))?/i);
  if (hireMatch) {
    const role = hireMatch[1];
    const args: Record<string, unknown> = { role };
    if (hireMatch[2]) {
      // Preserve original casing for the name
      const nameMatch = input.match(/named\s+(\w+)/i);
      args.name = nameMatch ? nameMatch[1] : hireMatch[2];
    }
    return { command: 'hire', args };
  }

  // Cost: "how much have we spent", "what's the cost", "total spending"
  if (/how much|what.{0,5}cost|total spend|spending|expenses/.test(lower)) {
    return { command: 'cost', args: {} };
  }

  // Pause: "pause social until Monday"
  const pauseMatch = lower.match(/pause\s+(\w+)/i);
  if (pauseMatch) {
    const agent = pauseMatch[1].toLowerCase();
    return { command: 'pause', args: { agent } };
  }

  // Status: "show status", "what's the status"
  if (/\bstatus\b/.test(lower)) {
    return { command: 'status', args: {} };
  }

  return null;
}
