"use client";

const DEFAULT_CALLBACK_URL = "/dashboard";

interface CsrfResponse {
  csrfToken?: string;
}

export async function startSpotifySignIn(callbackUrl = DEFAULT_CALLBACK_URL) {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not start Spotify sign-in.");
  }

  const data = (await response.json()) as CsrfResponse;
  if (!data.csrfToken) {
    throw new Error("Missing sign-in token.");
  }

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
  form.submit();
}
