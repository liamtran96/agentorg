import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FilesystemSkill } from '../../../packages/skills/src/filesystem.js';

describe('FilesystemSkill', () => {
  let tmpDir: string;
  let skill: FilesystemSkill;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentorg-fs-test-'));
    skill = new FilesystemSkill(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should have correct metadata', () => {
    expect(skill.id).toBe('filesystem');
    expect(skill.name).toBe('Filesystem');
    expect(skill.version).toBe('0.1.0');
    expect(skill.capabilities).toContain('read');
    expect(skill.capabilities).toContain('write');
    expect(skill.capabilities).toContain('list');
    expect(skill.capabilities).toContain('delete');
  });

  describe('read action', () => {
    it('should return file content', async () => {
      const filePath = path.join(tmpDir, 'hello.txt');
      fs.writeFileSync(filePath, 'Hello, world!', 'utf-8');

      const result = await skill.execute('read', { path: 'hello.txt' });

      expect(result.success).toBe(true);
      expect((result.data as { content: string }).content).toBe('Hello, world!');
    });

    it('should return success: false for missing file', async () => {
      const result = await skill.execute('read', { path: 'nonexistent.txt' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to read');
    });
  });

  describe('write action', () => {
    it('should create a new file', async () => {
      const result = await skill.execute('write', {
        path: 'output.txt',
        content: 'written content',
      });

      expect(result.success).toBe(true);
      const written = fs.readFileSync(path.join(tmpDir, 'output.txt'), 'utf-8');
      expect(written).toBe('written content');
    });

    it('should overwrite an existing file', async () => {
      fs.writeFileSync(path.join(tmpDir, 'overwrite.txt'), 'old', 'utf-8');

      const result = await skill.execute('write', {
        path: 'overwrite.txt',
        content: 'new',
      });

      expect(result.success).toBe(true);
      const content = fs.readFileSync(path.join(tmpDir, 'overwrite.txt'), 'utf-8');
      expect(content).toBe('new');
    });

    it('should create intermediate directories', async () => {
      const result = await skill.execute('write', {
        path: 'sub/dir/file.txt',
        content: 'nested',
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'sub/dir/file.txt'))).toBe(true);
    });

    it('should report bytes written', async () => {
      const content = 'hello';
      const result = await skill.execute('write', { path: 'bytes.txt', content });

      expect(result.success).toBe(true);
      expect((result.data as { bytes: number }).bytes).toBe(Buffer.byteLength(content));
    });
  });

  describe('list action', () => {
    it('should return directory entries', async () => {
      fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'a');
      fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'b');
      fs.mkdirSync(path.join(tmpDir, 'subdir'));

      const result = await skill.execute('list', { path: '.' });

      expect(result.success).toBe(true);
      const entries = result.data as Array<{ name: string; type: string }>;
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'a.txt', type: 'file' }),
          expect.objectContaining({ name: 'b.txt', type: 'file' }),
          expect.objectContaining({ name: 'subdir', type: 'directory' }),
        ]),
      );
    });

    it('should return success: false for missing directory', async () => {
      const result = await skill.execute('list', { path: 'nope' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to list');
    });
  });

  describe('delete action', () => {
    it('should remove a file', async () => {
      const filePath = path.join(tmpDir, 'doomed.txt');
      fs.writeFileSync(filePath, 'bye');

      const result = await skill.execute('delete', { path: 'doomed.txt' });

      expect(result.success).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should return success: false when file does not exist', async () => {
      const result = await skill.execute('delete', { path: 'ghost.txt' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete');
    });
  });

  describe('path traversal protection', () => {
    it('should throw on ../ path traversal', async () => {
      await expect(
        skill.execute('read', { path: '../../etc/passwd' }),
      ).rejects.toThrow('Path traversal blocked');
    });

    it('should throw on absolute path outside base', async () => {
      await expect(
        skill.execute('read', { path: '/etc/passwd' }),
      ).rejects.toThrow('Path traversal blocked');
    });
  });

  describe('unknown action', () => {
    it('should return success: false for unknown action', async () => {
      const result = await skill.execute('compress', { path: 'file.txt' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions with proper schema', () => {
      const tools = skill.getToolDefinitions();

      expect(tools.length).toBeGreaterThanOrEqual(3);
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });
  });
});
