import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
].join(" ");
const SENSITIVE_KEY_PATTERN = /token|secret|password|authorization|cookie/i;

function getRequiredEnv(name: "SPOTIFY_CLIENT_ID" | "SPOTIFY_CLIENT_SECRET" | "NEXTAUTH_SECRET") {
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

  logger(`[auth] ${message}`, {
    nextAuthUrl: process.env.NEXTAUTH_URL || "missing",
    spotifyClientId: redactValue(process.env.SPOTIFY_CLIENT_ID),
    spotifyClientSecret: redactValue(process.env.SPOTIFY_CLIENT_SECRET),
    payload: sanitizeAuthPayload(payload),
  });
}

async function refreshSpotifyAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return token;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };

    if (!response.ok || !refreshedTokens.access_token || !refreshedTokens.expires_in) {
      logAuthEvent("error", "Spotify access token refresh failed", {
        status: response.status,
        statusText: response.statusText,
        refreshedTokens,
      });
      throw new Error(refreshedTokens.error || "Failed to refresh Spotify access token");
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      authError: undefined,
    };
  } catch (error) {
    logAuthEvent("error", "Spotify access token refresh threw an exception", error);
    return {
      ...token,
      authError: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: getRequiredEnv("SPOTIFY_CLIENT_ID"),
      clientSecret: getRequiredEnv("SPOTIFY_CLIENT_SECRET"),
      authorization: {
        params: { scope: SPOTIFY_SCOPES },
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
      logAuthEvent("info", "Spotify sign-in callback reached", {
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        userEmail: user.email,
        userName: user.name,
        profileId: typeof profile === "object" && profile && "id" in profile ? profile.id : undefined,
      });
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        logAuthEvent("info", "Persisting Spotify account onto JWT", {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          hasAccessToken: Boolean(account.access_token),
          hasRefreshToken: Boolean(account.refresh_token),
          expiresAt: account.expires_at,
        });
        token.spotifyId = account.providerAccountId || token.sub;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.authError = undefined;
        return token;
      }

      if (!token.spotifyId && token.sub) {
        token.spotifyId = token.sub;
      }

      if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 60_000) {
        return token;
      }

      return refreshSpotifyAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.spotifyId || token.sub) as string;
      }

      session.accessToken = token.accessToken as string;
      session.authError = token.authError;

      if (token.authError) {
        logAuthEvent("warn", "Session created with auth error", {
          authError: token.authError,
          spotifyId: token.spotifyId,
          tokenSub: token.sub,
        });
      }

      return session;
    },
  },
  pages: {
    signIn: "/connect",
  },
  secret: getRequiredEnv("NEXTAUTH_SECRET"),
};
