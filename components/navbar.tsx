"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, LogOut, Moon, Sun, Plus, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-foreground transition-opacity hover:opacity-80"
        >
          <CheckSquare className="size-5 text-primary" />
          <span className="hidden sm:inline">TaskFlow</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-2">
          <Link
            href="/dashboard"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground",
              pathname === "/dashboard"
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            Dashboard
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground",
                pathname === "/admin"
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <ShieldCheck className="size-3.5" />
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* New task shortcut */}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/tasks/new">
              <Plus className="size-4" />
              New Task
            </Link>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="size-4 hidden dark:block" />
          </Button>

          {/* User avatar + logout */}
          <div className="flex items-center gap-2">
            <Avatar className="size-8 cursor-default">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex md:flex-col md:leading-tight">
              <span className="text-sm text-foreground">{user?.name}</span>
              {user?.role === "ADMIN" && (
                <Badge variant="admin" className="text-[10px] px-1.5 py-0 w-fit">
                  Admin
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Logout"
              onClick={logout}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}