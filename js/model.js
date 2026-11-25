// Turns Todoist payloads into the view model. No account data is hardcoded.

import {
  addDays,
  assignmentStatus,
  dueParts,
  eachDay,
  findTime,
  formatHours,
  mondayOf,
  parseDays,
  parseTime,
  relative,
  weekEnd,
} from "./dates.js";

export const CAT = ["#4C7BF4", "#E5A50A", "#2BB5C9", "#9AA0A6", "#7A5AF8", "#3DAA6B"];

export const OS_PROJECT = "Dylan OS";
export const DIGEST_PROJECT = "ROTC Digest To Do";

export const SECTION_NAMES = [
  "Taskers",
  "A1 To-Do",
  "Team: ACDO",
  "Team: PARO",
  "Team: DEVO",
  "Assignments",
  "Exams",
  "Meetings",
  "Workouts",
  "Goals",
  "Habits",
  "Courses",
  "Spring 2027",
  "Life Areas",
];

export const TEAM_SECTIONS = ["Team: ACDO", "Team: PARO", "Team: DEVO"];

const TYPE_MAP = {
  homework: "Homework",
  exam: "Exam",
  quiz: "Quiz",
  lab: "Lab",
  prelab: "Prelab",
  reading: "Reading",
  report: "Report",
  paper: "Paper",
  project: "Project",
  practice: "Practice",
  "in-class": "In-class",
  inclass: "In-class",
  brief: "Brief",
  finals: "Finals",
};

const NON_COURSE = new Set([
  ...Object.keys(TYPE_MAP),
  "school", "rotc", "life", "tasker", "workout", "goal", "habit", "area", "course",
  "acdo", "paro", "devo", "lift", "run", "spring2027",
]);

const AREA_MAP = { school: "School", rotc: "ROTC", life: "Life" };
const ICONS = new Set(["gear", "heat", "beam", "gauge", "star"]);
const TONES = new Set(["success", "warning", "danger", "accent", "neutral"]);

export function str(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function canon(value) {
  return str(value).trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function parseMeta(description) {
  const text = str(description).trim();
  if (!text) return {};
  const candidates = [text, ...text.split(/\r?\n/).map((line) => line.trim())];
  for (const line of candidates) {
    const start = line.indexOf("{");
    const end = line.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    try {
      const value = JSON.parse(line.slice(start, end + 1));
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {
      // try the next line
    }
  }
  return {};
}

export function taskLabels(task) {
  const raw = task?.labels || task?.label_names || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((label) => (typeof label === "string" ? label : str(label?.name))).filter(Boolean);
}

export function priorityLabel(priority) {
  return { 4: "p1", 3: "p2", 2: "p3", 1: "p4" }[Number(priority)] || "p4";
}

export function hexColor(value) {
  const s = str(value).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toUpperCase();
  return "";
}

function dateOnly(value) {
  const match = str(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function resolveType(meta, labels) {
  const fromMeta = TYPE_MAP[canon(meta.type)];
  if (fromMeta) return fromMeta;
  for (const label of labels) {
    const mapped = TYPE_MAP[canon(label)];
    if (mapped) return mapped;
  }
  return "";
}

function resolveCourse(meta, labels) {
  const direct = str(meta.course) || str(meta.code);
  if (direct) return direct;
  return labels.find((label) => !NON_COURSE.has(canon(label))) || "";
}

function resolveArea(meta, labels) {
  if (AREA_MAP[canon(meta.area)]) return AREA_MAP[canon(meta.area)];
  for (const label of labels) if (AREA_MAP[canon(label)]) return AREA_MAP[canon(label)];
  return "";
}

function durationMinutes(raw) {
  const amount = Number(raw?.duration?.amount);
  const unit = canon(raw?.duration?.unit);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (unit === "day") return amount * 24 * 60;
  return amount;
}

export function normalizeTask(raw, sectionName = "") {
  const meta = parseMeta(raw?.description);
  const due = dueParts(raw?.due);
  const labels = taskLabels(raw);
  const metaTime = parseTime(meta.time) != null ? formatHours(parseTime(meta.time)) : "";
  return {
    id: str(raw?.id),
    content: str(raw?.content) || "(no title)",
    addedAt: str(raw?.added_at),
    completedCount: Number(raw?.completed_count) || 0,
    dueString: str(raw?.due?.string),
    meta,
    labels,
    date: due.date,
    time: metaTime || due.time,
    priority: priorityLabel(raw?.priority),
    section: sectionName,
    completed: !!raw?.completed,
    childOrder: Number(raw?.child_order) || 0,
    typeLabel: resolveType(meta, labels),
    course: resolveCourse(meta, labels),
    area: resolveArea(meta, labels),
    dueLabel: str(meta.dueLabel),
    source: str(meta.source),
    note: str(meta.note),
    role: str(meta.role),
    member: str(meta.member),
    checkIn: str(meta.checkIn),
    horizon: canon(meta.horizon),
    detail: str(meta.detail),
    kind: canon(meta.kind),
    startHour: parseTime(meta.start),
    endHour: parseTime(meta.end),
    durationMinutes: durationMinutes(raw),
    target: Number(meta.target),
    matchLabel: canon(meta.matchLabel),
    code: str(meta.code),
    name: str(meta.name),
    color: hexColor(meta.color),
    emoji: str(meta.emoji),
    icon: ICONS.has(canon(meta.icon)) ? canon(meta.icon) : "gear",
    term: str(meta.term),
    studyStart: dateOnly(meta.studyStart),
    endDate: dateOnly(meta.endDate),
    location: str(meta.location),
    meetings: Array.isArray(meta.meetings) ? meta.meetings : [],
    firstDay: dateOnly(meta.firstDay) || due.date,
    lastDay: dateOnly(meta.lastDay),
    noClass: Array.isArray(meta.noClass) ? meta.noClass : [],
    finalsNote: str(meta.note),
    tab: canon(meta.tab),
    owner: str(meta.owner),
    next: str(meta.next),
    status: str(meta.status),
    tone: TONES.has(canon(meta.tone)) ? canon(meta.tone) : "neutral",
  };
}

function byDate(a, b) {
  const da = a.date || "9999-99-99";
  const db = b.date || "9999-99-99";
  if (da !== db) return da < db ? -1 : 1;
  if (a.childOrder !== b.childOrder) return a.childOrder - b.childOrder;
  return a.content.localeCompare(b.content);
}

function isFinals(task) {
  return task.typeLabel === "Finals" || task.kind === "finals" || task.labels.some((label) => canon(label) === "finals");
}

function lifeKind(task) {
  if (task.kind === "project" || task.labels.some((label) => canon(label) === "project")) return "project";
  if (task.kind === "area" || task.labels.some((label) => canon(label) === "area")) return "area";
  if (task.owner || task.status || (task.meta && task.meta.tone)) return "project";
  return "area";
}

export function workoutKind(task) {
  if (task.kind === "lift" || task.kind === "run") return task.kind;
  const labels = task.labels.map(canon);
  if (labels.includes("lift")) return "lift";
  if (labels.includes("run")) return "run";
  return "";
}

export function meetingKind(task) {
  if (task.kind === "paro" || task.kind === "meeting") return task.kind;
  if (task.labels.some((label) => canon(label) === "paro")) return "paro";
  return "meeting";
}

export function sameCourse(task, code) {
  return !!code && task.course.toLowerCase() === String(code).toLowerCase();
}

export function shortName(value) {
  return str(value).split(" (")[0];
}

export function studyStartFor(task) {
  if (task.studyStart) return task.studyStart;
  if (task.typeLabel === "Exam" && task.date) return addDays(task.date, -8);
  return "";
}

export function courseColor(courses, code) {
  const index = courses.findIndex((course) => course.code.toLowerCase() === String(code || "").toLowerCase());
  if (index === -1) return CAT[0];
  return courses[index].color || CAT[index % CAT.length];
}

export function avatarColor(name) {
  let hash = 0;
  const text = str(name);
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return CAT[hash % CAT.length];
}

export function initials(name) {
  const parts = str(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function mostCommon(values) {
  const counts = new Map();
  for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1);
  let best = "";
  let n = 0;
  for (const [value, count] of counts) if (count > n) { best = value; n = count; }
  return best;
}

function expandNoClass(list) {
  const out = [];
  for (const item of list || []) {
    if (typeof item === "string") {
      const ends = item.split("..");
      if (ends.length === 2 && dateOnly(ends[0]) && dateOnly(ends[1])) out.push(...eachDay(dateOnly(ends[0]), dateOnly(ends[1])));
      else if (dateOnly(item) && item.trim() === dateOnly(item)) out.push(dateOnly(item));
      else {
        const match = item.match(/(\d{4}-\d{2}-\d{2}).+(\d{4}-\d{2}-\d{2})/);
        if (match) out.push(...eachDay(match[1], match[2]));
      }
    } else if (item && typeof item === "object") {
      out.push(...eachDay(dateOnly(item.start || item.from), dateOnly(item.end || item.to)));
    }
  }
  return out;
}

export function springWhen(meetings) {
  return (meetings || []).map((meeting) => {
    const days = parseDays(meeting?.days ?? meeting?.day);
    const labels = days.map((index) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]).join(" ");
    const start = parseTime(meeting?.start);
    const end = parseTime(meeting?.end);
    const clock = start == null ? "" : `${formatHours(start)}–${formatHours(end)}`;
    const rawDays = str(meeting?.days ?? meeting?.day);
    return [labels || rawDays, clock].filter(Boolean).join(" ");
  }).filter(Boolean).join("; ");
}

export function springWeekEvents(courses, weekStart) {
  const events = [];
  for (const course of courses) {
    const blocked = new Set(expandNoClass(course.noClass));
    for (const meeting of course.meetings) {
      const start = parseTime(meeting?.start);
      const end = parseTime(meeting?.end);
      if (start == null || end == null || end <= start) continue;
      for (const dow of parseDays(meeting?.days ?? meeting?.day)) {
        const offset = dow === 0 ? 6 : dow - 1;
        const date = addDays(weekStart, offset);
        if (blocked.has(date)) continue;
        events.push({ date, start, end, title: course.code || course.content });
      }
    }
  }
  return events;
}

export function workoutEvents(workouts, weekStart) {
  const endDay = addDays(weekStart, 6);
  const events = [];
  for (const task of workouts) {
    if (!task.date || task.date < weekStart || task.date > endDay || task.startHour == null) continue;
    let end = task.endHour;
    if (end == null) end = task.startHour + ((task.durationMinutes || 60) / 60);
    if (end <= task.startHour) end = task.startHour + 1;
    events.push({ date: task.date, start: task.startHour, end, title: task.content });
  }
  return events;
}

export function calendarEvents({ assignments = [], exams = [], finals = [], meetings = [], workouts = [], month, filter = "all", course = "" }) {
  const out = [];
  const inMonth = (date) => !!date && date.startsWith(month);
  const want = (name) => !course && (filter === "all" || filter === name);
  if (course || want("school")) {
    const groups = new Map();
    for (const task of assignments) {
      if (!inMonth(task.date)) continue;
      if (course && !sameCourse(task, course)) continue;
      if (task.typeLabel === "Exam" || task.typeLabel === "Quiz") {
        out.push({ date: task.date, title: shortName(task.content) });
        continue;
      }
      const key = `${task.date}|${task.course}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    }
    for (const group of groups.values()) {
      const first = group[0];
      out.push({
        date: first.date,
        title: group.length === 1 ? `${first.course || "Items"}: ${first.content}` : `${first.course || "Items"}: ${group.length} items`,
      });
    }
    for (const task of exams) {
      if (!inMonth(task.date)) continue;
      if (course && !sameCourse(task, course)) continue;
      out.push({ date: task.date, title: shortName(task.content) });
    }
    for (const task of finals) {
      if (course && task.course && !sameCourse(task, course)) continue;
      for (const day of eachDay(task.date, task.endDate)) {
        if (inMonth(day)) out.push({ date: day, title: "Finals week" });
      }
    }
  }
  if (!course && want("rotc")) {
    for (const task of meetings) {
      if (!inMonth(task.date)) continue;
      out.push({ date: task.date, title: `${task.time ? `${task.time} ` : ""}${task.content}` });
    }
  }
  if (!course && want("life")) {
    for (const task of workouts) {
      if (!inMonth(task.date)) continue;
      const clock = task.startHour == null ? task.time : formatHours(task.startHour);
      out.push({ date: task.date, title: `${clock ? `${clock} ` : ""}${shortName(task.content)}` });
    }
  }
  return out;
}

function bucketTasks(sections, rawTasks) {
  const nameById = new Map((sections || []).map((section) => [str(section.id), str(section.name)]));
  const grouped = new Map(SECTION_NAMES.map((name) => [name, []]));
  const seen = new Set();
  for (const raw of rawTasks || []) {
    if (!raw || raw.is_deleted) continue;
    if (raw.checked && !raw.completed) continue;
    const id = str(raw.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = nameById.get(str(raw.section_id)) || "";
    const task = normalizeTask(raw, name);
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push(task);
  }
  return grouped;
}

export function buildModel({ sections = [], osTasks = [], digestTasks = [], completed = [], digestProjectId = "", today }) {
  const activeOs = (osTasks || []).filter((task) => task && !task.checked && !task.is_deleted);
  const activeDigest = (digestTasks || []).filter((task) => task && !task.checked && !task.is_deleted);
  const done = (completed || []).map((task) => ({ ...task, completed: true, checked: false }));
  const digestId = str(digestProjectId || (activeDigest.find(Boolean) || {}).project_id);
  const grouped = bucketTasks(sections, [...activeOs, ...done.filter((task) => !digestId || str(task.project_id) !== digestId)]);
  const present = new Set((sections || []).map((section) => str(section.name)));
  const missingSections = SECTION_NAMES.filter((name) => !present.has(name));

  const courses = (grouped.get("Courses") || []).slice().sort(byDate).map((task, index) => ({
    id: task.id,
    code: task.code || task.course || task.content,
    name: task.name || task.code || task.content,
    color: task.color || CAT[index % CAT.length],
    icon: task.icon,
    term: task.term,
    emoji: task.emoji,
    task,
  }));

  const assignments = (grouped.get("Assignments") || []).slice().sort(byDate);
  const examAll = (grouped.get("Exams") || []).slice().sort(byDate);
  const finals = examAll.filter(isFinals);
  const exams = examAll.filter((task) => !isFinals(task));
  const taskers = (grouped.get("Taskers") || []).slice().sort(byDate);
  const a1 = (grouped.get("A1 To-Do") || []).slice().sort(byDate);
  const teams = TEAM_SECTIONS.filter((name) => present.has(name)).map((name) => {
    const items = (grouped.get(name) || []).slice().sort((a, b) => a.childOrder - b.childOrder || a.content.localeCompare(b.content));
    const head = items.find((item) => item.role || item.member) || null;
    return {
      section: name,
      role: head?.role || name.replace(/^Team:\s*/, ""),
      member: head?.member || "",
      checkIn: items.map((item) => item.checkIn).find(Boolean) || "",
      items,
    };
  });
  const meetingTasks = (grouped.get("Meetings") || []).slice().sort(byDate);
  const workouts = (grouped.get("Workouts") || []).slice().sort((a, b) => byDate(a, b) || (a.startHour || 0) - (b.startHour || 0));
  const goals = (grouped.get("Goals") || []).slice().sort((a, b) => a.childOrder - b.childOrder);
  const habits = grouped.get("Habits") || [];
  const spring = (grouped.get("Spring 2027") || []).slice().sort((a, b) => a.childOrder - b.childOrder);
  const life = grouped.get("Life Areas") || [];
  const areas = life.filter((task) => lifeKind(task) === "area").sort((a, b) => a.childOrder - b.childOrder);
  const projects = life.filter((task) => lifeKind(task) === "project").sort((a, b) => a.childOrder - b.childOrder);
  const digestDone = done.filter((task) => digestId && str(task.project_id) === digestId);
  const digest = [...activeDigest.map((task) => normalizeTask(task, "")), ...digestDone.map((task) => normalizeTask(task, ""))].sort(byDate);

  const end = weekEnd(today);
  const start = mondayOf(today);
  const open = (list) => list.filter((task) => !task.completed);

  return {
    today,
    weekEnd: end,
    weekStart: start,
    missingSections,
    courses,
    termLabel: mostCommon(courses.map((course) => course.term)) || "Courses",
    assignments,
    exams,
    finals,
    taskers,
    a1,
    teams,
    meetings: meetingTasks,
    workouts,
    goals,
    habits,
    spring,
    springName: (sections || []).find((section) => str(section.name) === "Spring 2027")?.name || "Spring 2027",
    areas,
    projects,
    digest,
    reading: {
      present: present.has("Reading"),
      ...pickReading(grouped.get("Reading") || [], today),
    },
    completedCount: [...grouped.values()].flat().filter((task) => task.completed).length + digest.filter((task) => task.completed).length,
    counts: {
      upcomingAssignments: open(assignments).filter((task) => task.date >= today).length,
      upcomingWorkouts: open(workouts).filter((task) => task.date >= today).length,
      openTeamItems: teams.reduce((sum, team) => sum + open(team.items).length, 0),
    },
  };
}

export function readingProgress(chapter, chapters) {
  const total = Number(chapters);
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  let current = Number(chapter);
  if (!Number.isFinite(current) || current < 0) current = 0;
  current = Math.floor(current);
  if (safeTotal && current > safeTotal) current = safeTotal;
  const pct = safeTotal ? Math.round((current / safeTotal) * 100) : 0;
  return { chapter: current, chapters: safeTotal, pct, finished: safeTotal > 0 && current >= safeTotal };
}

export function incrementChapter(chapter, chapters) {
  const now = readingProgress(chapter, chapters);
  if (!now.chapters || now.finished) return now;
  return readingProgress(now.chapter + 1, now.chapters);
}

export function adjustChapter(chapter, chapters, delta) {
  const now = readingProgress(chapter, chapters);
  return readingProgress(now.chapter + Number(delta) || 0, now.chapters);
}

export function parseBookForm(input) {
  const title = str(input?.title).trim();
  const author = str(input?.author).trim();
  if (!title) return { error: "Add a title." };
  const chapters = Number(input?.chapters);
  const rawChapter = input?.chapter === "" || input?.chapter == null ? 0 : Number(input.chapter);
  if (!Number.isInteger(chapters) || chapters < 1) return { error: "Total chapters must be a whole number greater than 0." };
  if (!Number.isInteger(rawChapter) || rawChapter < 0 || rawChapter > chapters) return { error: "Current chapter must be between 0 and the total." };
  return { title, author, chapters, chapter: rawChapter };
}

export function bookDescription({ title, author, chapters, chapter, meta = {} }) {
  const body = { ...meta, type: "book", title, chapters, chapter };
  if (author) body.author = author;
  else delete body.author;
  return JSON.stringify(body);
}

// Audiobook tracks are optional. `chapter` counts finished tracks, and the
// prologue is track n 0, so the next listen is the track whose n equals chapter.
// chapter 0 means the prologue is next. A chapter past the last n has no next track.
//
// Several open books can sit in the Reading section at once. The one shown is
// the newest whose description has `"current": true`. Switching books writes
// that flag onto the chosen task and removes it from the others, leaving every
// other description field in place. If none is marked, the newest open book
// is shown. A finished (completed) book is not listed.
export function bookTracks(meta) {
  if (!Array.isArray(meta?.tracks)) return [];
  return meta.tracks
    .filter((item) => item && typeof item === "object" && Number.isFinite(Number(item.n)))
    .slice()
    .sort((a, b) => Number(a.n) - Number(b.n));
}

export function nextListen(meta) {
  const tracks = bookTracks(meta);
  if (!tracks.length) return null;
  let chapter = Number(meta?.chapter);
  if (!Number.isFinite(chapter) || chapter < 0) chapter = 0;
  chapter = Math.floor(chapter);
  return tracks.find((item) => Number(item.n) === chapter) || null;
}

export function nextListenLabel(track) {
  if (!track) return "";
  const n = Number(track.n);
  const title = str(track.title).trim();
  const name = n === 0 ? (title || "Prologue") : [`Ch ${n}`, title].filter(Boolean).join(" ");
  return `Next: ${name} · starts ${str(track.start).trim()} (${str(track.duration).trim()})`;
}

export function pickReading(tasks, today) {
  const open = (tasks || []).filter((task) => task && !task.completed);
  const books = open.filter((task) => canon(task.meta?.type) === "book");
  books.sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)) || (b.childOrder || 0) - (a.childOrder || 0));
  const marked = books.filter((book) => book.meta?.current === true);
  const book = (marked.length ? marked : books)[0] || null;
  const habits = open.filter((task) => canon(task.meta?.type) === "reading-habit");
  habits.sort((a, b) => String(a.date || "9999-99-99").localeCompare(String(b.date || "9999-99-99")));
  const habit = habits[0] || null;
  const progress = book ? readingProgress(book.meta?.chapter, book.meta?.chapters) : null;
  const tracks = book ? bookTracks(book.meta) : [];
  const doneToday = !!(habit && habit.date && today && habit.date > today);
  return { books, book, habit, progress, doneToday, tracks, nextListen: tracks.length ? nextListen(book.meta) : null };
}

export function habitTarget(habits, label) {
  const habit = (habits || []).find((task) => task.matchLabel === label || task.labels.some((item) => canon(item) === label));
  if (!habit || !Number.isFinite(habit.target)) return null;
  return habit.target;
}

export function tasksThisWeek(tasks, today) {
  const end = weekEnd(today);
  return tasks.filter((task) => !task.date || task.date <= end).sort(byDate);
}

export function deadlineTone(date, today) {
  return relative(date, today);
}

export { assignmentStatus, relative };
