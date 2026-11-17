import assert from "node:assert/strict";
import test from "node:test";
import { sidebarClockParts } from "../js/dates.js";
import { codeChallenge, embedSrc, parseSpotifyLink, premiumRequired } from "../js/spotify.js";

test("sidebar clock uses 24-hour time and a short date", () => {
  const date = new Date(2026, 8, 27, 21, 16, 14);
  const parts = sidebarClockParts(date);
  assert.equal(parts.time, "21:16:14");
  assert.equal(parts.date, `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]} Sep 27`);
});

test("spotify links become embed ids", () => {
  assert.deepEqual(parseSpotifyLink("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc"), { type: "playlist", id: "37i9dQZF1DXcBWIGoYBM5M" });
  assert.deepEqual(parseSpotifyLink("https://open.spotify.com/intl-de/album/1ABCxyz"), { type: "album", id: "1ABCxyz" });
  assert.deepEqual(parseSpotifyLink("spotify:track:4iV5W9uYEdYUVa79Axb7Rh"), { type: "track", id: "4iV5W9uYEdYUVa79Axb7Rh" });
  assert.equal(parseSpotifyLink("https://example.com/playlist/abc"), null);
  assert.match(embedSrc({ type: "playlist", id: "abc" }), /^https:\/\/open\.spotify\.com\/embed\/playlist\/abc\?/);
});

test("pkce challenge matches the RFC 7636 sample", async () => {
  const challenge = await codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
  assert.equal(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.equal(premiumRequired({ status: 403, body: { error: { reason: "PREMIUM_REQUIRED" } } }), true);
  assert.equal(premiumRequired({ status: 200, body: {} }), false);
});
