import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleId?: string;
    email?: string;
    name?: string;
    picture?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
