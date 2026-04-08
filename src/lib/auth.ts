import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { authDebugEvents } from "@/lib/db/schema";

function getRequiredEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "NEXTAUTH_SECRET") {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be configured in production.`);
  }
  if (name === "NEXTAUTH_SECRET") return "claimrail-dev-secret-local-only";
  return "";
}

function logAuthEvent(level: "info" | "warn" | "error", message: string, payload?: unknown) {
  const logger = level === "info" ? console.info : level === "warn" ? console.warn : console.error;
  logger(`[auth] ${message}`, JSON.stringify(payload).substring(0, 500));

  if (level === "warn" || level === "error") {
    void db.insert(authDebugEvents).values({
      level,
      message,
      payload: payload || null,
    }).catch(() => {});
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      logAuthEvent("info", "Google signIn callback", {
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        email: user.email,
        name: user.name,
      });
      return true;
    },
    async jwt({ token, account }) {
      try {
        if (account) {
          logAuthEvent("info", "JWT first sign-in", {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          });
          token.googleId = account.providerAccountId;
          token.email = (account as any).email || token.email;
          return token;
        }
        return token;
      } catch (error) {
        logAuthEvent("error", "JWT callback error", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user && token.googleId) {
          session.user.id = token.googleId as string;
        }
        logAuthEvent("info", "Session callback", {
          userId: session.user?.id,
          email: session.user?.email,
          hasGoogleId: !!token.googleId,
        });
        return session;
      } catch (error) {
        logAuthEvent("error", "Session callback error", error);
        return session;
      }
    },
  },
  pages: {
    signIn: "/connect",
    error: "/connect",
  },
  secret: getRequiredEnv("NEXTAUTH_SECRET"),
  debug: process.env.NODE_ENV === "development",
};
