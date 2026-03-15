import fs from 'node:fs';
import path from 'node:path';
import type { Skill, SkillResult, ToolDefinition } from './base.js';

/**
 * Filesystem skill — read, write, list files.
 * Scoped to the agent's working directory for security.
 */
export class FilesystemSkill implements Skill {
  readonly id = 'filesystem';
  readonly name = 'Filesystem';
  readonly description = 'Read, write, and list files within the agent workspace';
  readonly version = '0.1.0';
  capabilities = ['read', 'write', 'list', 'delete'];

  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<SkillResult> {
    const filePath = this.resolvePath(params.path as string);

    switch (action) {
      case 'read':
        return this.read(filePath);
      case 'write':
        return this.write(filePath, params.content as string);
      case 'list':
        return this.list(filePath);
      case 'delete':
        return this.del(filePath);
      default:
        return { success: false, data: null, error: `Unknown action: ${action}` };
    }
  }

  private read(filePath: string): SkillResult {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: { content, path: filePath } };
    } catch (err) {
      return { success: false, data: null, error: `Failed to read: ${err}` };
    }
  }

  private write(filePath: string, content: string): SkillResult {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, data: { path: filePath, bytes: Buffer.byteLength(content) } };
    } catch (err) {
      return { success: false, data: null, error: `Failed to write: ${err}` };
    }
  }

  private list(dirPath: string): SkillResult {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
      }));
      return { success: true, data: files };
    } catch (err) {
      return { success: false, data: null, error: `Failed to list: ${err}` };
    }
  }

  private del(filePath: string): SkillResult {
    try {
      fs.unlinkSync(filePath);
      return { success: true, data: { deleted: filePath } };
    } catch (err) {
      return { success: false, data: null, error: `Failed to delete: ${err}` };
    }
  }

  /** Prevent path traversal — all paths scoped to baseDir */
  private resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.baseDir, relativePath);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`Path traversal blocked: ${relativePath}`);
    }
    return resolved;
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'filesystem_read',
        description: 'Read a file from the workspace',
        input_schema: {
          type: 'object',
          properties: { path: { type: 'string', description: 'File path relative to workspace' } },
          required: ['path'],
        },
      },
      {
        name: 'filesystem_write',
        description: 'Write content to a file in the workspace',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to workspace' },
            content: { type: 'string', description: 'File content' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'filesystem_list',
        description: 'List files in a directory',
        input_schema: {
          type: 'object',
          properties: { path: { type: 'string', description: 'Directory path relative to workspace' } },
          required: ['path'],
        },
      },
    ];
  }
}
