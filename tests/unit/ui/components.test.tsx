// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Test the shared utility components directly (not Next.js page components)

describe('StatusIcon', () => {
  it('renders a colored dot for each status', async () => {
    // Import directly from source to avoid Next.js routing deps
    const { StatusIcon } = await import('../../../packages/ui/src/components/StatusIcon');

    const { container } = render(<StatusIcon status="pending" />);
    const dot = container.querySelector('span');
    expect(dot).toBeTruthy();
    expect(dot?.title).toBe('pending');
  });

  it('renders default color for unknown status', async () => {
    const { StatusIcon } = await import('../../../packages/ui/src/components/StatusIcon');

    const { container } = render(<StatusIcon status="unknown" />);
    const dot = container.querySelector('span');
    expect(dot).toBeTruthy();
  });
});

describe('MetricCard', () => {
  it('renders title and value', async () => {
    const { MetricCard } = await import('../../../packages/ui/src/components/MetricCard');
    const { Users } = await import('lucide-react');

    render(<MetricCard title="Agents" value={6} subtitle="Active" icon={Users} />);
    expect(screen.getByText('Agents')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders message', async () => {
    const { EmptyState } = await import('../../../packages/ui/src/components/EmptyState');
    const { Inbox } = await import('lucide-react');

    render(<EmptyState icon={Inbox} message="No items yet" />);
    expect(screen.getByText('No items yet')).toBeTruthy();
  });

  it('renders description when provided', async () => {
    const { EmptyState } = await import('../../../packages/ui/src/components/EmptyState');
    const { Inbox } = await import('lucide-react');

    render(<EmptyState icon={Inbox} message="Empty" description="Add some items" />);
    expect(screen.getByText('Add some items')).toBeTruthy();
  });
});

describe('PriorityIcon', () => {
  it('renders priority badge', async () => {
    const { PriorityIcon } = await import('../../../packages/ui/src/components/PriorityIcon');

    render(<PriorityIcon priority="high" />);
    expect(screen.getByText('high')).toBeTruthy();
  });
});

describe('IssueRow', () => {
  it('renders task title and agent name', async () => {
    const { IssueRow } = await import('../../../packages/ui/src/components/IssueRow');

    const task = {
      id: 'task_1',
      title: 'Write blog post',
      description: 'A test task',
      assignedTo: 'writer',
      createdBy: 'ceo',
      status: 'pending' as const,
      priority: 'high' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<IssueRow task={task} agentName="Maya" />);
    expect(screen.getByText('Write blog post')).toBeTruthy();
    expect(screen.getByText('Maya')).toBeTruthy();
  });
});
