"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { tasksApi } from "@/lib/api";
import { Task, TaskStatus, Priority } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface TaskFormProps {
    task?: Task; // if provided → edit mode
    onSuccess?: (task: Task) => void;
}

export function TaskForm({ task, onSuccess }: TaskFormProps) {
    const { token } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState(task?.title ?? "");
    const [description, setDescription] = useState(task?.description ?? "");
    const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
    const [priority, setPriority] = useState<Priority>(
        task?.priority ?? "MEDIUM"
    );
    const [dueDate, setDueDate] = useState(
        task?.dueDate ? task.dueDate.slice(0, 10) : ""
    );

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    function validate() {
        const e: Record<string, string> = {};
        if (!title.trim()) e.title = "Title is required.";
        return e;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }
        setErrors({});
        setServerError(null);
        setSubmitting(true);

        const payload = {
            title: title.trim(),
            description: description.trim() || undefined,
            status,
            priority,
            dueDate: dueDate || undefined,
        };

        try {
            let result: Task;
            if (task) {
                result = await tasksApi.update(token!, task.id, payload);
            } else {
                result = await tasksApi.create(token!, payload);
            }
            if (onSuccess) {
                onSuccess(result);
            } else {
                router.push("/dashboard");
            }
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : "Something went wrong"
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    aria-invalid={!!errors.title}
                    autoFocus
                />
                {errors.title && (
                    <p className="text-xs text-destructive">{errors.title}</p>
                )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add more detail…"
                    rows={3}
                />
            </div>

            {/* Status + Priority side by side */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="status">Status</Label>
                    <Select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    >
                        <option value="TODO">Todo</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                    </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Priority)}
                    >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                    </Select>
                </div>
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full"
                />
            </div>

            {/* Server error */}
            {serverError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {serverError}
                </p>
            )}

            {/* Actions */}
            <div className={cn("flex gap-2", task ? "justify-end" : "justify-end")}>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={submitting}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving…" : task ? "Save changes" : "Create task"}
                </Button>
            </div>
        </form>
    );
}