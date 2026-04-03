"use client";

import { signIn } from "next-auth/react";

const DEFAULT_CALLBACK_URL = "/dashboard";

export async function startSpotifySignIn(callbackUrl = DEFAULT_CALLBACK_URL) {
  const result = await signIn("spotify", {
    callbackUrl,
    redirect: true,
  });

  if (result?.error) {
    throw new Error(result.error);
  }
}
