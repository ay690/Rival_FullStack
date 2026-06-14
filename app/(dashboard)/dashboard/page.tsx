"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/task-card";
import { TaskFilters } from "@/components/task-filters";
import { tasksApi } from "@/lib/api";
import type { Task, TaskStatus, TasksResponse } from "@/types";
import { useAuth } from "@/hooks/use-auth";

const PAGE_SIZE = 9;

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-2 border-t border-border pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<TasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tasksApi.getAll(token, {
        search: debouncedSearch || undefined,
        status: status || undefined,
        sortBy: sortBy as "createdAt" | "dueDate" | "priority",
        order,
        page,
        limit: PAGE_SIZE,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, status, sortBy, order, page]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [status, sortBy, order]);

  function handleTaskUpdated(updated: Task) {
    setData((prev) =>
      prev
        ? {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)),
        }
        : prev
    );
  }

  function handleTaskDeleted(id: string) {
    setData((prev) => {
      if (!prev) return prev;
      const tasks = prev.tasks.filter((t) => t.id !== id);
      return { ...prev, tasks, total: prev.total - 1 };
    });
  }

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.total} task{data.total !== 1 ? "s" : ""} total
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="size-4" />
            New Task
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <TaskFilters
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(s) => {
          setSortBy(s);
          setPage(1);
        }}
        order={order}
        onOrderChange={(o) => {
          setOrder(o);
          setPage(1);
        }}
      />

      {/* Content */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto"
            onClick={loadTasks}
          >
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !error && data?.tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {debouncedSearch || status
                ? "Try adjusting your filters"
                : "Create your first task to get started"}
            </p>
          </div>
          {!debouncedSearch && !status && (
            <Button asChild size="sm" className="mt-2">
              <Link href="/tasks/new">
                <Plus className="size-4" />
                New Task
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdated={handleTaskUpdated}
              onDeleted={handleTaskDeleted}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}