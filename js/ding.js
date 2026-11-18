// Synthesized check chime. Same fourth-higher bell as before, with the decay
// stretched so the fundamental rings for about 2.25s. A new check ducks the
// one still ringing so voices do not stack.

export const DING = {
  attack: 0.005,
  decay: 2.25,
  stop: 2.35,
  volume: 0.16,
  maxVoices: 1,
  partials: [
    { freq: 1770, gain: 1, tail: 2.25 },
    { freq: 3540, gain: 0.38, tail: 1.24 },
    { freq: 2230, gain: 0.32, tail: 1.62 },
    { freq: 2650, gain: 0.12, tail: 1.08 },
    { freq: 4860, gain: 0.06, tail: 0.81 },
  ],
};

export function soundEnabled(stored) {
  return stored !== "0" && stored !== "false";
}

let context = null;
let active = null;

function audioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!context) context = new Ctx();
  if (context.state === "suspended") context.resume();
  return context;
}

function scheduleRing(gain, peak, now, tail) {
  const floor = 0.0001;
  const rel = (mark) => Math.min(tail - 0.02, DING.attack + (mark - DING.attack) * (tail / DING.decay));
  gain.setValueAtTime(floor, now);
  gain.exponentialRampToValueAtTime(Math.max(floor, peak), now + DING.attack);
  const drop = rel(0.219);
  if (drop > DING.attack + 0.02) gain.exponentialRampToValueAtTime(Math.max(floor, peak * 0.355), now + drop);
  const mid = rel(1.12);
  if (mid > drop + 0.05) gain.exponentialRampToValueAtTime(Math.max(floor, peak * 0.079), now + mid);
  gain.exponentialRampToValueAtTime(floor, now + tail);
}

function duck(voice, now) {
  if (!voice) return;
  try {
    voice.gain.cancelScheduledValues(now);
    voice.gain.setValueAtTime(Math.max(0.0001, voice.gain.value || DING.volume), now);
    voice.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  } catch {
    // The previous voice may already have ended.
  }
  for (const osc of voice.oscs) {
    try { osc.stop(now + 0.06); } catch { /* already stopped */ }
  }
}

export function playCheckDing(enabled = true) {
  if (!enabled) return false;
  const ctx = audioContext();
  if (!ctx) return false;
  const now = ctx.currentTime;
  duck(active, now);
  const master = ctx.createGain();
  master.gain.setValueAtTime(DING.volume, now);
  master.connect(ctx.destination);
  const oscs = [];
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
    oscs.push(osc);
  }
  active = { gain: master.gain, oscs };
  return true;
}
