import { TaskForm } from "@/components/task-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewTaskPage() {
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
          Fill in the details to create a new task.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <TaskForm />
      </div>
    </div>
  );
}