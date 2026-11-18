// Synthesized check chime at the original pitch (~1328 Hz plus weaker partials).
// The long ring is scaled to 1.75s. A new check ducks the previous one.

export const DING = {
  attack: 0.005,
  decay: 1.75,
  stop: 1.8,
  volume: 0.16,
  maxVoices: 1,
  partials: [
    { freq: 1328, gain: 1, tail: 1.75 },
    { freq: 2662, gain: 0.42, tail: 0.97 },
    { freq: 1675, gain: 0.34, tail: 1.23 },
    { freq: 1990, gain: 0.14, tail: 0.81 },
    { freq: 3653, gain: 0.08, tail: 0.58 },
  ],
};

// Fundamental level relative to the peak, matched with exponential segments.
// Times are the 2.7s ring scaled by 1.75/2.7.
export const ENVELOPE = [
  [0, 0.0001],
  [0.005, 1],
  [0.2, 10 ** (-6 / 20)],
  [0.65, 10 ** (-12 / 20)],
  [1.17, 10 ** (-20 / 20)],
  [1.55, 10 ** (-30 / 20)],
  [1.75, 0.0001],
];

export function soundEnabled(stored) {
  return stored !== "0" && stored !== "false";
}

export function envelopeGain(time, tail = DING.decay) {
  const scale = tail / DING.decay;
  const points = [];
  for (const [mark, level] of ENVELOPE) {
    const at = mark <= DING.attack ? mark : DING.attack + (mark - DING.attack) * scale;
    const clamped = Math.min(tail, at);
    if (!points.length || clamped > points[points.length - 1][0] + 0.0005) points.push([clamped, level]);
  }
  if (time <= points[0][0]) return points[0][1];
  if (time >= tail) return 0.0001;
  for (let i = 1; i < points.length; i++) {
    const [t0, g0] = points[i - 1];
    const [t1, g1] = points[i];
    if (time <= t1) return g0 * ((g1 / g0) ** ((time - t0) / (t1 - t0)));
  }
  return 0.0001;
}

export function audibleUntil(thresholdDb = -35, sampleRate = 22050) {
  const duration = DING.stop;
  const count = Math.floor(duration * sampleRate);
  const samples = new Float32Array(count);
  for (const partial of DING.partials) {
    for (let i = 0; i < count; i++) {
      const time = i / sampleRate;
      if (time > partial.tail) continue;
      samples[i] += Math.sin(2 * Math.PI * partial.freq * time) * partial.gain * envelopeGain(time, partial.tail);
    }
  }
  const hop = Math.floor(0.05 * sampleRate);
  let peak = 1e-9;
  const windows = [];
  for (let i = 0; i + hop <= count; i += hop) {
    let sum = 0;
    for (let j = 0; j < hop; j++) sum += samples[i + j] ** 2;
    const rms = Math.sqrt(sum / hop);
    if (rms > peak) peak = rms;
    windows.push({ time: (i + hop / 2) / sampleRate, rms });
  }
  let last = 0;
  for (const window of windows) {
    if (20 * Math.log10(window.rms / peak) >= thresholdDb) last = window.time;
  }
  return last;
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
  const scale = tail / DING.decay;
  let last = -1;
  gain.setValueAtTime(floor, now);
  for (const [mark, level] of ENVELOPE) {
    const at = mark <= DING.attack ? mark : DING.attack + (mark - DING.attack) * scale;
    const when = Math.min(tail, at);
    if (when <= last + 0.001) continue;
    gain.exponentialRampToValueAtTime(Math.max(floor, peak * level), now + when);
    last = when;
  }
  if (last < tail - 0.001) gain.exponentialRampToValueAtTime(floor, now + tail);
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
