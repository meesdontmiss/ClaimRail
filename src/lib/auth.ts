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
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      logAuthEvent("info", "Google signIn callback", {
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        email: user.email,
        name: user.name,
        hasProfile: !!profile,
      });
      return true;
    },
    async jwt({ token, account, profile }) {
      try {
        if (account && profile) {
          logAuthEvent("info", "JWT first sign-in", {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            hasAccessToken: !!account.access_token,
          });
          token.googleId = account.providerAccountId;
          token.email = profile.email || token.email;
          token.name = profile.name || token.name;
          token.picture = profile.picture || token.picture;
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          return token;
        }

        // Subsequent calls - just return existing token
        if (token.googleId) {
          logAuthEvent("info", "JWT returning existing token", {
            googleId: token.googleId,
            email: token.email,
          });
        }
        return token;
      } catch (error) {
        logAuthEvent("error", "JWT callback error", error);
        return token; // NEVER throw
      }
    },
    async session({ session, token }) {
      try {
        // Always ensure user object exists
        if (!session.user) {
          session.user = {};
        }

        // Set user ID from Google ID or fallback to sub
        session.user.id = (token.googleId || token.sub) as string;
        
        // Copy profile data to session user
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;

        logAuthEvent("info", "Session callback success", {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name,
          hasToken: !!token,
          hasGoogleId: !!token.googleId,
        });

        return session;
      } catch (error) {
        logAuthEvent("error", "Session callback error - returning session anyway", error);
        return session; // NEVER throw
      }
    },
  },
  pages: {
    signIn: "/connect",
    error: "/connect",
  },
  secret: getRequiredEnv("NEXTAUTH_SECRET"),
  debug: true, // Enable debug logging
};
