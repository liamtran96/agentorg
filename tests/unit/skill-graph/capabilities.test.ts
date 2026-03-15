import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityTree } from '@agentorg/skill-graph';
import type { SkillDefinition, WorkflowDefinition } from '@agentorg/core';

describe('CapabilityTree', () => {
  let tree: CapabilityTree;

  const browserSkill: SkillDefinition = {
    id: 'skill-browser',
    name: 'Browser',
    description: 'Web browsing and scraping',
    version: '1.0.0',
    capabilities: ['web:browse', 'web:scrape', 'web:screenshot'],
  };

  const emailSkill: SkillDefinition = {
    id: 'skill-email',
    name: 'Email',
    description: 'Send and receive emails',
    version: '1.0.0',
    capabilities: ['email:send', 'email:read', 'email:draft'],
  };

  const crmSkill: SkillDefinition = {
    id: 'skill-crm',
    name: 'CRM',
    description: 'Customer relationship management',
    version: '1.0.0',
    capabilities: ['crm:create-contact', 'crm:update-contact', 'crm:search'],
  };

  beforeEach(() => {
    tree = new CapabilityTree();
  });

  it('should build capability tree from installed skills', () => {
    const result = tree.build([browserSkill, emailSkill]);

    expect(result.capabilities).toContain('web:browse');
    expect(result.capabilities).toContain('web:scrape');
    expect(result.capabilities).toContain('email:send');
    expect(result.capabilities).toContain('email:read');
    expect(result.skills).toHaveLength(2);
  });

  it('should detect missing capabilities for a workflow', () => {
    tree.build([browserSkill, emailSkill]);

    const workflow: WorkflowDefinition = {
      id: 'wf-outreach',
      name: 'Customer Outreach',
      description: 'Research and email prospects',
      steps: [
        {
          id: 's1',
          name: 'Research prospect',
          type: 'task',
          skill: 'browser',
          action: 'web:browse',
        },
        {
          id: 's2',
          name: 'Update CRM',
          type: 'task',
          skill: 'crm',
          action: 'crm:create-contact',
          dependsOn: ['s1'],
        },
        {
          id: 's3',
          name: 'Send email',
          type: 'task',
          skill: 'email',
          action: 'email:send',
          dependsOn: ['s2'],
        },
      ],
    };

    const missing = tree.findMissing(workflow, tree.getCapabilities());

    expect(missing).toContain('crm:create-contact');
    expect(missing).not.toContain('web:browse');
    expect(missing).not.toContain('email:send');
  });

  it('should return empty array when all capabilities are present', () => {
    tree.build([browserSkill, emailSkill, crmSkill]);

    const workflow: WorkflowDefinition = {
      id: 'wf-simple',
      name: 'Simple Browse',
      description: 'Just browse the web',
      steps: [
        { id: 's1', name: 'Browse', type: 'task', skill: 'browser', action: 'web:browse' },
      ],
    };

    const missing = tree.findMissing(workflow, tree.getCapabilities());
    expect(missing).toHaveLength(0);
  });

  it('should suggest skills to install for missing capabilities', () => {
    tree.build([browserSkill]);

    // Register CRM skill as available (but not installed)
    tree.registerAvailable(crmSkill);
    tree.registerAvailable(emailSkill);

    const suggestions = tree.suggestSkills(['crm:create-contact', 'email:send']);

    expect(suggestions).toHaveLength(2);

    const suggestionIds = suggestions.map((s: SkillDefinition) => s.id);
    expect(suggestionIds).toContain('skill-crm');
    expect(suggestionIds).toContain('skill-email');
  });

  it('should return empty suggestions when no matching skills exist', () => {
    tree.build([browserSkill]);

    const suggestions = tree.suggestSkills(['unknown:capability']);
    expect(suggestions).toHaveLength(0);
  });

  it('should register new skills in the graph', () => {
    tree.build([browserSkill]);

    tree.register(emailSkill);

    const capabilities = tree.getCapabilities();
    expect(capabilities).toContain('email:send');
    expect(capabilities).toContain('email:read');
    expect(capabilities).toContain('web:browse');
  });

  it('should not duplicate capabilities when registering same skill twice', () => {
    tree.build([browserSkill]);
    tree.register(browserSkill);

    const capabilities = tree.getCapabilities();
    const browseCount = capabilities.filter((c: string) => c === 'web:browse').length;
    expect(browseCount).toBe(1);
  });
});
