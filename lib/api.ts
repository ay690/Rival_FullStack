import type { Task, TasksResponse, AuthResponse, GetTasksParams, CreateTaskInput, UpdateTaskInput, AdminStats, AdminUser, AdminTasksResponse } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";


async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = (body as { message?: string; error?: string }).message
        ?? (body as { message?: string; error?: string }).error
        ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export const authApi = {
  login(email: string, password: string): Promise<AuthResponse> {
    return apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  signup(name: string, email: string, password: string): Promise<AuthResponse> {
    return apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },
};

// Tasks
export const tasksApi = {
  getAll(token: string, params: GetTasksParams = {}): Promise<TasksResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.order) qs.set("order", params.order);
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return apiFetch(`/tasks${query ? `?${query}` : ""}`, { token });
  },
  getOne(token: string, id: string): Promise<Task> {
    return apiFetch(`/tasks/${id}`, { token });
  },
  create(token: string, data: CreateTaskInput): Promise<Task> {
    return apiFetch("/tasks", { method: "POST", body: JSON.stringify(data), token });
  },
  update(token: string, id: string, data: UpdateTaskInput): Promise<Task> {
    return apiFetch(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data), token });
  },
  delete(token: string, id: string): Promise<void> {
    return apiFetch(`/tasks/${id}`, { method: "DELETE", token });
  },
};

// Admin
export const adminApi = {
  getStats(token: string): Promise<AdminStats> {
    return apiFetch("/admin/stats", { token });
  },
  getUsers(token: string): Promise<AdminUser[]> {
    return apiFetch("/admin/users", { token });
  },
  getTasks(
    token: string,
    params: GetTasksParams & { userId?: string } = {}
  ): Promise<AdminTasksResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    if (params.page != null) qs.set("page", String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.userId) qs.set("userId", params.userId);
    const query = qs.toString();
    return apiFetch(`/admin/tasks${query ? `?${query}` : ""}`, { token });
  },
  deleteUser(token: string, id: string): Promise<void> {
    return apiFetch(`/admin/users/${id}`, { method: "DELETE", token });
  },
};