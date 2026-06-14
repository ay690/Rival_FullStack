"use client";

import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const STATUS_TABS: { label: string; value: TaskStatus | "" }[] = [
    { label: "All", value: "" },
    { label: "Todo", value: "TODO" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Done", value: "DONE" },
];

interface TaskFiltersProps {
    status: TaskStatus | "";
    onStatusChange: (status: TaskStatus | "") => void;
    sortBy: string;
    onSortByChange: (sortBy: string) => void;
    order: "asc" | "desc";
    onOrderChange: (order: "asc" | "desc") => void;
}

export function TaskFilters({
    status,
    onStatusChange,
    sortBy,
    onSortByChange,
    order,
    onOrderChange,
}: TaskFiltersProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => onStatusChange(tab.value)}
                        className={cn(
                            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                            status === tab.value
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-2">
                <Select
                    value={sortBy}
                    onChange={(e) => onSortByChange(e.target.value)}
                    className="w-36 h-8 text-sm"
                >
                    <option value="createdAt">Created</option>
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority</option>
                </Select>
                <Button
                    variant="outline"
                    size="icon"
                    aria-label={order === "asc" ? "Sort descending" : "Sort ascending"}
                    onClick={() => onOrderChange(order === "asc" ? "desc" : "asc")}
                    className="size-8"
                >
                    <ArrowUpDown
                        className={cn(
                            "size-4 transition-transform",
                            order === "desc" && "rotate-180"
                        )}
                    />
                </Button>
            </div>
        </div>
    );
}