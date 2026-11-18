import assert from "node:assert/strict";
import test from "node:test";
import { sidebarClockParts } from "../js/dates.js";
import { DING, soundEnabled } from "../js/ding.js";
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

test("check ding rings about 2.25s at the same higher pitch", () => {
  assert.equal(DING.attack, 0.005);
  assert.ok(DING.decay >= 2.2 && DING.decay <= 2.4);
  assert.ok(DING.stop >= 2.3);
  assert.equal(DING.maxVoices, 1);
  assert.ok(DING.volume <= 0.25);
  assert.deepEqual(DING.partials.map((partial) => partial.freq), [1770, 3540, 2230, 2650, 4860]);
  assert.equal(DING.partials[0].gain, 1);
  assert.equal(DING.partials[0].tail, 2.25);
  assert.ok(Math.max(...DING.partials.slice(1).map((partial) => partial.tail)) < 2.25);
  assert.equal(soundEnabled(null), true);
  assert.equal(soundEnabled("1"), true);
  assert.equal(soundEnabled("0"), false);
});

test("pkce challenge matches the RFC 7636 sample", async () => {
  const challenge = await codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
  assert.equal(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.equal(premiumRequired({ status: 403, body: { error: { reason: "PREMIUM_REQUIRED" } } }), true);
  assert.equal(premiumRequired({ status: 200, body: {} }), false);
});
