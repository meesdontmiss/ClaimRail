"use client";

import {
  SessionProvider as NextAuthSessionProvider,
  useSession,
  signIn,
} from "next-auth/react";
import { useEffect } from "react";

function SessionSyncer() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log("[SessionProvider] status:", status, "hasSession:", !!session);
    if (session) {
      console.log("[SessionProvider] user:", session.user?.name, session.user?.email);
    }
  }, [session, status]);

  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchOnWindowFocus={true}
      refetchInterval={30}
    >
      <SessionSyncer />
      {children}
    </NextAuthSessionProvider>
  );
}
