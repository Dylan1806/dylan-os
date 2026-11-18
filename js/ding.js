// Synthesized check chime. Tuned against a phone recording of a short bell,
// which was a single note (not a two-note figure): ~1328 Hz plus weaker partials.

export const DING = {
  attack: 0.005,
  decay: 0.45,
  volume: 0.2,
  partials: [
    { freq: 1328, gain: 1 },
    { freq: 2662, gain: 0.42 },
    { freq: 1675, gain: 0.34 },
    { freq: 1990, gain: 0.14 },
    { freq: 3653, gain: 0.08 },
  ],
};

export function soundEnabled(stored) {
  return stored !== "0" && stored !== "false";
}

let context = null;

function audioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!context) context = new Ctx();
  if (context.state === "suspended") context.resume();
  return context;
}

export function playCheckDing(enabled = true) {
  if (!enabled) return false;
  const ctx = audioContext();
  if (!ctx) return false;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(DING.volume, now);
  master.connect(ctx.destination);
  for (const partial of DING.partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(partial.freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(partial.gain, now + DING.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + DING.decay);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + DING.decay + 0.05);
  }
  return true;
}
