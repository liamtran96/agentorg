import fs from 'node:fs';
import path from 'node:path';

const TEMPLATES: Record<string, { description: string; agents: Record<string, any> }> = {
  'content-agency': {
    description: 'SEO content marketing agency',
    agents: {
      ceo: { name: 'Alex', runtime: 'claude-agent-sdk', model: 'claude-sonnet-4-20250514', budget: 50, reports_to: 'board', skills: ['browser', 'email', 'calendar'], personality: 'You are Alex, the CEO. Strategic, decisive, and focused on results.' },
      content_writer: { name: 'Maya', runtime: 'claude-agent-sdk', model: 'claude-sonnet-4-20250514', budget: 30, reports_to: 'ceo', skills: ['browser', 'filesystem'], personality: 'You are Maya, a research-driven content writer. Casual-professional tone.' },
      seo_analyst: { name: 'Kai', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 15, reports_to: 'ceo', skills: ['browser'], personality: 'You are Kai, an SEO specialist. Data-driven, keyword-focused.' },
      support: { name: 'Linh', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 20, reports_to: 'ceo', skills: ['email', 'crm'], personality: 'You are Linh, the support lead. Friendly, patient, solution-oriented.' },
      social_media: { name: 'Sam', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 10, reports_to: 'ceo', skills: ['messaging'], personality: 'You are Sam, the social media manager. Punchy, engaging, trend-aware.' },
    },
  },
  'ecommerce-support': {
    description: 'E-commerce customer service team',
    agents: {
      ceo: { name: 'Alex', runtime: 'claude-agent-sdk', model: 'claude-sonnet-4-20250514', budget: 30, reports_to: 'board', skills: ['email', 'browser'], personality: 'You are Alex, the manager. You handle escalations and daily reviews.' },
      support: { name: 'Linh', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 25, reports_to: 'ceo', skills: ['email', 'crm'], personality: 'You are Linh, support agent. Friendly, fast, checks order history before replying.' },
      sales: { name: 'James', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 20, reports_to: 'ceo', skills: ['email', 'crm'], personality: 'You are James, sales agent. You recommend products and handle upsells.' },
      social: { name: 'Sam', runtime: 'anthropic-api', model: 'claude-haiku-4-5-20251001', budget: 10, reports_to: 'ceo', skills: ['messaging'], personality: 'You are Sam. You reply to DMs and comments quickly and warmly.' },
    },
  },
};

export async function init(): Promise<void> {
  const prompts = (await import('prompts')).default;

  console.log('\n  Welcome to AgentOrg!\n');

  const response = await prompts([
    {
      type: 'text',
      name: 'companyName',
      message: 'Company name?',
      initial: 'My AI Agency',
    },
    {
      type: 'select',
      name: 'template',
      message: 'Template?',
      choices: Object.entries(TEMPLATES).map(([key, val]) => ({
        title: key,
        description: val.description,
        value: key,
      })),
    },
    {
      type: 'text',
      name: 'apiKey',
      message: 'Anthropic API key? (sk-ant-...)',
    },
  ]);

  if (!response.template) {
    console.log('Setup cancelled.');
    return;
  }

  const template = TEMPLATES[response.template];

  // Generate YAML config
  const configLines = [
    `company:`,
    `  name: "${response.companyName}"`,
    `  description: "${template.description}"`,
    `  timezone: "UTC"`,
    `  business_hours: "09:00-18:00"`,
    ``,
    `org:`,
  ];

  for (const [id, agent] of Object.entries(template.agents)) {
    configLines.push(`  ${id}:`);
    configLines.push(`    name: "${agent.name}"`);
    configLines.push(`    runtime: ${agent.runtime}`);
    configLines.push(`    model: ${agent.model}`);
    configLines.push(`    budget: ${agent.budget}`);
    configLines.push(`    reports_to: ${agent.reports_to}`);
    configLines.push(`    skills: [${agent.skills.join(', ')}]`);
    configLines.push(`    personality: |`);
    configLines.push(`      ${agent.personality}`);
    configLines.push(``);
  }

  // Write files
  const configPath = path.join(process.cwd(), 'agentorg.config.yaml');
  fs.writeFileSync(configPath, configLines.join('\n'), 'utf-8');

  const envPath = path.join(process.cwd(), '.env');
  fs.writeFileSync(envPath, `ANTHROPIC_API_KEY=${response.apiKey || 'sk-ant-YOUR-KEY'}\n`, 'utf-8');

  const agentCount = Object.keys(template.agents).length;

  console.log(`
  Your company "${response.companyName}" is ready!

  ${agentCount} agents created:
${Object.entries(template.agents)
  .map(([id, a]: [string, any]) => `    ${a.name} (${id}) — ${a.runtime}`)
  .join('\n')}

  Files created:
    agentorg.config.yaml — company config
    .env                 — API keys

  Next: npx agentorg start
`);
}
