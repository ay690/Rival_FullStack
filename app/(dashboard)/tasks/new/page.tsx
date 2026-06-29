"use client";

import { useEffect, useState } from "react";
import { TaskForm } from "@/components/task-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { AdminUser } from "@/types";

export default function NewTaskPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    adminApi.getUsers(token).then((all) => {
      // Only show non-admin users as assignable targets
      setUsers(all.filter((u) => u.role !== "ADMIN"));
    }).catch(() => {
      // silently ignore — form falls back to normal create mode
    });
  }, [isAdmin, token]);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">New Task</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "Create a task and assign it to any user."
            : "Fill in the details to create a new task."}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <TaskForm users={isAdmin ? users : undefined} />
      </div>
    </div>
  );
}
