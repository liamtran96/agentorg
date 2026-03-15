"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import type { Agent, BudgetEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { DollarSign, FolderOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CostsPage() {
  const [budget, setBudget] = useState<Record<string, BudgetEntry>>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      try {
        const [budgetData, agentsData] = await Promise.all([
          fetchApi<Record<string, BudgetEntry>>("/api/budget"),
          fetchApi<Agent[]>("/api/agents"),
        ]);
        setBudget(budgetData);
        setAgents(agentsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load costs");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading costs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load costs</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const entries = Object.entries(budget);
  const totalSpent = entries.reduce((sum, [, b]) => sum + b.spent, 0);
  const totalLimit = entries.reduce((sum, [, b]) => sum + b.limit, 0);
  const totalUsage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  function getProgressColor(pct: number): string {
    if (pct > 80) return "bg-red-500";
    if (pct > 60) return "bg-yellow-500";
    return "bg-green-500";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Costs</h1>
        <p className="text-muted-foreground mt-1">
          Monitor spending across all agents
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Spend
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold">
              {formatCurrency(totalSpent)}
            </span>
            <span className="text-muted-foreground text-sm">
              / {formatCurrency(totalLimit)}
            </span>
          </div>
          <Progress
            value={totalUsage}
            className="h-3"
            indicatorClassName={getProgressColor(totalUsage)}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {formatCurrency(totalLimit - totalSpent)} remaining ({totalUsage.toFixed(1)}% used)
          </p>
        </CardContent>
      </Card>

      {/* By Agent */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
          By Agent
        </h2>
        <div className="rounded-xl border border-border bg-card">
          {entries.length === 0 ? (
            <EmptyState icon={DollarSign} message="No budget data available" />
          ) : (
            entries.map(([agentId, entry]) => {
              const agent = agents.find((a) => a.id === agentId);
              const usage = entry.limit > 0 ? (entry.spent / entry.limit) * 100 : 0;
              return (
                <div
                  key={agentId}
                  className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0"
                >
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold">
                      {(agent?.name || agentId).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {agent?.name || agentId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agent?.role || "Agent"}
                    </p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <Progress
                      value={usage}
                      className="h-1.5"
                      indicatorClassName={getProgressColor(usage)}
                    />
                  </div>
                  <div className="text-right shrink-0 w-24">
                    <p className="text-sm font-medium">
                      {formatCurrency(entry.spent)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / {formatCurrency(entry.limit)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* By Project (placeholder) */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
          By Project
        </h2>
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={FolderOpen}
            message="No project data yet"
            description="Project-level cost tracking coming soon."
          />
        </div>
      </div>
    </div>
  );
}
