"use client";

import { type ReactNode } from "react";
import { AuthContext, useAuthContext } from "@/hooks/use-auth";

function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}