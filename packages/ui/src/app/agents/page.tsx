"use client";

import { useEffect, useState } from "react";
import { fetchApi, postApi } from "@/lib/api";
import type { Agent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Users, Zap } from "lucide-react";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<Agent[]>("/api/agents");
        setAgents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function triggerHeartbeat(agentId: string) {
    setTriggeringId(agentId);
    try {
      await postApi(`/api/agents/${agentId}/heartbeat`, {});
    } catch {
      // Silently handle
    } finally {
      setTriggeringId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading agents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load agents</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted-foreground mt-1">
          Manage and monitor your AI agents
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {agents.length === 0 ? (
          <EmptyState
            icon={Users}
            message="No agents configured"
            description="Add agents to your agentorg.config.yaml to get started."
          />
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-accent border-b border-border last:border-b-0 transition-colors"
            >
              {/* Avatar */}
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Name & role */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{agent.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {agent.runtime}
                  </Badge>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E] shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {agent.role}
                </p>
              </div>

              {/* Skills */}
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                {agent.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {agent.skills.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{agent.skills.length - 3}
                  </span>
                )}
              </div>

              {/* Heartbeat trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => triggerHeartbeat(agent.id)}
                disabled={triggeringId === agent.id}
                title="Trigger heartbeat"
              >
                <Zap className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
