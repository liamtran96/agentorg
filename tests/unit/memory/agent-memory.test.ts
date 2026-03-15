import { describe, it, expect, beforeEach } from 'vitest';
import { AgentMemory } from '@agentorg/memory';

describe('AgentMemory', () => {
  let memory: AgentMemory;

  beforeEach(() => {
    memory = new AgentMemory();
  });

  it('should store a memory entry for an agent', async () => {
    await memory.store('writer', 'last_topic', 'AI orchestration frameworks');

    const all = await memory.getAll('writer');
    expect(all).toHaveLength(1);
    expect(all[0].key).toBe('last_topic');
    expect(all[0].value).toBe('AI orchestration frameworks');
  });

  it('should retrieve all memories by agent ID', async () => {
    await memory.store('writer', 'topic', 'agents');
    await memory.store('writer', 'tone', 'professional');
    await memory.store('writer', 'word_count', '1500');

    const all = await memory.getAll('writer');
    expect(all).toHaveLength(3);

    const keys = all.map((m: { key: string }) => m.key);
    expect(keys).toContain('topic');
    expect(keys).toContain('tone');
    expect(keys).toContain('word_count');
  });

  it('should not return memories from other agents', async () => {
    await memory.store('writer', 'topic', 'agents');
    await memory.store('editor', 'style', 'AP');

    const writerMemories = await memory.getAll('writer');
    expect(writerMemories).toHaveLength(1);
    expect(writerMemories[0].key).toBe('topic');
  });

  it('should search memories by query using substring match', async () => {
    await memory.store('writer', 'draft_1', 'Blog post about AI orchestration');
    await memory.store('writer', 'draft_2', 'Article about cooking pasta');
    await memory.store('writer', 'draft_3', 'Guide to AI agent frameworks');

    const results = await memory.search('writer', 'AI');
    expect(results).toHaveLength(2);
    expect(results.every((r: { value: string }) => r.value.includes('AI'))).toBe(true);
  });

  it('should return empty array when search finds no matches', async () => {
    await memory.store('writer', 'draft_1', 'Blog post about cooking');

    const results = await memory.search('writer', 'quantum physics');
    expect(results).toHaveLength(0);
  });

  it('should persist personality across sessions', async () => {
    const personality = {
      tone: 'witty and informative',
      style: 'casual but accurate',
      preferences: ['short paragraphs', 'active voice'],
    };

    await memory.storePersonality('writer', personality);
    const retrieved = await memory.getPersonality('writer');

    expect(retrieved).toEqual(personality);
    expect(retrieved.tone).toBe('witty and informative');
    expect(retrieved.preferences).toHaveLength(2);
  });

  it('should return null personality for unknown agent', async () => {
    const personality = await memory.getPersonality('nonexistent');
    expect(personality).toBeNull();
  });

  it('should clear all memory for an agent', async () => {
    await memory.store('writer', 'topic', 'agents');
    await memory.store('writer', 'tone', 'professional');
    await memory.storePersonality('writer', { tone: 'casual' });

    await memory.clear('writer');

    const all = await memory.getAll('writer');
    expect(all).toHaveLength(0);

    const personality = await memory.getPersonality('writer');
    expect(personality).toBeNull();
  });

  it('should not clear other agents memory when clearing one agent', async () => {
    await memory.store('writer', 'topic', 'agents');
    await memory.store('editor', 'style', 'AP');

    await memory.clear('writer');

    const editorMemories = await memory.getAll('editor');
    expect(editorMemories).toHaveLength(1);
  });
});
