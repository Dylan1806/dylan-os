// Synthesized check chime. One bell note, pitched a fourth above the recording
// and given the recording's long ring: a quick drop, then a tail to about 1s.

export const DING = {
  attack: 0.005,
  decay: 1,
  stop: 1.05,
  volume: 0.16,
  partials: [
    { freq: 1770, gain: 1, tail: 1 },
    { freq: 3540, gain: 0.38, tail: 0.55 },
    { freq: 2230, gain: 0.32, tail: 0.72 },
    { freq: 2650, gain: 0.12, tail: 0.48 },
    { freq: 4860, gain: 0.06, tail: 0.36 },
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

function scheduleRing(gain, peak, now, tail) {
  const floor = 0.0001;
  const dropped = Math.max(floor, peak * 0.355);
  gain.setValueAtTime(floor, now);
  gain.exponentialRampToValueAtTime(Math.max(floor, peak), now + DING.attack);
  gain.exponentialRampToValueAtTime(dropped, now + 0.1);
  if (tail > 0.55) gain.exponentialRampToValueAtTime(Math.max(floor, peak * 0.079), now + Math.min(0.5, tail - 0.05));
  gain.exponentialRampToValueAtTime(floor, now + tail);
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
    scheduleRing(gain.gain, partial.gain, now, partial.tail);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + DING.stop);
  }
  return true;
}
