"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import type { CompanyConfig } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<CompanyConfig>("/api/config");
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load settings</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <EmptyState
        icon={Settings}
        message="No configuration found"
        description="Create an agentorg.config.yaml to configure your company."
      />
    );
  }

  const company = config.company;
  const rules = config.governance?.rules || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Company configuration (read-only)
        </p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="text-sm mt-1">{company.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Timezone</dt>
              <dd className="text-sm mt-1">{company.timezone}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Business Hours</dt>
              <dd className="text-sm mt-1">{company.businessHours}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Description</dt>
              <dd className="text-sm mt-1">{company.description}</dd>
            </div>
            {company.outOfHoursReply && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Out of Hours Reply</dt>
                <dd className="text-sm mt-1">{company.outOfHoursReply}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Governance Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Governance Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No governance rules configured
            </p>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Requires</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="p-3 font-mono text-sm">{rule.action}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            rule.requires === "auto_approve"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : rule.requires === "board_approval"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-yellow-100 text-yellow-800 border-yellow-200"
                          }
                        >
                          {rule.requires}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {rule.condition || "\u2014"}
                        {rule.above !== undefined && ` (above $${rule.above})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
