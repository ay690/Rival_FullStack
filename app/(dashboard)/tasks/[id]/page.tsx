"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  AlertCircle,
  CalendarDays,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { TaskForm } from "@/components/task-form";
import { useTask } from "@/hooks/use-tasks";
import type { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_VARIANT: Record<TaskStatus, "todo" | "in_progress" | "done"> = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

const PRIORITY_VARIANT = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

function formatDate(iso: string, includeTime = false) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function isOverdue(dueDate?: string, status?: TaskStatus): boolean {
  if (!dueDate || status === "DONE") return false;
  return new Date(dueDate) < new Date();
}

function ActivityItem({
  action,
  detail,
  createdAt,
}: {
  action: string;
  detail?: string;
  createdAt: string;
}) {
  return (
    <div className="flex gap-3 py-3 first:pt-0">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
        <Clock className="size-3 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{action}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(createdAt, true)}
        </p>
      </div>
    </div>
  );
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { task: initialTask, loading, error, refetch } = useTask(id);
  const [editMode, setEditMode] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  const task = currentTask ?? initialTask;
  const overdue = isOverdue(task?.dueDate, task?.status);

  function handleUpdated(updated: Task) {
    setCurrentTask(updated);
    setEditMode(false);
    refetch();
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Dashboard
        </Link>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto"
            onClick={refetch}
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && task && (
        <div className="flex flex-col gap-6">
          {/* Task header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  task.status === "DONE" && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={STATUS_VARIANT[task.status]}>
                  {STATUS_LABEL[task.status]}
                </Badge>
                <Badge variant={PRIORITY_VARIANT[task.priority]}>
                  {task.priority} priority
                </Badge>
                {task.dueDate && (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      overdue ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="size-3" />
                    {overdue ? "Overdue · " : "Due "}
                    {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode((v) => !v)}
            >
              {editMode ? (
                <>
                  <X className="size-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Pencil className="size-4" />
                  Edit
                </>
              )}
            </Button>
          </div>

          {/* Edit form or view */}
          {editMode ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <TaskForm task={task} onSuccess={handleUpdated} />
            </div>
          ) : (
            <>
              {task.description && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Description
                  </h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Created",
                    value: formatDate(task.createdAt),
                  },
                  {
                    label: "Updated",
                    value: formatDate(task.updatedAt),
                  },
                  {
                    label: "Status",
                    value: STATUS_LABEL[task.status],
                  },
                  {
                    label: "Priority",
                    value: task.priority,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Activity log */}
          {task.activityLog && task.activityLog.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Activity
              </h2>
              <div className="divide-y divide-border">
                {task.activityLog.map((log) => (
                  <ActivityItem key={log.id} {...log} />
                ))}
              </div>
            </div>
          )}
          {/* Attachments */}
          <AttachmentsPanel taskId={task.id} onActivityChange={refetch} />
        </div>
      )}
    </div>
  );
}