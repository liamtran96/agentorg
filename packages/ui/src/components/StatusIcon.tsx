"use client";

import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-[#EAB308]",
  in_progress: "bg-[#D97757]",
  completed: "bg-[#22C55E]",
  failed: "bg-[#EF4444]",
  blocked: "bg-[#9CA3AF]",
  review: "bg-[#A855F7]",
};

interface StatusIconProps {
  status: string;
  className?: string;
  onClick?: () => void;
}

export function StatusIcon({ status, className, onClick }: StatusIconProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        statusColors[status] || "bg-[#9CA3AF]",
        onClick && "cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-ring",
        className
      )}
      onClick={onClick}
      title={status}
    />
  );
}
