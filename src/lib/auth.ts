import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { authDebugEvents } from "@/lib/db/schema";

const SENSITIVE_KEY_PATTERN = /token|secret|password|authorization|cookie/i;

function getRequiredEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "NEXTAUTH_SECRET") {
  const value = process.env[name];

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be configured in production.`);
  }

  if (name === "NEXTAUTH_SECRET") {
    return "claimrail-dev-secret-local-only";
  }

  return "";
}

function redactValue(value: string | undefined | null) {
  if (!value) {
    return "missing";
  }

  if (value.length <= 8) {
    return `${value.length} chars`;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} chars)`;
}

function sanitizeAuthPayload(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split("\n").slice(0, 4).join("\n"),
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeAuthPayload);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? "[redacted]"
          : sanitizeAuthPayload(entryValue),
      ])
    );
  }

  return value;
}

function logAuthEvent(level: "info" | "warn" | "error", message: string, payload?: unknown) {
  const logger = level === "info" ? console.info : level === "warn" ? console.warn : console.error;
  const serializedPayload = JSON.stringify({
    nextAuthUrl: process.env.NEXTAUTH_URL || "missing",
    googleClientId: redactValue(process.env.GOOGLE_CLIENT_ID),
    payload: sanitizeAuthPayload(payload),
  });

  logger(`[auth] ${message} ${serializedPayload}`);

  if (level === "warn" || level === "error") {
    void db.insert(authDebugEvents).values({
      level,
      message,
      payload: sanitizeAuthPayload(payload),
    }).catch((error) => {
      console.error("[auth] Failed to persist auth debug event", error);
    });
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  logger: {
    error(code, metadata) {
      logAuthEvent("error", `NextAuth error: ${code}`, metadata);
    },
    warn(code) {
      logAuthEvent("warn", `NextAuth warning: ${code}`);
    },
    debug(code, metadata) {
      logAuthEvent("info", `NextAuth debug: ${code}`, metadata);
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      logAuthEvent("info", "Google sign-in callback", {
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        userEmail: user.email,
        userName: user.name,
      });
      return true;
    },
    async jwt({ token, account }) {
      try {
        if (account) {
          logAuthEvent("info", "Persisting Google account onto JWT", {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          });
          token.googleId = account.providerAccountId;
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          token.email = (account as any).email || token.email;
          return token;
        }

        // Token still valid if not expired
        if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000 - 60_000) {
          return token;
        }

        // Refresh token if expired
        if (token.refreshToken) {
          try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
                client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
              }),
            });

            const tokens = await response.json();

            if (response.ok && tokens.access_token) {
              return {
                ...token,
                accessToken: tokens.access_token,
                expiresAt: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
              };
            }
          } catch {
            // Token refresh failed - keep existing token
            logAuthEvent("warn", "Google token refresh failed, keeping existing session");
          }
        }

        return token;
      } catch (error) {
        logAuthEvent("error", "JWT callback error", error);
        return token; // NEVER throw
      }
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = (token.googleId || token.sub) as string;
        }
        session.accessToken = token.accessToken as string;
        
        logAuthEvent("info", "Session callback", {
          hasUser: Boolean(session.user),
          userId: session.user?.id,
          googleId: token.googleId,
        });

        return session;
      } catch (error) {
        logAuthEvent("error", "Session callback error", error);
        return session; // NEVER throw
      }
    },
  },
  pages: {
    signIn: "/connect",
  },
  secret: getRequiredEnv("NEXTAUTH_SECRET"),
};
