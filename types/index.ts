export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface ActivityLog {
    id: string;
    action: string;
    detail?: string;
    createdAt: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    activityLog?: ActivityLog[];
}

export interface TasksResponse {
    tasks: Task[];
    total: number;
    page: number;
    totalPages: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface GetTasksParams {
    status?: TaskStatus | "";
    search?: string;
    sortBy?: "createdAt" | "dueDate" | "priority";
    order?: "asc" | "desc";
    page?: number;
    limit?: number;
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string;
}

export interface AdminStats {
    totalUsers: number;
    totalTasks: number;
    byStatus: Record<string, number>;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    _count: { tasks: number };
}

export interface AdminTasksResponse {
    tasks: (Task & { user: { id: string; name: string; email: string } })[];
    total: number;
    page: number;
    totalPages: number;
}