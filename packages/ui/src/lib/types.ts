export interface Agent {
  id: string;
  name: string;
  role: string;
  runtime: string;
  model?: string;
  personality?: string;
  budget: number;
  reportsTo: string;
  skills: string[];
  heartbeat?: {
    schedule: string;
    tasks: string[];
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'review';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  result?: string;
}

export interface BudgetEntry {
  spent: number;
  limit: number;
  remaining: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  agentId: string;
  action: string;
  decision: 'ALLOWED' | 'BLOCKED' | 'QUEUED' | 'REWRITTEN';
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface GovernanceRule {
  action: string;
  condition?: string;
  requires: 'auto_approve' | 'ceo_approval' | 'board_approval';
  threshold?: number;
  above?: number;
}

export interface CompanyConfig {
  company: {
    name: string;
    description: string;
    timezone: string;
    businessHours: string;
    outOfHoursReply?: string;
  };
  org: Record<string, Agent>;
  governance?: {
    rules: GovernanceRule[];
  };
  safety?: Record<string, unknown>;
}
