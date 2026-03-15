// ─── Runtime ───────────────────────────────────────────────────────────────

export type RuntimeType =
  | 'claude-agent-sdk'
  | 'anthropic-api'
  | 'openclaw'
  | 'codex'
  | 'http'
  | 'script';

// ─── Agent ─────────────────────────────────────────────────────────────────

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  runtime: RuntimeType;
  model?: string;
  personality: string;
  budget: number;
  reportsTo: string;
  skills: string[];
  heartbeat?: HeartbeatConfig;
  endpoint?: string;
  allowedTools?: string[];
  cwd?: string;
  sla?: SLAConfig;
}

/** @deprecated Use AgentConfig instead */
export type Agent = AgentConfig;

export interface SLAConfig {
  responseTime?: number; // minutes
  resolutionTime?: number; // minutes
}

// ─── Heartbeat ─────────────────────────────────────────────────────────────

export interface HeartbeatConfig {
  schedule: string; // Cron expression
  tasks: string[];
  reactive?: ReactiveHeartbeat[];
}

export interface ReactiveHeartbeat {
  trigger: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface HeartbeatResult {
  agentId: string;
  runtime: RuntimeType;
  timestamp: Date;
  checked: {
    taskQueue: number;
    inbox: number;
    deadlines: number;
    alerts: number;
  };
  acted: {
    tasksCompleted: number;
    messagesReplied: number;
    escalations: string[];
    delegations: string[];
  };
  tokensUsed: number;
  nextHeartbeat: Date;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'review';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  result?: string;
  tokensUsed?: number;
  cost?: number;
}

export interface TaskContext {
  personality: string;
  model: string;
  skills: string[];
  allowedTools?: string[];
  cwd?: string;
  memory?: Record<string, unknown>;
  budget: number;
}

export interface TaskResult {
  success: boolean;
  output: string;
  tokensUsed: number;
  cost: number;
  actions: ActionRecord[];
  error?: string;
}

// ─── Actions & Orchestrator ────────────────────────────────────────────────

export interface ActionRecord {
  id: string;
  agentId: string;
  type: string;
  description: string;
  timestamp: Date;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  orchestratorDecision: OrchestratorDecision;
  cost?: number;
}

export type OrchestratorDecision = 'ALLOWED' | 'BLOCKED' | 'REWRITTEN' | 'QUEUED';

export interface OrchestratorResult {
  decision: OrchestratorDecision;
  reason: string;
  checkResults: {
    permission: boolean;
    scope: boolean;
    budget: boolean;
    rateLimit?: boolean;
    safety?: boolean;
    approval?: boolean;
  };
  rewrittenAction?: ActionRecord;
}

// ─── Company Config ────────────────────────────────────────────────────────

export interface CompanyConfig {
  company: {
    name: string;
    description: string;
    timezone: string;
    businessHours: string;
    outOfHoursReply?: string;
  };
  org: Record<string, AgentConfig>;
  governance?: GovernanceConfig;
  safety?: SafetyConfig;
  heartbeats?: Record<string, HeartbeatConfig>;
  providers?: ProvidersConfig;
  inbox?: InboxConfig;
  crm?: CRMConfig;
  deadlines?: DeadlinesConfig;
  performance?: PerformanceConfig;
  conflicts?: ConflictsConfig;
  workflows?: WorkflowDefinition[];
}

// ─── Governance ────────────────────────────────────────────────────────────

export interface GovernanceConfig {
  rules: GovernanceRule[];
}

export interface GovernanceRule {
  action: string;
  condition?: string;
  requires: 'auto_approve' | 'ceo_approval' | 'board_approval';
  threshold?: number;
  above?: number;
}

// ─── Safety ────────────────────────────────────────────────────────────────

export interface SafetyConfig {
  factCheck?: FactCheckConfig;
  brandCheck?: BrandCheckConfig;
  hallucinationGuard?: HallucinationGuardConfig;
  blockMode?: 'block' | 'warn' | 'rewrite';
  threadIsolation?: ThreadIsolationConfig;
}

export interface FactCheckConfig {
  enabled: boolean;
  sourceOfTruth: string[]; // paths to source-of-truth files
  strictMode?: boolean;
}

export interface BrandCheckConfig {
  enabled: boolean;
  blockedWords: string[];
  requiredSignOff?: string;
  enforceTone?: boolean;
  brandVoice?: string;
}

export interface HallucinationGuardConfig {
  enabled: boolean;
  mode: 'block' | 'warn';
  sources: ('source_of_truth' | 'crm_records' | 'recent_conversations')[];
}

export interface ThreadIsolationConfig {
  enabled: boolean;
  maxConcurrentPerAgent: number;
}

// ─── Inbox ─────────────────────────────────────────────────────────────────

export interface InboxConfig {
  routing: RoutingRule[];
  defaultAgent?: string;
}

export interface RoutingRule {
  match: string; // regex or keyword
  assignTo: string; // agent ID
  priority?: TaskPriority;
}

// ─── CRM ───────────────────────────────────────────────────────────────────

export interface CRMConfig {
  enabled: boolean;
  autoCreateContacts?: boolean;
  dealStages?: string[];
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  tags?: string[];
  interactions: Interaction[];
  createdAt: Date;
  updatedAt: Date;
  lifetimeValue?: number;
}

export interface Interaction {
  id: string;
  type: 'email' | 'chat' | 'call' | 'meeting';
  agentId: string;
  summary: string;
  timestamp: Date;
}

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  contactId: string;
  title: string;
  value: number;
  stage: DealStage;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

// ─── Skills ────────────────────────────────────────────────────────────────

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface SkillResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ─── Audit & Incidents ─────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  action: string;
  decision: OrchestratorDecision;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentRecord {
  id: string;
  timestamp: Date;
  agentId: string;
  type: 'safety_violation' | 'budget_exceeded' | 'sla_breach' | 'error' | 'escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
  resolvedAt?: Date;
}

// ─── Performance ───────────────────────────────────────────────────────────

export interface PerformanceConfig {
  trackMetrics: boolean;
  weeklyReports?: boolean;
}

export interface PerformanceMetrics {
  agentId: string;
  period: { start: Date; end: Date };
  tasksCompleted: number;
  tasksFailed: number;
  avgResponseTime: number;
  tokensUsed: number;
  totalCost: number;
  qualityScore?: number;
}

export interface AgentPerformanceReport {
  agentId: string;
  agentName: string;
  period: { start: Date; end: Date };
  metrics: PerformanceMetrics;
  summary: string;
  recommendations: string[];
}

// ─── Workflows ─────────────────────────────────────────────────────────────

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers?: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'gate' | 'parallel' | 'condition';
  agentId?: string;
  skill?: string;
  action?: string;
  params?: Record<string, unknown>;
  dependsOn?: string[];
  gate?: WorkflowGate;
  timeout?: number; // milliseconds
  children?: WorkflowStep[];
}

export interface WorkflowGate {
  type: 'approval' | 'condition' | 'timer';
  approver?: string;
  condition?: string;
  timeout?: number;
}

// ─── Providers ─────────────────────────────────────────────────────────────

export interface ProvidersConfig {
  anthropic?: { apiKey?: string; defaultModel?: string };
  bedrock?: { region?: string; profile?: string };
  vertex?: { project?: string; location?: string };
}

// ─── Deadlines & Conflicts ─────────────────────────────────────────────────

export interface DeadlinesConfig {
  enabled: boolean;
  warningThreshold?: number; // hours before deadline
  escalateOnMiss?: boolean;
}

export interface ConflictsConfig {
  resolution: 'manager_decides' | 'first_come' | 'priority';
}
