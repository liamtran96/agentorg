import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SourceOfTruth } from '@agentorg/memory';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('SourceOfTruth', () => {
  let sot: SourceOfTruth;
  let tempDir: string;

  beforeEach(() => {
    sot = new SourceOfTruth();
    tempDir = mkdtempSync(join(tmpdir(), 'agentorg-sot-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load source-of-truth files', async () => {
    const file1 = join(tempDir, 'brand-guide.txt');
    const file2 = join(tempDir, 'product-facts.txt');

    writeFileSync(file1, 'Our brand color is blue. Our tagline is "Build with agents".');
    writeFileSync(file2, 'Product launched in 2024. Supports 5 languages.');

    await sot.load([file1, file2]);

    const results = await sot.query('What is the brand color?');
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return relevant passages for a query', async () => {
    const file = join(tempDir, 'facts.txt');
    writeFileSync(
      file,
      'Our CEO is Jane Smith. The company has 50 employees. Revenue was $10M in 2025.'
    );

    await sot.load([file]);

    const results = await sot.query('Who is the CEO?');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r: { text: string }) => r.text.includes('Jane Smith'))).toBe(true);
  });

  it('should return relevant passages for fact-checking', async () => {
    const file = join(tempDir, 'product.txt');
    writeFileSync(file, 'The product supports Python, JavaScript, and TypeScript. Pricing is $49/month.');

    await sot.load([file]);

    const results = await sot.query('What languages are supported?');
    expect(results.length).toBeGreaterThan(0);

    const allText = results.map((r: { text: string }) => r.text).join(' ');
    expect(allText).toContain('Python');
  });

  it('should handle file not found gracefully', async () => {
    const missingFile = join(tempDir, 'does-not-exist.txt');

    await expect(sot.load([missingFile])).rejects.toThrow();
  });

  it('should handle loading a mix of valid and invalid paths', async () => {
    const validFile = join(tempDir, 'valid.txt');
    writeFileSync(validFile, 'Valid content here.');

    const invalidFile = join(tempDir, 'missing.txt');

    await expect(sot.load([validFile, invalidFile])).rejects.toThrow();
  });

  it('should return empty results when query has no match', async () => {
    const file = join(tempDir, 'narrow.txt');
    writeFileSync(file, 'This document only talks about marine biology.');

    await sot.load([file]);

    const results = await sot.query('quantum entanglement');
    expect(results).toHaveLength(0);
  });

  it('should load multiple files and query across all of them', async () => {
    const file1 = join(tempDir, 'team.txt');
    const file2 = join(tempDir, 'product.txt');

    writeFileSync(file1, 'The engineering team uses TypeScript.');
    writeFileSync(file2, 'The product is deployed on AWS.');

    await sot.load([file1, file2]);

    const teamResults = await sot.query('TypeScript');
    expect(teamResults.length).toBeGreaterThan(0);

    const productResults = await sot.query('AWS');
    expect(productResults.length).toBeGreaterThan(0);
  });
});
