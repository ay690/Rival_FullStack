"use client";

import { useState, useEffect, useCallback } from "react";
import { tasksApi } from "@/lib/api";
import type { Task, TasksResponse, GetTasksParams } from "@/types";
import { useAuth } from "./use-auth";

interface UseTasksReturn {
    data: TasksResponse | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useTasks(params: GetTasksParams = {}): UseTasksReturn {
    const { token } = useAuth();
    const [data, setData] = useState<TasksResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paramsKey = JSON.stringify(params);

    const fetch = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await tasksApi.getAll(token, params);
            setData(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load tasks");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, paramsKey]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
}

interface UseTaskReturn {
    task: Task | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useTask(id: string): UseTaskReturn {
    const { token } = useAuth();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!token || !id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await tasksApi.getOne(token, id);
            setTask(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load task");
        } finally {
            setLoading(false);
        }
    }, [token, id]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { task, loading, error, refetch: fetch };
}