// Exchanges the long-lived refresh token (obtained once via the OAuth
// Playground — see the team's setup notes) for a short-lived access token.
// Plain fetch against Google's own token endpoint — no Google API client
// library needed for this.
export async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Couldn't refresh Google access token: ${await res.text()}`);

  const data = await res.json();
  return data.access_token as string;
}
