"use client";

import { StatusIcon } from "@/components/StatusIcon";
import { PriorityIcon } from "@/components/PriorityIcon";
import { timeAgo } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface IssueRowProps {
  task: Task;
  agentName?: string;
  onStatusClick?: (taskId: string) => void;
}

export function IssueRow({ task, agentName, onStatusClick }: IssueRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent cursor-pointer border-b border-border">
      <StatusIcon
        status={task.status}
        onClick={onStatusClick ? () => onStatusClick(task.id) : undefined}
      />
      <span className="font-medium text-sm truncate flex-1">
        {task.title}
      </span>
      {agentName && (
        <span className="text-muted-foreground text-xs shrink-0">
          {agentName}
        </span>
      )}
      <PriorityIcon priority={task.priority} />
      <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
        {timeAgo(task.createdAt)}
      </span>
    </div>
  );
}
