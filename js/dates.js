// Calendar helpers. "Today" is always America/Chicago.

export const TZ = "America/Chicago";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

export function isoFromParts(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function utcMs(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso, n) {
  const dt = new Date(utcMs(iso));
  dt.setUTCDate(dt.getUTCDate() + n);
  return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function diffDays(date, today) {
  return Math.round((utcMs(date) - utcMs(today)) / 86400000);
}

export function weekdayIndex(iso) {
  return new Date(utcMs(iso)).getUTCDay();
}

export function weekEnd(today) {
  const dow = weekdayIndex(today);
  return addDays(today, (7 - dow) % 7);
}

export function mondayOf(today) {
  return addDays(today, -((weekdayIndex(today) + 6) % 7));
}

export function fd(iso) {
  if (!iso) return "";
  const dt = new Date(utcMs(iso));
  return `${DOW[dt.getUTCDay()]} ${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
}

export function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1).slice(0, 7);
}

export function monthCells(ym) {
  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [];
  const first = `${ym}-01`;
  for (let i = 0; i < firstDow; i++) cells.push({ iso: addDays(first, i - firstDow), inMonth: false });
  for (let d = 1; d <= count; d++) cells.push({ iso: `${ym}-${pad(d)}`, inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ iso: addDays(cells[cells.length - 1].iso, 1), inMonth: false });
  return cells;
}

export function eachDay(start, end) {
  const days = [];
  if (!start) return days;
  let d = start;
  const last = end && end >= start ? end : start;
  for (let guard = 0; d <= last && guard < 45; guard++) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function relative(date, today) {
  const n = diffDays(date, today);
  if (n < 0) return { text: `${-n} day${n === -1 ? "" : "s"} ago`, tone: "neutral" };
  if (n === 0) return { text: "Today", tone: "warning" };
  if (n === 1) return { text: "Tomorrow", tone: "warning" };
  return { text: `In ${n} days`, tone: "accent" };
}

export function assignmentStatus(date, today, end) {
  if (!date || date < today) return { label: "Due date passed", tone: "neutral" };
  if (date === today) return { label: "Due today", tone: "warning" };
  if (date <= end) return { label: "This week", tone: "accent" };
  return { label: "Upcoming", tone: "neutral" };
}

export function formatTime(hour, minute) {
  const h = ((hour % 24) + 24) % 24;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(minute)} ${ap}`;
}

export function formatHours(hours) {
  if (hours == null || Number.isNaN(hours)) return "";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60) % 60;
  return formatTime(h, m);
}

export function parseTime(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim();
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap]m)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || 0);
    const ap = ampm[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h > 23 || m > 59) return null;
    return h + m / 60;
  }
  const hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (h > 23 || m > 59) return null;
    return h + m / 60;
  }
  return null;
}

export function findTime(value) {
  const direct = parseTime(value);
  if (direct != null) return direct;
  const s = String(value || "");
  const ampm = s.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
  if (ampm) return parseTime(`${ampm[1]}:${ampm[2] || "00"} ${ampm[3]}`);
  const hm = s.match(/(\d{1,2}):(\d{2})/);
  if (hm) return parseTime(`${hm[1]}:${hm[2]}`);
  return null;
}

export function chicagoParts(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function chicagoToday(date = new Date()) {
  return chicagoParts(date).iso;
}

export function sidebarClockParts(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
  return {
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    date: `${dow} ${mon} ${date.getDate()}`,
  };
}

export function analogAngles(date) {
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;
  return { hour: hours * 30, minute: minutes * 6, second: seconds * 6 };
}

export function clockText(date = new Date()) {
  const time = date.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  const day = date.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" });
  return { time, date: `${day} · (CT)` };
}

export function chicagoHour(date = new Date()) {
  const p = chicagoParts(date);
  return p.hour + p.minute / 60;
}

function zoneOffsetMs(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  let hour = Number(p.hour);
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
  return asUtc - date.getTime();
}

export function zonedMidnightUtc(isoDate, timeZone = TZ) {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, 0, 0, 0);
  let ms = utcGuess - zoneOffsetMs(new Date(utcGuess), timeZone);
  const again = zoneOffsetMs(new Date(ms), timeZone);
  ms = utcGuess - again;
  return new Date(ms);
}

export function dueParts(due) {
  if (!due) return { date: "", time: "" };
  let raw = typeof due === "string" ? due : String(due.date || due.datetime || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && due && due.datetime) raw = String(due.datetime);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { date: raw, time: "" };
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return { date: raw.slice(0, 10), time: "" };
  const zoned = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  if (zoned) {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return { date: m[1], time: "" };
    const c = chicagoParts(dt);
    return { date: c.iso, time: formatTime(c.hour, c.minute) };
  }
  return { date: m[1], time: formatTime(Number(m[2]), Number(m[3])) };
}

const DAY_WORDS = [
  ["thursday", 4], ["thu", 4], ["thurs", 4], ["th", 4],
  ["tuesday", 2], ["tues", 2], ["tue", 2],
  ["monday", 1], ["mon", 1],
  ["wednesday", 3], ["wed", 3],
  ["friday", 5], ["fri", 5],
  ["saturday", 6], ["sat", 6],
  ["sunday", 0], ["sun", 0],
];

function dayToken(token) {
  const t = String(token || "").toLowerCase().replace(/\.$/, "");
  if (!t) return [];
  for (const [word, index] of DAY_WORDS) if (t === word) return [index];
  if (t === "m") return [1];
  if (t === "t") return [2];
  if (t === "w") return [3];
  if (t === "f") return [5];
  if (/^[mtwhfsu]+$/i.test(token)) return compactDays(token);
  return [];
}

function compactDays(s) {
  const out = [];
  const chars = String(s);
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const n = chars[i + 1] || "";
    if ((c === "T" || c === "t") && (n === "h" || n === "H")) { out.push(4); i++; continue; }
    if ((c === "S" || c === "s") && (n === "a" || n === "A")) { out.push(6); i++; continue; }
    if ((c === "S" || c === "s") && (n === "u" || n === "U")) { out.push(0); i++; continue; }
    const map = { M: 1, m: 1, T: 2, t: 2, W: 3, w: 3, F: 5, f: 5 };
    if (map[c] != null) out.push(map[c]);
  }
  return out;
}

export function parseDays(days) {
  if (Array.isArray(days)) return [...new Set(days.flatMap(parseDays))];
  const s = String(days ?? "").trim();
  if (!s) return [];
  const one = dayToken(s);
  if (one.length && DAY_WORDS.some(([word]) => word === s.toLowerCase())) return one;
  if (/[\s,/&+]/.test(s) || /\band\b/i.test(s)) {
    return [...new Set(s.split(/[\s,/&]+|\band\b/i).flatMap((tok) => dayToken(tok)))];
  }
  return [...new Set(compactDays(s))];
}

export const DOW_SHORT = DOW;
