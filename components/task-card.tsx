"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, CheckCheck, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { tasksApi } from "@/lib/api";
import type { Task, TaskStatus } from "@/types";
import { useAuth } from "@/hooks/use-auth";

const STATUS_LABEL: Record<TaskStatus, string> = {
    TODO: "Todo",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
};

const STATUS_VARIANT: Record<
    TaskStatus,
    "todo" | "in_progress" | "done"
> = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
};

const PRIORITY_VARIANT = {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
} as const;

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function isOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
}

interface TaskCardProps {
    task: Task;
    onUpdated?: (task: Task) => void;
    onDeleted?: (id: string) => void;
}

export function TaskCard({ task, onUpdated, onDeleted }: TaskCardProps) {
    const { token } = useAuth();
    const [optimisticTask, setOptimisticTask] = useState<Task>(task);
    const [deleting, setDeleting] = useState(false);
    const [markingDone, setMarkingDone] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const overdue =
        optimisticTask.status !== "DONE" && isOverdue(optimisticTask.dueDate);

    async function handleMarkDone() {
        if (!token || optimisticTask.status === "DONE") return;
        const prev = optimisticTask;
        const updated = { ...optimisticTask, status: "DONE" as TaskStatus };
        setOptimisticTask(updated); // optimistic
        setMarkingDone(true);
        try {
            const result = await tasksApi.update(token, task.id, {
                status: "DONE",
            });
            setOptimisticTask(result);
            onUpdated?.(result);
        } catch {
            setOptimisticTask(prev); // rollback
        } finally {
            setMarkingDone(false);
        }
    }

    async function handleDelete() {
        if (!token) return;
        setDeleting(true);
        try {
            await tasksApi.delete(token, task.id);
            setShowDeleteDialog(false);
            onDeleted?.(task.id);
        } catch {
            // stay open on error
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <div
                className={cn(
                    "group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:shadow-md hover:border-ring/30",
                    optimisticTask.status === "DONE" && "opacity-70"
                )}
            >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                    <Link
                        href={`/tasks/${task.id}`}
                        className="flex-1 min-w-0 hover:underline"
                    >
                        <h3
                            className={cn(
                                "truncate font-medium text-foreground leading-snug",
                                optimisticTask.status === "DONE" && "line-through text-muted-foreground"
                            )}
                        >
                            {optimisticTask.title}
                        </h3>
                    </Link>
                    <Badge variant={PRIORITY_VARIANT[optimisticTask.priority]}>
                        {optimisticTask.priority}
                    </Badge>
                </div>

                {/* Description */}
                {optimisticTask.description && (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                        {optimisticTask.description}
                    </p>
                )}

                {/* Meta row */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_VARIANT[optimisticTask.status]}>
                            {STATUS_LABEL[optimisticTask.status]}
                        </Badge>
                        {optimisticTask.dueDate && (
                            <span
                                className={cn(
                                    "flex items-center gap-1 text-xs",
                                    overdue ? "text-destructive font-medium" : "text-muted-foreground"
                                )}
                            >
                                <CalendarDays className="size-3" />
                                {overdue && "Overdue · "}
                                {formatDate(optimisticTask.dueDate)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions — shown on hover */}
                <div className="flex items-center gap-1 pt-1 border-t border-border">
                    {optimisticTask.status !== "DONE" && (
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={handleMarkDone}
                            disabled={markingDone}
                            className="text-muted-foreground hover:text-green-600 dark:hover:text-green-400"
                        >
                            <CheckCheck className="size-3.5" />
                            Mark done
                        </Button>
                    )}
                    <Button variant="ghost" size="xs" asChild>
                        <Link href={`/tasks/${task.id}`}>
                            <Pencil className="size-3.5" />
                            Edit
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setShowDeleteDialog(true)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete task?</DialogTitle>
                        <DialogDescription>
                            &ldquo;{task.title}&rdquo; will be permanently deleted. This
                            cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <DialogClose asChild>
                            <Button variant="outline" size="sm">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleting}
                            onClick={handleDelete}
                        >
                            {deleting ? "Deleting…" : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}