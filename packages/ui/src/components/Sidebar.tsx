"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Search,
  Plus,
  Target,
  Network,
  DollarSign,
  Activity,
  Settings,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Agent, Task, CompanyConfig } from "@/lib/types";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState("AgentOrg");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [issueCount, setIssueCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [configData, agentsData, tasksData] = await Promise.all([
          fetchApi<CompanyConfig>("/api/config"),
          fetchApi<Agent[]>("/api/agents"),
          fetchApi<Task[]>("/api/tasks"),
        ]);
        setCompanyName(configData.company?.name || "AgentOrg");
        setAgents(agentsData);
        const openCount = tasksData.filter(
          (t) => t.status !== "completed" && t.status !== "failed"
        ).length;
        setIssueCount(openCount);
      } catch {
        // Silently handle — API may not be running
      }
    }
    load();
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-60 border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] flex flex-col shrink-0 h-screen">
      {/* Company name */}
      <div className="h-12 flex items-center px-4 border-b border-[var(--color-sidebar-border)]">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">
              {companyName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-semibold text-sm tracking-tight truncate">
            {companyName}
          </span>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="px-3 pt-3 pb-1">
        <button className="flex items-center gap-2 w-full rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors">
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
        </button>
      </div>

      {/* New Issue button */}
      <div className="px-3 pt-2 pb-1">
        <Button
          size="sm"
          className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => router.push("/issues?new=1")}
        >
          <Plus className="h-3.5 w-3.5" />
          New Issue
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* Main links */}
        <div className="space-y-0.5">
          <SidebarLink href="/" icon={LayoutDashboard} label="Dashboard" active={isActive("/")} />
          <SidebarLink
            href="/issues"
            icon={Inbox}
            label="Issues"
            active={isActive("/issues")}
            badge={issueCount > 0 ? issueCount : undefined}
          />
        </div>

        {/* Work section */}
        <div className="mt-5">
          <p className="px-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Work
          </p>
          <div className="space-y-0.5">
            <SidebarLink href="/issues" icon={CircleDot} label="Issues" active={false} />
            <SidebarLink href="/issues" icon={Target} label="Goals" active={false} />
          </div>
        </div>

        {/* Agents section */}
        <div className="mt-5">
          <p className="px-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Agents
          </p>
          <div className="space-y-0.5">
            {agents.length === 0 ? (
              <p className="px-3 py-1 text-xs text-muted-foreground">No agents</p>
            ) : (
              agents.map((agent) => (
                <Link
                  key={agent.id}
                  href="/agents"
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive("/agents")
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E] shrink-0" />
                  <span className="truncate">{agent.name}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Company section */}
        <div className="mt-5">
          <p className="px-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Company
          </p>
          <div className="space-y-0.5">
            <SidebarLink href="/org" icon={Network} label="Org" active={isActive("/org")} />
            <SidebarLink href="/costs" icon={DollarSign} label="Costs" active={isActive("/costs")} />
            <SidebarLink href="/activity" icon={Activity} label="Activity" active={isActive("/activity")} />
            <SidebarLink href="/settings" icon={Settings} label="Settings" active={isActive("/settings")} />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--color-sidebar-border)]">
        <p className="text-xs text-muted-foreground">AgentOrg v0.1.0</p>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-normal tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}
