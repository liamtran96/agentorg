"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import type { AuditEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ScrollText } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const decisionColors: Record<string, string> = {
  ALLOWED: "bg-green-100 text-green-800 border-green-200",
  BLOCKED: "bg-red-100 text-red-800 border-red-200",
  QUEUED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  REWRITTEN: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function ActivityPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<AuditEntry[]>("/api/audit");
        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load activity</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground mt-1">
          Audit log of all agent actions and orchestrator decisions
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {sorted.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            message="No activity yet"
            description="Actions will appear here as agents operate."
          />
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <span className="text-xs text-muted-foreground font-mono w-14 shrink-0">
                  {timeAgo(entry.timestamp)}
                </span>
                <span className="text-sm font-medium shrink-0 w-28 truncate">
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
  );
}
