"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";
import { getToken, getStoredUser, storeAuth, clearAuth } from "@/lib/auth";

interface AuthContextValue {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
    user: null,
    token: null,
    loading: true,
    login: () => { },
    logout: () => { },
});

export function useAuthContext(): {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
} {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = getToken();
        const storedUser = getStoredUser();
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(storedUser);
        }
        setLoading(false);
    }, []);

    const login = useCallback((newToken: string, newUser: User) => {
        storeAuth(newToken, newUser);
        setToken(newToken);
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        clearAuth();
        setToken(null);
        setUser(null);
        router.push("/login");
    }, [router]);

    return { user, token, loading, login, logout };
}

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}

export type { AuthContextValue, ReactNode };