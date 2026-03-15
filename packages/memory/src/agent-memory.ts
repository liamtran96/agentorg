/**
 * Per-agent memory storage with personality persistence.
 * In-memory implementation — will be backed by SQLite/vector store later.
 */

interface MemoryEntry {
  key: string;
  value: string;
}

export class AgentMemory {
  private memories: Map<string, MemoryEntry[]> = new Map();
  private personalities: Map<string, Record<string, unknown>> = new Map();

  /**
   * Store a key-value memory entry for a specific agent.
   */
  async store(agentId: string, key: string, value: string): Promise<void> {
    if (!this.memories.has(agentId)) {
      this.memories.set(agentId, []);
    }
    this.memories.get(agentId)!.push({ key, value });
  }

  /**
   * Retrieve all memory entries for an agent.
   */
  async getAll(agentId: string): Promise<MemoryEntry[]> {
    return this.memories.get(agentId) ?? [];
  }

  /**
   * Search an agent's memories by substring match on value.
   */
  async search(agentId: string, query: string): Promise<MemoryEntry[]> {
    const entries = this.memories.get(agentId) ?? [];
    return entries.filter((entry) => entry.value.includes(query));
  }

  /**
   * Store personality data for an agent.
   */
  async storePersonality(agentId: string, personality: Record<string, unknown>): Promise<void> {
    this.personalities.set(agentId, personality);
  }

  /**
   * Retrieve personality data for an agent, or null if not set.
   */
  async getPersonality(agentId: string): Promise<Record<string, unknown> | null> {
    return this.personalities.get(agentId) ?? null;
  }

  /**
   * Clear all memory and personality data for an agent.
   */
  async clear(agentId: string): Promise<void> {
    this.memories.delete(agentId);
    this.personalities.delete(agentId);
  }
}
