"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi, putApi } from "@/lib/api";
import type { Agent, Task } from "@/lib/types";
import { StatusIcon } from "@/components/StatusIcon";
import { PriorityIcon } from "@/components/PriorityIcon";
import { EmptyState } from "@/components/EmptyState";
import { NewIssueDialog } from "@/components/NewIssueDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Inbox } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const statusOrder: Task["status"][] = [
  "pending",
  "in_progress",
  "review",
  "completed",
  "failed",
  "blocked",
];

export default function IssuesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auto-open dialog when navigated with ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogOpen(true);
      // Clean up the URL param without a full navigation
      router.replace("/issues");
    }
  }, [searchParams, router]);

  const loadData = useCallback(async () => {
    try {
      const [tasksData, agentsData] = await Promise.all([
        fetchApi<Task[]>("/api/tasks"),
        fetchApi<Agent[]>("/api/agents"),
      ]);
      setTasks(tasksData);
      setAgents(agentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function cycleStatus(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];
    try {
      await putApi(`/api/tasks/${taskId}/status`, { status: nextStatus });
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const agent = agents.find((a) => a.id === task.assignedTo);
    return (
      task.title.toLowerCase().includes(q) ||
      task.description?.toLowerCase().includes(q) ||
      agent?.name.toLowerCase().includes(q) ||
      task.status.toLowerCase().includes(q) ||
      task.priority.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load issues</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Issue
        </Button>
      </div>

      {/* Search / Filter bar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter issues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredTasks.length} issue{filteredTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Issue list */}
      <div className="rounded-xl border border-border bg-card">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={Inbox}
            message="No issues found"
            description={search ? "Try a different search." : "Create your first issue to get started."}
          />
        ) : (
          filteredTasks.map((task) => {
            const agent = agents.find((a) => a.id === task.assignedTo);
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
              >
                <StatusIcon
                  status={task.status}
                  onClick={() => cycleStatus(task.id)}
                />
                <span className="font-medium text-sm truncate flex-1">
                  {task.title}
                </span>
                {agent && (
                  <span className="text-muted-foreground text-xs shrink-0">
                    {agent.name}
                  </span>
                )}
                <PriorityIcon priority={task.priority} />
                <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                  {timeAgo(task.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <NewIssueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agents={agents}
        onCreated={loadData}
      />
    </div>
  );
}
