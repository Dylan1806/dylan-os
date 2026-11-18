// Spotify link parsing and PKCE helpers. Tokens and the client ID stay in the browser.

export const SPOTIFY_REDIRECT = "https://dylan1806.github.io/dylan-os/";
export const SPOTIFY_SCOPES = "user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private";

const KINDS = ["playlist", "album", "track", "episode", "show"];

export function parseSpotifyLink(input) {
  const text = String(input || "").trim();
  if (!text) return null;
  const uri = text.match(/^spotify:(playlist|album|track|episode|show):([A-Za-z0-9]+)$/);
  if (uri) return { type: uri[1], id: uri[2] };
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "open.spotify.com" && host !== "spotify.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.findIndex((part) => KINDS.includes(part));
  if (index === -1 || !parts[index + 1]) return null;
  const id = parts[index + 1].split("?")[0];
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  return { type: parts[index], id };
}

export function embedSrc(item) {
  if (!item?.type || !item?.id) return "";
  return `https://open.spotify.com/embed/${item.type}/${item.id}?utm_source=generator&theme=0`;
}

export function embedHeight() {
  return 352;
}

function base64url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function codeChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function authorizeUrl({ clientId, challenge, state }) {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", SPOTIFY_REDIRECT);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export function tokenBody(fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value != null) body.set(key, value);
  }
  return body;
}

export async function spotifyFetch(token, path, { method = "GET", json = null, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(json != null ? { "Content-Type": "application/json" } : {}),
    },
    body: json != null ? JSON.stringify(json) : undefined,
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  return { status: response.status, body };
}

export function premiumRequired(result) {
  const reason = result?.body?.error?.reason || "";
  const message = result?.body?.error?.message || "";
  return result?.status === 403 && (reason === "PREMIUM_REQUIRED" || /premium/i.test(message));
}

export function noDevice(result) {
  return result?.status === 404 || result?.status === 204;
}
