import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
            {/* Icon */}
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                <FileQuestion className="size-8 text-muted-foreground" />
            </div>

            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight">404</h1>
                <p className="text-lg font-medium text-foreground">Page not found</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
            </div>
            <div className="flex gap-3">
                <Button asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>
        </div>
    );
}
