"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import type { Agent, Task, BudgetEntry, AuditEntry } from "@/lib/types";
import { MetricCard } from "@/components/MetricCard";
import { IssueRow } from "@/components/IssueRow";
import { EmptyState } from "@/components/EmptyState";
import { Users, Loader, DollarSign, ShieldCheck, Inbox, Activity } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const decisionColors: Record<string, string> = {
  ALLOWED: "bg-green-100 text-green-800 border-green-200",
  BLOCKED: "bg-red-100 text-red-800 border-red-200",
  QUEUED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  REWRITTEN: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [budget, setBudget] = useState<Record<string, BudgetEntry>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [agentsData, tasksData, budgetData, auditData] = await Promise.all([
          fetchApi<Agent[]>("/api/agents"),
          fetchApi<Task[]>("/api/tasks"),
          fetchApi<Record<string, BudgetEntry>>("/api/budget"),
          fetchApi<AuditEntry[]>("/api/audit").catch(() => [] as AuditEntry[]),
        ]);
        setAgents(agentsData);
        setTasks(tasksData);
        setBudget(budgetData);
        setAudit(auditData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const totalSpent = Object.values(budget).reduce((sum, b) => sum + b.spent, 0);
  const totalLimit = Object.values(budget).reduce((sum, b) => sum + b.limit, 0);
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const recentAudit = [...audit]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your AI agent organization
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Agents"
          value={agents.length}
          subtitle="Active in organization"
          icon={Users}
        />
        <MetricCard
          title="In Progress"
          value={inProgressCount}
          subtitle={`${tasks.length} total issues`}
          icon={Loader}
        />
        <MetricCard
          title="Monthly Spend"
          value={`$${totalSpent.toFixed(2)}`}
          subtitle={`/ $${totalLimit.toFixed(2)}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Pending Approvals"
          value={0}
          subtitle="No approvals waiting"
          icon={ShieldCheck}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Recent Activity
          </h2>
          <div className="rounded-xl border border-border bg-card">
            {recentAudit.length === 0 ? (
              <EmptyState icon={Activity} message="No activity yet" />
            ) : (
              <div className="divide-y divide-border">
                {recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">
                      {timeAgo(entry.timestamp)}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {entry.agentId}
                    </span>
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {entry.action}
                    </span>
                    <Badge
                      variant="outline"
                      className={decisionColors[entry.decision] || ""}
                    >
                      {entry.decision}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Issues */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Recent Issues
          </h2>
          <div className="rounded-xl border border-border bg-card">
            {recentTasks.length === 0 ? (
              <EmptyState icon={Inbox} message="No issues yet" />
            ) : (
              recentTasks.map((task) => {
                const agent = agents.find((a) => a.id === task.assignedTo);
                return (
                  <IssueRow
                    key={task.id}
                    task={task}
                    agentName={agent?.name}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
