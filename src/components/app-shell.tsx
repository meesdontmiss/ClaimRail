"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

export function AppShell({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
}) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.replace("/connect");
    }
  }, [requireAuth, router, status]);

  if (requireAuth && status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your workspace...
        </div>
      </div>
    );
  }

  if (requireAuth && status === "unauthenticated") {
    return null;
  }

  return (
    <div className="relative min-h-screen">
      {/* Ambient aura orbs */}
      <div className="pointer-events-none fixed top-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[150px] opacity-60" />
      <div className="pointer-events-none fixed bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-purple-500/[0.03] blur-[120px] opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
