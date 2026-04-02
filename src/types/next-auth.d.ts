import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
  }

  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
    authError?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    spotifyId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    authError?: string;
  }
}
