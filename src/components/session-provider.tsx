"use client";

import {
  SessionProvider as NextAuthSessionProvider,
  useSession,
} from "next-auth/react";
import { useEffect, useState } from "react";

function SessionSyncer() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "loading") {
      console.log("[Session] status:", status, "user:", session?.user?.email);
    }
  }, [session, status]);

  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchOnWindowFocus={true}
      refetchInterval={5}
    >
      <SessionSyncer />
      {children}
    </NextAuthSessionProvider>
  );
}
