import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '@agentorg/memory';

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  it('should add a document to a namespace', async () => {
    await kb.add('acme-corp', 'doc_1', 'Our company was founded in 2020.');

    const results = await kb.search('acme-corp', 'founded');
    expect(results).toHaveLength(1);
    expect(results[0].docId).toBe('doc_1');
    expect(results[0].content).toContain('founded in 2020');
  });

  it('should search documents by query within a namespace', async () => {
    await kb.add('acme-corp', 'doc_1', 'Our mission is to build AI agents.');
    await kb.add('acme-corp', 'doc_2', 'Pricing starts at $99/month.');
    await kb.add('acme-corp', 'doc_3', 'Our AI platform supports multiple models.');

    const results = await kb.search('acme-corp', 'AI');
    expect(results).toHaveLength(2);

    const docIds = results.map((r: { docId: string }) => r.docId);
    expect(docIds).toContain('doc_1');
    expect(docIds).toContain('doc_3');
  });

  it('should return empty array when no documents match', async () => {
    await kb.add('acme-corp', 'doc_1', 'Our mission is to build AI agents.');

    const results = await kb.search('acme-corp', 'quantum computing');
    expect(results).toHaveLength(0);
  });

  it('should update an existing document', async () => {
    await kb.add('acme-corp', 'doc_1', 'Version 1 content');
    await kb.update('acme-corp', 'doc_1', 'Version 2 content with new details');

    const results = await kb.search('acme-corp', 'Version 2');
    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('Version 2');

    const oldResults = await kb.search('acme-corp', 'Version 1');
    expect(oldResults).toHaveLength(0);
  });

  it('should delete a document', async () => {
    await kb.add('acme-corp', 'doc_1', 'Document to keep');
    await kb.add('acme-corp', 'doc_2', 'Document to delete');

    await kb.delete('acme-corp', 'doc_2');

    const results = await kb.search('acme-corp', 'Document');
    expect(results).toHaveLength(1);
    expect(results[0].docId).toBe('doc_1');
  });

  it('should isolate documents by namespace', async () => {
    await kb.add('acme-corp', 'doc_1', 'Acme builds AI agents');
    await kb.add('beta-inc', 'doc_1', 'Beta does cloud hosting');

    const acmeResults = await kb.search('acme-corp', 'AI agents');
    expect(acmeResults).toHaveLength(1);
    expect(acmeResults[0].content).toContain('Acme');

    const betaResults = await kb.search('beta-inc', 'AI agents');
    expect(betaResults).toHaveLength(0);
  });

  it('should handle searching an empty namespace', async () => {
    const results = await kb.search('empty-namespace', 'anything');
    expect(results).toHaveLength(0);
  });

  it('should handle deleting a non-existent document gracefully', async () => {
    await expect(kb.delete('acme-corp', 'nonexistent')).resolves.not.toThrow();
  });
});
