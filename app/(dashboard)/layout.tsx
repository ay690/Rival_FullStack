"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [token, loading, router]);

  if (loading) return <FullPageSpinner />;

  if (!token) return null;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <DashboardGuard>{children}</DashboardGuard>
    </Providers>
  );
}