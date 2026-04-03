import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
].join(" ");

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
      throw new Error(refreshedTokens.error || "Failed to refresh Spotify access token");
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      authError: undefined,
    };
  } catch {
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
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.spotifyId = account.providerAccountId;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.authError = undefined;
        return token;
      }

      if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 60_000) {
        return token;
      }

      return refreshSpotifyAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.spotifyId as string;
      }

      session.accessToken = token.accessToken as string;
      session.authError = token.authError;
      return session;
    },
  },
  pages: {
    signIn: "/connect",
  },
  secret: getRequiredEnv("NEXTAUTH_SECRET"),
};
