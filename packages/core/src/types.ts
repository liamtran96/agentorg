export type RuntimeType =
  | 'claude-agent-sdk'
  | 'anthropic-api'
  | 'openclaw'
  | 'codex'
  | 'http'
  | 'script';

export interface Agent {
  id: string;
  name: string;
  role: string;
  runtime: RuntimeType;
  model?: string;
  personality: string;
  budget: number;
  reportsTo: string;
  skills: string[];
  heartbeat: HeartbeatConfig;
}

export interface HeartbeatConfig {
  schedule: string; // Cron expression
  tasks: string[];
  reactive?: ReactiveHeartbeat[];
}

export interface ReactiveHeartbeat {
  trigger: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface Task {
  id: string;
  description: string;
  agentId: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  priority: number;
  createdBy: string;
  createdAt: Date;
  deadline?: Date;
}

export interface TaskResult {
  success: boolean;
  result: unknown;
  tokensUsed: number;
  error?: string;
}

export interface CompanyConfig {
  company: {
    name: string;
    description: string;
    timezone: string;
    businessHours: string;
  };
  org: Record<string, Agent>;
  governance: GovernanceConfig;
  heartbeats: Record<string, HeartbeatConfig>;
}

export interface GovernanceConfig {
  rules: GovernanceRule[];
}

export interface GovernanceRule {
  action: string;
  condition: string;
  outcome: 'auto_approve' | 'require_approval' | 'block';
}
