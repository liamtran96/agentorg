"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
}

export function EmptyState({ icon: Icon, message, description }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">{message}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
