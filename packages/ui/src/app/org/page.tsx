"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import type { Agent } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { Network } from "lucide-react";

interface OrgNode {
  agent: Agent;
  children: OrgNode[];
}

function buildTree(agents: Agent[]): OrgNode[] {
  const agentMap = new Map<string, Agent>();
  agents.forEach((a) => agentMap.set(a.id, a));

  const childrenMap = new Map<string, OrgNode[]>();
  const roots: OrgNode[] = [];

  agents.forEach((agent) => {
    const node: OrgNode = { agent, children: [] };
    if (!agent.reportsTo || agent.reportsTo === "" || agent.reportsTo === "none") {
      roots.push(node);
    } else {
      if (!childrenMap.has(agent.reportsTo)) {
        childrenMap.set(agent.reportsTo, []);
      }
      childrenMap.get(agent.reportsTo)!.push(node);
    }
    // Store the node so we can attach children
    if (!childrenMap.has(agent.id)) {
      childrenMap.set(agent.id, []);
    }
  });

  // Rebuild with a proper recursive approach
  function buildNode(agent: Agent): OrgNode {
    const children = agents
      .filter((a) => a.reportsTo === agent.id)
      .map((child) => buildNode(child));
    return { agent, children };
  }

  const rootAgents = agents.filter(
    (a) => !a.reportsTo || a.reportsTo === "" || a.reportsTo === "none"
  );

  return rootAgents.map((a) => buildNode(a));
}

function OrgNodeView({ node, depth }: { node: OrgNode; depth: number }) {
  return (
    <div>
      <div
        className="flex items-center gap-3 py-2 px-3 hover:bg-accent rounded-md transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold">
            {node.agent.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{node.agent.name}</p>
          <p className="text-xs text-muted-foreground">{node.agent.role}</p>
        </div>
        {node.agent.reportsTo && node.agent.reportsTo !== "none" && (
          <span className="text-xs text-muted-foreground ml-auto">
            reports to {node.agent.reportsTo}
          </span>
        )}
      </div>
      {node.children.map((child) => (
        <OrgNodeView key={child.agent.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function OrgPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<Agent[]>("/api/agents");
        setAgents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load org chart");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading org chart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load org chart</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const tree = buildTree(agents);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground mt-1">
          Agent hierarchy and reporting structure
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card py-2">
        {tree.length === 0 ? (
          <EmptyState
            icon={Network}
            message="No agents configured"
            description="Add agents to your config to see the org chart."
          />
        ) : (
          tree.map((node) => (
            <OrgNodeView key={node.agent.id} node={node} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
