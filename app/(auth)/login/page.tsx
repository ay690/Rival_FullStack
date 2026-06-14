"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Providers } from "@/components/providers";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/api";

function LoginForm() {
    const { login } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function validate() {
        const e: Record<string, string> = {};
        if (!email.trim()) e.email = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email.";
        if (!password) e.password = "Password is required.";
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
        setLoading(true);
        try {
            const res = await authApi.login(email, password);
            login(res.token, res.user);
            router.push("/dashboard");
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : "Invalid email or password"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-svh items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="mb-8 flex flex-col items-center gap-2 text-center">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <CheckSquare className="size-5" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                    <p className="text-sm text-muted-foreground">
                        Sign in to your TaskFlow account
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={!!errors.email}
                                autoFocus
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">{errors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-invalid={!!errors.password}
                            />
                            {errors.password && (
                                <p className="text-xs text-destructive">{errors.password}</p>
                            )}
                        </div>

                        {/* Server error */}
                        {serverError && (
                            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {serverError}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="mt-1 w-full">
                            {loading ? "Signing in…" : "Sign in"}
                        </Button>
                    </form>
                </div>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/signup"
                        className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Providers>
            <LoginForm />
        </Providers>
    );
}