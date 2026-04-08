"use client";

const DEFAULT_CALLBACK_URL = "/dashboard";

interface CsrfResponse {
  csrfToken?: string;
}

export async function startSpotifySignIn(callbackUrl = DEFAULT_CALLBACK_URL) {
  try {
    const response = await fetch("/api/auth/csrf", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("[SpotifySignIn] CSRF fetch failed:", response.status, response.statusText);
      throw new Error("Could not start Spotify sign-in. Please try again.");
    }

    const data = (await response.json()) as CsrfResponse;
    
    if (!data.csrfToken) {
      console.error("[SpotifySignIn] Missing CSRF token in response:", data);
      throw new Error("Missing sign-in token. Please refresh and try again.");
    }

    console.log("[SpotifySignIn] Got CSRF token, submitting form...");

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signin/spotify";
    form.style.display = "none";

    const csrfInput = document.createElement("input");
    csrfInput.type = "hidden";
    csrfInput.name = "csrfToken";
    csrfInput.value = data.csrfToken;
    form.appendChild(csrfInput);

    const callbackInput = document.createElement("input");
    callbackInput.type = "hidden";
    callbackInput.name = "callbackUrl";
    callbackInput.value = callbackUrl;
    form.appendChild(callbackInput);

    document.body.appendChild(form);
    
    console.log("[SpotifySignIn] Form submitted to:", form.action);
    form.submit();
  } catch (error) {
    console.error("[SpotifySignIn] Error:", error);
    throw error;
  }
}
