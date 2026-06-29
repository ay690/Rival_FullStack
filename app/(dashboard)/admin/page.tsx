"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, ClipboardList, CheckCircle2, Clock, Circle,
  ChevronLeft, ChevronRight, Trash2, AlertCircle, RefreshCw, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { TaskForm } from "@/components/task-form";
import { adminApi } from "@/lib/api";
import type { AdminStats, AdminUser, AdminTasksResponse, Task } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function UserRow({ user, onDelete, onAssign }: {
  user: AdminUser;
  onDelete: (id: string) => void;
  onAssign: (user: AdminUser) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { token } = useAuth();

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(token, user.id);
      setConfirm(false);
      onDelete(user.id);
    } catch {
      // stay open
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
        <td className="py-3 px-4">
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </td>
        <td className="py-3 px-4">
          <Badge variant={user.role === "ADMIN" ? "admin" : "user"}>
            {user.role}
          </Badge>
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">
          {user._count.tasks} task{user._count.tasks !== 1 ? "s" : ""}
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString(undefined, {
            month: "short", day: "numeric", year: "numeric",
          })}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onAssign(user)}
              className="text-muted-foreground hover:text-primary"
              aria-label={`Assign task to ${user.name}`}
              title="Assign task"
            >
              <Plus className="size-3.5" />
            </Button>
            {user.role !== "ADMIN" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setConfirm(true)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete user"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </td>
      </tr>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{user.name}</strong> and all
              their tasks. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminPage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tasksData, setTasksData] = useState<AdminTasksResponse | null>(null);
  const [taskPage, setTaskPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assign task dialog state
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [s, u, t] = await Promise.all([
        adminApi.getStats(token),
        adminApi.getUsers(token),
        adminApi.getTasks(token, { page: taskPage, limit: 10 }),
      ]);
      setStats(s);
      setUsers(u);
      setTasksData(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token, taskPage]);

  useEffect(() => { load(); }, [load]);

  if (user?.role !== "ADMIN") return null;

  // Non-admin users only (admins can't be assigned tasks from this view)
  const assignableUsers = users.filter((u) => u.role !== "ADMIN");

  return (
    <div className="flex flex-col gap-8">
      {/* Assign Task Dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(open) => { if (!open) setAssignTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign task to {assignTarget?.name}</DialogTitle>
            <DialogDescription>
              Create a new task and assign it to <strong>{assignTarget?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          {assignTarget && (
            <TaskForm
              users={assignableUsers}
              defaultAssignedUserId={assignTarget.id}
              onSuccess={(_task: Task) => {
                setAssignTarget(null);
                // Refresh stats and tasks to reflect the new task
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform overview — all users and tasks
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
          <Button variant="ghost" size="xs" className="ml-auto" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : stats ? (
          <>
            <StatCard icon={<Users className="size-4" />} label="Total Users" value={stats.totalUsers} />
            <StatCard icon={<ClipboardList className="size-4" />} label="Total Tasks" value={stats.totalTasks} />
            <StatCard
              icon={<CheckCircle2 className="size-4" />}
              label="Completed"
              value={stats.byStatus["DONE"] ?? 0}
              sub={`${stats.totalTasks ? Math.round(((stats.byStatus["DONE"] ?? 0) / stats.totalTasks) * 100) : 0}% completion rate`}
            />
            <StatCard
              icon={<Clock className="size-4" />}
              label="In Progress"
              value={stats.byStatus["IN_PROGRESS"] ?? 0}
              sub={`${stats.byStatus["TODO"] ?? 0} todo`}
            />
          </>
        ) : null}
      </div>

      {/* Users table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">All Users</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">User</th>
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Role</th>
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Tasks</th>
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Joined</th>
                    <th className="py-2.5 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        onDelete={(id) => setUsers((prev) => prev.filter((x) => x.id !== id))}
                        onAssign={(target) => setAssignTarget(target)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* All tasks table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">All Tasks</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Title</th>
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Owner</th>
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Status</th>
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Priority</th>
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {!tasksData || tasksData.tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                        No tasks found
                      </td>
                    </tr>
                  ) : (
                    tasksData.tasks.map((task) => (
                      <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-medium hover:underline truncate max-w-50 block"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{task.user.name}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium",
                            task.status === "DONE" && "text-green-600 dark:text-green-400",
                            task.status === "IN_PROGRESS" && "text-blue-600 dark:text-blue-400",
                            task.status === "TODO" && "text-muted-foreground",
                          )}>
                            {task.status === "DONE" && <CheckCircle2 className="size-3" />}
                            {task.status === "IN_PROGRESS" && <Clock className="size-3" />}
                            {task.status === "TODO" && <Circle className="size-3" />}
                            {task.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            task.priority === "HIGH" ? "high" :
                            task.priority === "MEDIUM" ? "medium" : "low"
                          }>
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Task pagination */}
        {!loading && tasksData && tasksData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" disabled={taskPage <= 1}
              onClick={() => setTaskPage((p) => p - 1)} aria-label="Previous">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {taskPage} of {tasksData.totalPages}
            </span>
            <Button variant="outline" size="icon" disabled={taskPage >= tasksData.totalPages}
              onClick={() => setTaskPage((p) => p + 1)} aria-label="Next">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}