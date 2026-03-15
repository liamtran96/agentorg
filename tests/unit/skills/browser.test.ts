import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock puppeteer before importing BrowserSkill
const mockPage = {
  goto: vi.fn(),
  content: vi.fn(),
  evaluate: vi.fn(),
  screenshot: vi.fn(),
  $eval: vi.fn(),
  $$eval: vi.fn(),
  close: vi.fn(),
  setViewport: vi.fn(),
  waitForSelector: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn(() => mockPage),
  close: vi.fn(),
};

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve(mockBrowser)),
  },
}));

import { BrowserSkill } from '@agentorg/skills';

describe('BrowserSkill', () => {
  let skill: BrowserSkill;

  beforeEach(() => {
    vi.clearAllMocks();
    skill = new BrowserSkill();
  });

  it('should have correct metadata', () => {
    expect(skill.id).toBe('browser');
    expect(skill.name).toBe('Browser');
    expect(skill.capabilities).toContain('navigate');
    expect(skill.capabilities).toContain('search');
    expect(skill.capabilities).toContain('extract');
    expect(skill.capabilities).toContain('screenshot');
  });

  describe('navigate action', () => {
    it('should navigate to URL and return page content', async () => {
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.content.mockResolvedValue('<html><body>Hello</body></html>');

      const result = await skill.execute('navigate', { url: 'https://example.com' });

      expect(result.success).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect((result.data as { content: string }).content).toContain('Hello');
    });

    it('should handle navigation errors gracefully', async () => {
      mockPage.goto.mockRejectedValue(new Error('net::ERR_NAME_NOT_RESOLVED'));

      const result = await skill.execute('navigate', { url: 'https://doesnotexist.invalid' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('search action', () => {
    it('should return search results', async () => {
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.$$eval.mockResolvedValue([
        { title: 'Result 1', url: 'https://r1.com', snippet: 'First result' },
        { title: 'Result 2', url: 'https://r2.com', snippet: 'Second result' },
      ]);

      const result = await skill.execute('search', { query: 'agentorg framework' });

      expect(result.success).toBe(true);
      const data = result.data as Array<{ title: string; url: string }>;
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('title');
      expect(data[0]).toHaveProperty('url');
    });
  });

  describe('extract action', () => {
    it('should extract text from a page element', async () => {
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.$eval.mockResolvedValue('Extracted text content');

      const result = await skill.execute('extract', {
        url: 'https://example.com',
        selector: 'article',
      });

      expect(result.success).toBe(true);
      expect((result.data as { text: string }).text).toBe('Extracted text content');
    });

    it('should handle missing selector gracefully', async () => {
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.$eval.mockRejectedValue(new Error('Element not found'));

      const result = await skill.execute('extract', {
        url: 'https://example.com',
        selector: '.nonexistent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('screenshot action', () => {
    it('should return image buffer', async () => {
      const fakeBuffer = Buffer.from('fake-png-data');
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.screenshot.mockResolvedValue(fakeBuffer);

      const result = await skill.execute('screenshot', { url: 'https://example.com' });

      expect(result.success).toBe(true);
      expect(Buffer.isBuffer((result.data as { image: Buffer }).image)).toBe(true);
    });

    it('should support fullPage option', async () => {
      const fakeBuffer = Buffer.from('fake-png-data');
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.screenshot.mockResolvedValue(fakeBuffer);

      await skill.execute('screenshot', { url: 'https://example.com', fullPage: true });

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ fullPage: true }),
      );
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions for all capabilities', () => {
      const tools = skill.getToolDefinitions();

      expect(tools.length).toBeGreaterThanOrEqual(4);
      const names = tools.map((t) => t.name);
      expect(names).toContain('browser_navigate');
      expect(names).toContain('browser_search');
      expect(names).toContain('browser_extract');
      expect(names).toContain('browser_screenshot');

      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });
  });

  describe('unknown action', () => {
    it('should return success: false for unknown action', async () => {
      const result = await skill.execute('print', { url: 'https://example.com' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
