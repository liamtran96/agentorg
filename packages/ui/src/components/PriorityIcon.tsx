"use client";

import { Badge } from "@/components/ui/badge";

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

interface PriorityIconProps {
  priority: string;
}

export function PriorityIcon({ priority }: PriorityIconProps) {
  return (
    <Badge
      variant="outline"
      className={priorityStyles[priority] || ""}
    >
      {priority}
    </Badge>
  );
}
