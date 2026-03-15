import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import type { Skill, SkillResult, ToolDefinition } from './base.js';

/**
 * Browser skill — navigate, search, extract content, and take screenshots.
 * Uses Puppeteer under the hood.
 */
export class BrowserSkill implements Skill {
  readonly id = 'browser';
  readonly name = 'Browser';
  readonly description = 'Navigate web pages, search, extract content, and take screenshots';
  readonly version = '0.1.0';
  capabilities = ['navigate', 'search', 'extract', 'screenshot'];

  private browser: Browser | null = null;

  /** Lazily launch a browser instance */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch();
    }
    return this.browser;
  }

  /** Get a fresh page from the browser */
  private async getPage(): Promise<Page> {
    const browser = await this.getBrowser();
    return browser.newPage();
  }

  /** Close the browser if it's open */
  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<SkillResult> {
    switch (action) {
      case 'navigate':
        return this.navigate(params);
      case 'search':
        return this.search(params);
      case 'extract':
        return this.extract(params);
      case 'screenshot':
        return this.takeScreenshot(params);
      default:
        return { success: false, data: null, error: `Unknown action: ${action}` };
    }
  }

  private async navigate(params: Record<string, unknown>): Promise<SkillResult> {
    const page = await this.getPage();
    try {
      await page.goto(params.url as string, { waitUntil: 'networkidle2' });
      const content = await page.content();
      return { success: true, data: { content } };
    } catch (err) {
      return { success: false, data: null, error: `Navigation failed: ${(err as Error).message}` };
    } finally {
      await page.close();
    }
  }

  private async search(params: Record<string, unknown>): Promise<SkillResult> {
    const page = await this.getPage();
    try {
      const query = encodeURIComponent(params.query as string);
      await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'networkidle2' });
      // Use $$eval to extract search result elements from the page
      const results = await page.$$eval('.g', (els: Element[]) =>
        els.map((el) => ({
          title: el.querySelector('h3')?.textContent || '',
          url: el.querySelector('a')?.href || '',
          snippet: el.querySelector('.VwiC3b')?.textContent || '',
        })),
      );
      return { success: true, data: results };
    } catch (err) {
      return { success: false, data: null, error: `Search failed: ${(err as Error).message}` };
    } finally {
      await page.close();
    }
  }

  private async extract(params: Record<string, unknown>): Promise<SkillResult> {
    const page = await this.getPage();
    try {
      await page.goto(params.url as string, { waitUntil: 'networkidle2' });
      // Use Puppeteer's $eval to get textContent from the matching selector
      const text = await page.$eval(
        params.selector as string,
        (el: Element) => el.textContent || '',
      );
      return { success: true, data: { text } };
    } catch (err) {
      return { success: false, data: null, error: `Extraction failed: ${(err as Error).message}` };
    } finally {
      await page.close();
    }
  }

  private async takeScreenshot(params: Record<string, unknown>): Promise<SkillResult> {
    const page = await this.getPage();
    try {
      await page.goto(params.url as string, { waitUntil: 'networkidle2' });
      const screenshotOptions: Record<string, unknown> = { type: 'png' };
      if (params.fullPage) {
        screenshotOptions.fullPage = true;
      }
      const image = await page.screenshot(screenshotOptions);
      return { success: true, data: { image } };
    } catch (err) {
      return { success: false, data: null, error: `Screenshot failed: ${(err as Error).message}` };
    } finally {
      await page.close();
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'browser_navigate',
        description: 'Navigate to a URL and return page content',
        input_schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
          },
          required: ['url'],
        },
      },
      {
        name: 'browser_search',
        description: 'Search the web and return results',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'browser_extract',
        description: 'Extract text content from a page element using a CSS selector',
        input_schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
            selector: { type: 'string', description: 'CSS selector to extract from' },
          },
          required: ['url', 'selector'],
        },
      },
      {
        name: 'browser_screenshot',
        description: 'Take a screenshot of a web page',
        input_schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to screenshot' },
            fullPage: { type: 'boolean', description: 'Capture full page' },
          },
          required: ['url'],
        },
      },
    ];
  }
}
