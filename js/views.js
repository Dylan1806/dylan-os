import { h, svgEl } from "./dom.js";
import {
  avatarColor,
  calendarEvents,
  courseColor,
  habitTarget,
  initials,
  readingProgress,
  meetingKind,
  sameCourse,
  shortName,
  springWeekEvents,
  springWhen,
  studyStartFor,
  tasksThisWeek,
  workoutEvents,
  workoutKind,
} from "./model.js";
import {
  addDays,
  assignmentStatus,
  chicagoHour,
  clockText,
  diffDays,
  DOW_SHORT,
  fd,
  formatHours,
  monthCells,
  relative,
  shiftMonth,
  weekdayIndex,
} from "./dates.js";

const BROWN = "#4A3A30";
const NAVY = "#1F3864";
const MAROON = "#4E2A28";
const CAT0 = "#4C7BF4";
const CAT1 = "#E5A50A";

const TYPE_COLOR = {
  Homework: "#7A3B55",
  Exam: "#8A4B1E",
  Quiz: "#8A6A12",
  Lab: "#2F6B45",
  Prelab: "#2F5E6B",
  Reading: "#2E4F8A",
  Report: "#5B3F86",
  Paper: "#5B3F86",
  Project: "#3D6B2F",
  Practice: "#6B5A2F",
  "In-class": "#555555",
  Brief: "#1F3864",
  School: "#2E4F8A",
  ROTC: NAVY,
  Life: "#2F6B45",
  Finals: "#8A4B1E",
};

const TABS = [
  { value: "home", label: "🏠 Home" },
  { value: "school", label: "📚 School" },
  { value: "rotc", label: "✈️ ROTC (A1)" },
  { value: "life", label: "🏃 Life" },
];

function isChecked(state, task) {
  return !!(task.completed || state.pending.has(task.id));
}

function isHidden(state, task) {
  const gone = state.pending.get(task.id)?.phase === "gone";
  return (task.completed || gone) && !state.showCompleted;
}

function shown(state, list) {
  return (list || []).filter((task) => !isHidden(state, task));
}

function stillOpen(state, list) {
  return (list || []).filter((task) => !task.completed && state.pending.get(task.id)?.phase !== "gone");
}

function toneColor(tone) {
  if (tone === "warning") return "var(--warning)";
  if (tone === "accent") return "var(--accent)";
  if (tone === "danger") return "var(--danger)";
  return "var(--text-3)";
}

function cover() {
  const pines = [];
  for (let i = 0; i < 40; i++) {
    const x = i * 33 + (i % 3) * 7;
    const height = 34 + ((i * 37) % 30);
    pines.push(svgEl("polygon", { points: `${x},220 ${x + 12},${220 - height} ${x + 24},220`, fill: "#18222F" }));
  }
  return h("div", { class: "cover" }, svgEl("svg", { viewBox: "0 0 1280 220", preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": "Cover" },
    svgEl("defs", null, svgEl("linearGradient", { id: "sky", x1: "0", y1: "0", x2: "0", y2: "1" },
      svgEl("stop", { offset: "0", "stop-color": "#1B2A4A" }),
      svgEl("stop", { offset: "0.6", "stop-color": "#5D6F8F" }),
      svgEl("stop", { offset: "1", "stop-color": "#C9A57A" }),
    )),
    svgEl("rect", { width: "1280", height: "220", fill: "url(#sky)" }),
    svgEl("circle", { cx: "1040", cy: "70", r: "26", fill: "#F2E3C2", opacity: "0.85" }),
    svgEl("polygon", { points: "0,170 140,80 260,150 400,60 540,150 680,70 820,160 980,90 1120,150 1280,80 1280,220 0,220", fill: "#3E4C66" }),
    svgEl("polygon", { points: "0,190 180,120 330,180 500,110 700,185 880,125 1060,180 1280,120 1280,220 0,220", fill: "#2C3850" }),
    ...pines,
  ), analogClock());
}

function analogClock() {
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const major = i % 3 === 0;
    ticks.push(svgEl("line", {
      x1: "50",
      y1: major ? "8" : "11",
      x2: "50",
      y2: major ? "16" : "15",
      stroke: "rgba(255,255,255,0.88)",
      "stroke-width": major ? "2.4" : "1.2",
      "stroke-linecap": "round",
      transform: `rotate(${i * 30} 50 50)`,
    }));
  }
  const hand = (name, y1, y2, width, color) => svgEl("g", { "data-hand": name }, svgEl("line", {
    x1: "50",
    y1,
    x2: "50",
    y2,
    stroke: color,
    "stroke-width": width,
    "stroke-linecap": "round",
  }));
  return h("div", { class: "analog", "data-analog": "1", role: "img", "aria-label": "Local time" },
    svgEl("svg", { viewBox: "0 0 100 100" },
      svgEl("circle", { cx: "50", cy: "50", r: "47.5", fill: "#111111", stroke: "rgba(255,255,255,0.72)", "stroke-width": "2" }),
      svgEl("circle", { cx: "50", cy: "50", r: "41", fill: "none", stroke: "rgba(255,255,255,0.14)", "stroke-width": "1" }),
      ...ticks,
      hand("hour", "54", "30", "3.6", "#f5f5f5"),
      hand("minute", "56", "18", "2.3", "#f5f5f5"),
      hand("second", "60", "14", "1.15", "#ff7369"),
      svgEl("circle", { cx: "50", cy: "50", r: "2.8", fill: "#f5f5f5" }),
      svgEl("circle", { cx: "50", cy: "50", r: "1.3", fill: "#ff7369" }),
    ),
  );
}

function art(kind, color) {
  const common = { fill: "none", stroke: color, "stroke-width": "3" };
  let body = [];
  if (kind === "heat") {
    body = [
      svgEl("path", { ...common, d: "M50 30 Q70 15 90 30 T130 30 T170 30" }),
      svgEl("path", { ...common, d: "M30 50 Q50 35 70 50 T110 50 T150 50" }),
      svgEl("rect", { ...common, x: "40", y: "58", width: "120", height: "10", rx: "5" }),
    ];
  } else if (kind === "beam") {
    body = [
      svgEl("rect", { ...common, x: "35", y: "34", width: "130", height: "12" }),
      svgEl("polygon", { ...common, points: "45,46 35,62 55,62" }),
      svgEl("polygon", { ...common, points: "155,46 145,62 165,62" }),
      svgEl("line", { ...common, x1: "100", y1: "10", x2: "100", y2: "30" }),
      svgEl("polyline", { ...common, points: "94,24 100,32 106,24" }),
    ];
  } else if (kind === "gauge") {
    body = [
      svgEl("path", { ...common, d: "M60 64 A40 40 0 0 1 140 64" }),
      svgEl("line", { ...common, x1: "100", y1: "64", x2: "124", y2: "38" }),
      svgEl("circle", { ...common, cx: "100", cy: "64", r: "4" }),
    ];
  } else if (kind === "star") {
    body = [
      svgEl("polygon", { ...common, points: "100,12 108,34 132,34 113,48 120,70 100,56 80,70 87,48 68,34 92,34" }),
      svgEl("line", { ...common, x1: "30", y1: "44", x2: "72", y2: "44" }),
      svgEl("line", { ...common, x1: "128", y1: "44", x2: "170", y2: "44" }),
    ];
  } else {
    const teeth = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      teeth.push(svgEl("line", {
        ...common,
        x1: 80 + 20 * Math.cos(a),
        y1: 40 + 20 * Math.sin(a),
        x2: 80 + 27 * Math.cos(a),
        y2: 40 + 27 * Math.sin(a),
      }));
    }
    body = [
      svgEl("circle", { ...common, cx: "80", cy: "40", r: "20" }),
      svgEl("circle", { ...common, cx: "80", cy: "40", r: "7" }),
      svgEl("circle", { ...common, cx: "122", cy: "46", r: "13" }),
      svgEl("circle", { ...common, cx: "122", cy: "46", r: "4" }),
      ...teeth,
    ];
  }
  return svgEl("svg", { viewBox: "0 0 200 80", "aria-hidden": "true" }, ...body);
}

function bar(icon, title, color = BROWN) {
  return h("div", { class: "bar", style: { background: color } }, h("span", { "aria-hidden": "true" }, icon), h("span", null, title));
}

function card(children, tight = false) {
  return h("div", { class: tight ? "card tight" : "card" }, children);
}

function tag(label) {
  if (!label) return null;
  return h("span", { class: "tag", style: { background: TYPE_COLOR[label] || "#555555" } }, label);
}

function pill(tone, text) {
  return h("span", { class: `pill ${tone || "neutral"}` }, text);
}

function box(state, task, actions) {
  const on = isChecked(state, task);
  return h("button", {
    type: "button",
    class: "box",
    role: "checkbox",
    "aria-checked": on ? "true" : "false",
    "aria-label": `${on ? "Reopen" : "Complete"} ${task.content}`,
    onclick: (event) => {
      event.stopPropagation();
      if (task.completed || state.pending.get(task.id)?.phase === "gone") actions.reopen(task);
      else actions.complete(task);
    },
  }, h("span", { class: on ? "box-inner is-on" : "box-inner" }, on ? "✓" : ""));
}

function prog(value, max, color) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return h("div", { class: "prog" },
    h("div", { class: "track" }, h("div", { class: "fill", style: { width: `${Math.max(0, Math.min(100, pct))}%`, background: color } })),
    h("span", { class: "sub" }, `${pct}%`),
  );
}

function avatar(name, size) {
  return h("span", {
    class: "avatar",
    style: { width: `${size}px`, height: `${size}px`, background: avatarColor(name || "?") },
    "aria-hidden": "true",
  }, initials(name));
}

function segmented(options, value, onChange, label) {
  return h("div", { class: "seg", role: "tablist", "aria-label": label }, options.map((option) => h("button", {
    type: "button",
    role: "tab",
    "aria-selected": option.value === value ? "true" : "false",
    onclick: () => onChange(option.value),
  }, option.label)));
}

function empty(text) {
  return card(h("span", { class: "sub" }, text));
}

function clock() {
  const now = clockText();
  return h("div", { class: "card clock" },
    h("div", { class: "clock-time", "data-clock": "time" }, now.time),
    h("div", { class: "clock-date", "data-clock": "date" }, now.date),
  );
}

function col(grow, basis, ...children) {
  return h("div", { class: "col", style: { flex: `${grow} 1 ${basis}px` } }, children);
}

function deadlineCell(task, today) {
  if (!task.date) return h("td", null, "");
  const rel = relative(task.date, today);
  return h("td", { class: "nowrap", style: { color: toneColor(rel.tone) } }, rel.text);
}

function courseCards(state, actions, { selectable }) {
  const { model } = state;
  return h("div", { class: "gallery" }, model.courses.filter((course) => !course.task.completed).map((course) => {
    const items = stillOpen(state, model.assignments).filter((task) => sameCourse(task, course.code));
    const passed = items.filter((task) => task.date && task.date < model.today).length;
    const upcoming = items.filter((task) => !task.date || task.date >= model.today);
    const nextExam = stillOpen(state, model.exams)
      .filter((task) => sameCourse(task, course.code) && task.date >= model.today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const color = courseColor(model.courses, course.code);
    const selected = selectable && state.course === course.code;
    return h("button", {
      type: "button",
      class: selected ? "course is-selected" : "course",
      onclick: () => actions.openCourse(course.code),
    },
      h("div", { class: "art", style: { background: `${color}26` } }, art(course.icon, color)),
      h("div", { class: "course-body" },
        h("div", { class: "course-code" }, course.code),
        h("div", { class: "pills" },
          pill("neutral", course.term || "Course"),
          items.length === 0 ? pill("neutral", "No due dates") : upcoming.length ? pill("accent", `${upcoming.length} upcoming`) : pill("success", "All due dates passed"),
        ),
        nextExam ? h("div", { class: "sub" }, `Next: ${shortName(nextExam.content)} · ${fd(nextExam.date)}`) : null,
        prog(passed, items.length, color),
        h("div", { class: "sub" }, items.length ? `${passed} of ${items.length} due dates passed` : "0 due dates"),
      ),
    );
  }));
}

function assignTable(state, actions, list, showCourse) {
  if (!list.length) return empty("Nothing due this week.");
  const { today, weekEnd } = state.model;
  return h("div", { class: "table-wrap" }, h("table", null,
    h("thead", null, h("tr", null,
      h("th", { class: "check" }),
      h("th", null, "Assignment"),
      h("th", null, "Type"),
      h("th", null, "Status"),
      h("th", null, "Due date"),
      h("th", null, "Deadline"),
      showCourse ? h("th", null, "Course") : null,
    )),
    h("tbody", null, list.map((task) => {
      const status = assignmentStatus(task.date, today, weekEnd);
      const on = isChecked(state, task);
      return h("tr", { class: on ? "is-done" : "" },
        h("td", { class: "check" }, box(state, task, actions)),
        h("td", { class: on ? "strike on" : "" }, task.content),
        h("td", null, tag(task.typeLabel || "Task")),
        h("td", null, pill(status.tone, status.label)),
        h("td", { class: "nowrap" }, task.date ? `${fd(task.date)}${task.time ? `, ${task.time}` : ""}` : ""),
        deadlineCell(task, today),
        showCourse ? h("td", { class: "nowrap" }, task.course) : null,
      );
    })),
  ));
}

function taskList(state, actions, list) {
  const rows = shown(state, list);
  if (!rows.length) return empty("All checked off.");
  const today = state.model.today;
  return card(rows.map((task) => {
    const on = isChecked(state, task);
    return h("div", { class: on ? "task-row is-done" : "task-row" },
      box(state, task, actions),
      h("div", { class: on ? "task-main strike on" : "task-main" }, task.content),
      h("div", { class: "task-side" },
        h("span", { class: "sub nowrap", style: { color: task.date === today ? "var(--warning)" : "var(--text-2)" } }, task.date ? (task.date === today ? "Today" : fd(task.date)) : ""),
        tag(task.area || task.typeLabel),
      ),
    );
  }), true);
}

function examList(state, actions, list) {
  const rows = shown(state, list);
  if (!rows.length) return empty("Nothing coming up.");
  const today = state.model.today;
  return card(rows.map((task) => {
    const past = task.date && task.date < today;
    const start = studyStartFor(task);
    const rel = task.date ? relative(task.date, today) : null;
    const on = isChecked(state, task);
    return h("div", { class: past || on ? "exam is-done" : "exam" },
      box(state, task, actions),
      h("div", { style: { flex: "1", minWidth: "0" } },
        h("div", { class: "exam-top" },
          h("span", { class: on ? "title-500 strike on" : "title-500" }, task.content),
          tag(task.typeLabel || "Exam"),
        ),
        h("div", { class: "sub" }, [task.course, task.date ? fd(task.date) : "", task.time, start ? `study from ${fd(start)}` : ""].filter(Boolean).join(" · ")),
        !past && rel ? h("div", { class: "mt6" }, pill(rel.tone === "warning" ? "warning" : "accent", rel.text)) : null,
      ),
    );
  }), true);
}

function monthView(state, actions, events, month) {
  const cells = monthCells(month);
  const byDate = new Map();
  for (const event of events) {
    if (!byDate.has(event.date)) byDate.set(event.date, []);
    byDate.get(event.date).push(event);
  }
  const selected = state.selectedDay && state.selectedDay.startsWith(month) ? state.selectedDay : "";
  return h("div", null,
    h("div", { class: "month" },
      DOW_SHORT.map((name) => h("div", { class: "dow" }, name)),
      cells.map((cell) => {
        const dayEvents = byDate.get(cell.iso) || [];
        const extra = dayEvents.length - 3;
        return h("button", {
          type: "button",
          class: `day${cell.inMonth ? "" : " out"}${weekdayIndex(cell.iso) === 0 ? " col0" : ""}`,
          onclick: () => actions.selectDay(cell.iso),
        },
          h("div", { class: cell.iso === state.model.today ? "day-num is-today" : "day-num" }, String(Number(cell.iso.slice(8)))),
          h("div", { class: "chips" }, dayEvents.slice(0, 3).map((event) => h("span", { class: "chip" }, event.title))),
          extra > 0 ? h("span", { class: "more" }, `+${extra} more`) : null,
          dayEvents.length ? h("div", { class: "dots" }, dayEvents.slice(0, 4).map(() => h("span", { class: "dot" }))) : null,
        );
      }),
    ),
    selected ? h("div", { class: "card day-panel" },
      h("div", { class: "sub mb6" }, fd(selected)),
      (byDate.get(selected) || []).length
        ? (byDate.get(selected) || []).map((event) => h("div", { class: "sub" }, event.title))
        : h("div", { class: "sub" }, "Nothing scheduled."),
    ) : null,
  );
}

function placeEvents(events) {
  const sorted = events.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const ends = [];
  const placed = sorted.map((event) => {
    let col = ends.findIndex((end) => end <= event.start + 0.01);
    if (col < 0) {
      col = ends.length;
      ends.push(event.end);
    } else ends[col] = event.end;
    return { ...event, col };
  });
  const cols = Math.max(1, ends.length);
  return placed.map((event) => ({ ...event, cols }));
}

function weekView(state, weekStart, gridStart, gridEnd, events, { showNow }) {
  const rows = gridEnd - gridStart;
  const days = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(weekStart, offset));
  const today = state.model.today;
  const now = chicagoHour();
  const showLine = showNow && days.includes(today) && now >= gridStart && now <= gridEnd;
  return h("div", { class: "week-scroll" }, h("div", { class: "week", style: { "--rows": String(rows) } },
    h("div", { class: "week-corner" }),
    days.map((date) => h("div", { class: date === today ? "week-head is-today" : "week-head" },
      h("span", null, DOW_SHORT[weekdayIndex(date)]),
      h("span", null, `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`),
    )),
    h("div", { class: "week-gutter" }, Array.from({ length: rows + 1 }, (_, index) => {
      const hour = gridStart + index;
      if (hour > gridEnd) return null;
      const labelHour = ((hour % 24) + 24) % 24;
      const ap = labelHour >= 12 ? "PM" : "AM";
      const h12 = labelHour % 12 === 0 ? 12 : labelHour % 12;
      return h("div", { class: "hour-label", style: { top: `${index * 40}px` } }, `${h12} ${ap}`);
    })),
    days.map((date) => {
      const mine = placeEvents(events.filter((event) => event.date === date && event.end > gridStart && event.start < gridEnd));
      return h("div", { class: "day-col" }, mine.map((event) => {
        const start = Math.max(event.start, gridStart);
        const end = Math.min(event.end, gridEnd);
        return h("div", {
          class: "block",
          style: {
            top: `${(start - gridStart) * 40}px`,
            height: `${Math.max(16, (end - start) * 40)}px`,
            left: `calc(${event.col} * (100% / ${event.cols}) + 2px)`,
            width: `calc(100% / ${event.cols} - 4px)`,
          },
        }, `${event.title} ${formatHours(event.start)}–${formatHours(event.end)}`);
      }));
    }),
    showLine ? h("div", { class: "now-line", "data-now": "line", style: { top: `${36 + (now - gridStart) * 40}px` } }) : null,
  ));
}

function goalsBlock(state, actions, color) {
  const groups = [
    ["week", "This week"],
    ["semester", "This semester"],
    ["year", "This year"],
  ];
  return h("div", null,
    bar("🎯", "My goals", color),
    h("div", { class: "goals" }, groups.map(([horizon, title]) => {
      const items = shown(state, state.model.goals.filter((task) => {
        if (horizon === "semester") return task.horizon === "semester" || !["week", "month", "year"].includes(task.horizon);
        return task.horizon === horizon;
      }));
      return card([
        h("div", { class: "title-500 mb8" }, title),
        items.length ? items.map((task) => {
          const on = isChecked(state, task);
          return h("div", { class: on ? "goal-row is-done" : "goal-row" },
            box(state, task, actions),
            h("span", { class: on ? "strike on" : "" }, task.content),
          );
        }) : h("div", { class: "slot" }, "Open slot: no goals yet."),
      ]);
    })),
  );
}

function calendarBlock(state, actions, color) {
  const model = state.model;
  const month = state.month;
  const thisMonth = model.today.slice(0, 7);
  const events = calendarEvents({
    assignments: stillOpen(state, model.assignments),
    exams: stillOpen(state, model.exams),
    finals: model.finals.filter((task) => !task.completed),
    meetings: stillOpen(state, model.meetings),
    workouts: stillOpen(state, model.workouts),
    month,
    filter: state.calFilter,
  });
  return h("div", null,
    bar("🗓️", "Calendar", color),
    h("div", { class: "filters" },
      segmented([
        { value: thisMonth, label: "This month" },
        { value: shiftMonth(thisMonth, 1), label: "Next month" },
      ], month, actions.setMonth, "Month"),
      segmented([
        { value: "all", label: "All" },
        { value: "school", label: "School" },
        { value: "rotc", label: "ROTC" },
        { value: "life", label: "Workouts" },
      ], state.calFilter, actions.setCalFilter, "Calendar filter"),
    ),
    monthView(state, actions, events, month),
  );
}

function home(state, actions) {
  const { model } = state;
  const weekTasks = tasksThisWeek(model.a1, model.today);
  const weekAssign = shown(state, model.assignments.filter((task) => task.date >= model.today && task.date <= model.weekEnd));
  const upcomingExams = model.exams.filter((task) => task.date >= model.today);
  const workouts = stillOpen(state, model.workouts).filter((task) => task.date >= model.today).sort((a, b) => a.date.localeCompare(b.date) || (a.startHour || 0) - (b.startHour || 0));
  const todaySessions = workouts.filter((task) => task.date === model.today);
  const next = workouts[0];
  return h("div", { class: "stack" },
    h("div", { class: "row" },
      col(1, 230,
        clock(),
        h("div", null,
          bar("🧭", "Navigation"),
          card([
            ...TABS.filter((tab) => tab.value !== "home").map((tab) => h("button", { type: "button", class: "nav-item", onclick: () => actions.setTab(tab.value) }, tab.label)),
            ...(state.settings.links || []).map((link) => h("a", { class: "ext", href: link.href, target: "_blank", rel: "noreferrer" }, `↗ ${link.label}`)),
          ], true),
        ),
        h("div", null,
          bar("🪪", "Personal"),
          card((state.settings.personal || []).length
            ? state.settings.personal.map((row) => h("div", { class: "kv" }, h("span", { class: "sub" }, row.label), h("span", null, row.value)))
            : h("div", { class: "sub" }, "Saved on this device only. Add a row in Settings.")),
        ),
      ),
      col(2.4, 420,
        h("div", null, bar("🎓", "Courses right now"), model.courses.length ? courseCards(state, actions, { selectable: false }) : empty("No courses yet.")),
        h("div", null, bar("✅", "Tasks this week"), taskList(state, actions, weekTasks)),
        h("div", null, bar("📝", "Assignments this week"), assignTable(state, actions, weekAssign, true)),
      ),
      col(1, 230,
        h("div", null, bar("⏳", "Upcoming exams"), examList(state, actions, upcomingExams)),
        h("div", null,
          bar("💪", "Habits today", MAROON),
          card([
            h("div", { class: "title-500" }, todaySessions.length ? `Today: ${todaySessions.map((task) => task.content).join("; ")}` : "Today: rest day"),
            next ? h("div", { class: "sub" }, `Next: ${fd(next.date)} ${next.time || formatHours(next.startHour) || ""}, ${next.content}`.replace(" ,", ",")) : null,
          ]),
        ),
        h("div", null,
          bar("👥", "Team check-ins", NAVY),
          model.teams.length ? card(model.teams.map((team) => h("button", {
            type: "button",
            class: "nav-item checkin",
            onclick: () => actions.setTab("rotc"),
          },
            avatar(team.member || team.role, 28),
            h("span", { style: { flex: "1", textAlign: "left" } },
              h("span", { style: { display: "block", fontSize: "13px" } }, team.member || team.role),
              h("span", { class: "sub" }, `${team.role} · ${shown(state, stillOpen(state, team.items)).length} open`),
            ),
            team.checkIn ? pill("warning", team.checkIn) : null,
          )), true) : empty("No team sections yet."),
        ),
      ),
    ),
    goalsBlock(state, actions, BROWN),
    calendarBlock(state, actions, BROWN),
  );
}

function school(state, actions) {
  const { model } = state;
  const code = state.course;
  const course = model.courses.find((item) => item.code === code);
  const all = shown(state, model.assignments.filter((task) => sameCourse(task, code)));
  const visibleAssign = state.scope === "all" ? all : all.filter((task) => !task.date || task.date >= model.today);
  const topics = shown(state, model.assignments.filter((task) => sameCourse(task, code) && task.typeLabel === "Reading"));
  const exams = shown(state, model.exams.filter((task) => sameCourse(task, code)));
  const finals = model.finals.find((task) => !task.course || sameCourse(task, code)) || model.finals[0];
  const thisMonth = model.today.slice(0, 7);
  const events = calendarEvents({
    assignments: stillOpen(state, model.assignments),
    exams: stillOpen(state, model.exams),
    finals: model.finals.filter((task) => !task.completed),
    meetings: [],
    workouts: [],
    month: state.month,
    course: code,
  });
  const springStart = model.spring.map((task) => task.firstDay).filter(Boolean).sort()[0];
  return h("div", { class: "stack" },
    h("div", null,
      bar("🎓", `Courses: ${model.termLabel}`),
      model.courses.length ? courseCards(state, actions, { selectable: true }) : empty("No courses yet."),
    ),
    course ? h("div", { class: "heading-20" }, `📘 ${course.code}`) : h("div", { class: "sub" }, "Select a course."),
    course ? h("div", { class: "row" },
      col(2, 420,
        h("div", null,
          bar("📝", "Assignments"),
          h("div", { class: "mb8" }, segmented([
            { value: "upcoming", label: "Upcoming" },
            { value: "all", label: "All" },
          ], state.scope, actions.setScope, "Assignments")),
          visibleAssign.length
            ? assignTable(state, actions, visibleAssign, false)
            : empty(all.length ? "Every due date for this course has passed." : "No assignments yet."),
        ),
        h("div", null,
          bar("🗓️", "Month calendar"),
          h("div", { class: "mb8" }, segmented([
            { value: thisMonth, label: "This month" },
            { value: shiftMonth(thisMonth, 1), label: "Next month" },
          ], state.month, actions.setMonth, "Month")),
          monthView(state, actions, events, state.month),
        ),
      ),
      col(1, 260,
        exams.length ? h("div", null, bar("⏳", "Exams and study start"), examList(state, actions, exams)) : null,
        topics.length ? h("div", null,
          bar("📖", "Topics (SmartBook chapters)"),
          card(topics.map((task) => {
            const status = assignmentStatus(task.date, model.today, model.weekEnd);
            const on = isChecked(state, task);
            return h("div", { class: on ? "topic is-done" : "topic" },
              box(state, task, actions),
              h("span", { style: { flex: "1", fontSize: "13px" }, class: on ? "strike on" : "" }, task.content.replace(/^SB\s+/i, "")),
              task.date ? pill(status.tone, fd(task.date)) : null,
            );
          }), true),
        ) : null,
        h("div", null,
          bar("🏁", "Finals"),
          card([
            h("div", null, finals?.date ? `${fd(finals.date)}${finals.endDate ? ` – ${fd(finals.endDate)}` : ""}` : "No finals date yet."),
            finals?.finalsNote ? h("div", { class: "sub" }, finals.finalsNote) : null,
          ]),
        ),
      ),
    ) : null,
    model.spring.length ? h("div", null,
      bar("🌱", springStart ? `Next semester: ${model.springName} (starts ${fd(springStart)})` : `Next semester: ${model.springName}`),
      h("div", { class: "gallery" }, model.spring.filter((task) => !task.completed).map((task) => card([
        h("div", { class: "course-code" }, task.code || task.content),
        h("div", { class: "mb6", style: { fontSize: "13px" } }, task.name || task.content),
        h("div", { class: "sub" }, springWhen(task.meetings) || "Schedule not set"),
        task.location ? h("div", { class: "sub mt6" }, `📍 ${task.location}`) : null,
      ]))),
      h("div", { class: "sub", style: { margin: "10px 0 8px" } }, "A typical week."),
      weekView(state, model.weekStart, 6, 18, springWeekEvents(model.spring.filter((task) => !task.completed), model.weekStart), { showNow: false }),
    ) : null,
  );
}

function rotc(state, actions) {
  const { model } = state;
  const taskers = shown(state, model.taskers);
  const a1 = tasksThisWeek(model.a1.filter((task) => task.area === "ROTC"), model.today);
  const meetings = shown(state, model.meetings.filter((task) => meetingKind(task) !== "paro" && task.date >= model.today && task.date <= model.weekEnd));
  const paro = shown(state, model.meetings.filter((task) => meetingKind(task) === "paro" && (!task.date || task.date >= model.today)));
  const digest = state.raw?.digest ? shown(state, model.digest) : null;
  return h("div", { class: "stack" },
    h("div", null,
      bar("🚨", "Outstanding taskers", NAVY),
      taskers.length ? h("div", { class: "table-wrap taskers" }, h("table", null,
        h("thead", null, h("tr", null, h("th", { class: "check" }), h("th", null, "Tasker"), h("th", null, "Source"), h("th", null, "Due"))),
        h("tbody", null, taskers.map((task) => {
          const over = task.date && task.date < model.today;
          const isToday = task.date === model.today;
          const color = over ? "var(--danger)" : isToday ? "var(--warning)" : "var(--text)";
          const rel = task.date ? (over ? "Overdue" : isToday ? "Today" : relative(task.date, model.today).text) : "";
          const subColor = over ? "var(--danger)" : isToday ? "var(--warning)" : toneColor(task.date ? relative(task.date, model.today).tone : "neutral");
          const on = isChecked(state, task);
          return h("tr", { class: on ? "is-done" : "" },
            h("td", { class: "check" }, box(state, task, actions)),
            h("td", { style: { color: over ? "var(--danger)" : "var(--text)" }, class: on ? "strike on" : "" }, task.content, task.note ? h("div", { class: "sub" }, task.note) : null),
            h("td", { style: { color: "var(--text-2)" } }, task.source),
            h("td", { style: { color } }, task.dueLabel || (task.date ? fd(task.date) : ""), rel ? h("div", { class: "sub", style: { color: subColor } }, rel) : null),
          );
        })),
      )) : empty("All taskers checked off."),
      h("div", { class: "sub mt6" }, "Mandatory taskers and items assigned to you, by due date; red is overdue."),
    ),
    h("div", null,
      bar("👥", "Team board", NAVY),
      model.teams.length ? h("div", { class: "team-grid" }, model.teams.map((team) => card([
        h("div", { class: "team-head" },
          avatar(team.member || team.role, 32),
          h("div", { style: { flex: "1" } },
            h("div", { class: "title-500" }, team.role),
            team.member ? h("div", { class: "sub" }, team.member) : null,
          ),
          team.checkIn ? pill("warning", team.checkIn) : null,
        ),
        shown(state, team.items).map((task) => {
          const on = isChecked(state, task);
          const warn = (task.date && diffDays(task.date, model.today) >= 0 && diffDays(task.date, model.today) <= 1) || /today|tomorrow/i.test(task.dueLabel);
          return h("div", { class: on ? "team-item is-done" : "team-item" },
            box(state, task, actions),
            h("div", { style: { flex: "1" } },
              h("div", { style: { fontSize: "13px" }, class: on ? "strike on" : "" }, task.content),
              h("div", { class: "sub", style: { color: warn ? "var(--warning)" : "var(--text-2)" } }, task.dueLabel || (task.date ? fd(task.date) : "")),
            ),
          );
        }),
      ]))) : empty("No team sections yet."),
    ),
    h("div", { class: "row" },
      col(1.4, 320,
        h("div", null, bar("✅", "My A1 to-dos this week", NAVY), taskList(state, actions, a1)),
        h("div", null,
          bar("📋", "To-do list", NAVY),
          digest == null ? empty("The project “ROTC Digest To Do” was not found in this account.")
            : digest.length ? card(digest.map((task) => {
              const on = isChecked(state, task);
              const overdue = task.date && task.date < model.today;
              return h("div", { class: on ? "task-row is-done" : "task-row" },
                box(state, task, actions),
                h("div", { class: on ? "task-main strike on" : "task-main", style: { fontSize: "13px" } }, task.content),
                h("div", { class: "task-side" },
                  h("span", { class: "sub nowrap", style: { color: overdue ? "var(--danger)" : task.date === model.today ? "var(--warning)" : "var(--text-2)" } }, task.date ? fd(task.date) : ""),
                  task.priority !== "p4" ? h("span", { class: "sub" }, task.priority.toUpperCase()) : null,
                ),
              );
            }), true) : empty("All checked off."),
        ),
      ),
      col(1, 260,
        h("div", null,
          bar("📅", "Meetings this week", NAVY),
          meetings.length ? card(meetings.map((task) => {
            const on = isChecked(state, task);
            return h("div", { class: on ? "meet is-done" : "meet" },
              box(state, task, actions),
              h("span", { style: { flex: "1", fontSize: "13px" }, class: on ? "strike on" : "" }, task.content),
              h("span", { class: "sub nowrap", style: { color: task.date === model.today ? "var(--warning)" : "var(--text-2)" } }, `${task.date === model.today ? "Today" : fd(task.date)}${task.time ? ` ${task.time}` : ""}`),
            );
          }), true) : empty("Nothing this week."),
        ),
        h("div", null,
          bar("📣", "PARO content calendar", NAVY),
          paro.length ? card(paro.map((task) => {
            const on = isChecked(state, task);
            return h("div", { class: on ? "meet is-done" : "meet" },
              box(state, task, actions),
              h("span", { style: { flex: "1", fontSize: "13px" }, class: on ? "strike on" : "" }, task.content.replace(/\s*\(PARO\)\s*$/i, "")),
              h("span", { class: "sub nowrap" }, task.date ? fd(task.date) : task.time),
            );
          }), true) : empty("Nothing coming up."),
        ),
      ),
    ),
    h("div", null,
      bar("🗂️", "Areas and projects", NAVY),
      model.projects.length ? h("div", { class: "gallery" }, model.projects.filter((task) => !task.completed).map((task) => card([
        h("div", { class: "title-500 mb4" }, task.content),
        task.owner ? h("div", { class: "sub mb6" }, task.owner) : null,
        task.next ? h("div", { class: "mb8", style: { fontSize: "13px" } }, task.next) : null,
        task.status ? pill(task.tone, task.status) : null,
      ]))) : empty("No projects yet."),
    ),
    calendarBlock(state, actions, NAVY),
  );
}

function readingCard(state, actions) {
  const reading = state.model.reading || {};
  const book = reading.book;
  const progress = book ? readingProgress(book.meta.chapter, book.meta.chapters) : null;
  const done = !!(reading.doneToday || state.readingUndo);
  const logged = (reading.habit?.completedCount || 0) + (state.readingUndo ? 1 : 0);
  return h("div", null,
    bar("📖", "Reading", MAROON),
    card([
      book ? h("div", { class: "title-500" }, book.meta.title || book.content) : h("p", { class: "sub" }, "Add a book. It is stored in Todoist, not in this site."),
      book && book.meta.author ? h("div", { class: "sub mb6" }, book.meta.author) : null,
      progress ? prog(progress.chapter, progress.chapters, "#5aa7e8") : null,
      progress ? h("div", { class: "reading-line" },
        h("span", null, progress.finished ? "Finished" : `Chapter ${progress.chapter} of ${progress.chapters}`),
        done ? pill("success", "Done today") : null,
      ) : null,
      logged > 0 ? h("div", { class: "sub" }, `Logged ${logged} time${logged === 1 ? "" : "s"}`) : null,
      book ? h("div", { class: "task-row" },
        h("button", {
          type: "button",
          class: "box",
          role: "checkbox",
          "aria-checked": done ? "true" : "false",
          "aria-label": "Read a chapter today",
          disabled: state.readingBusy,
          onclick: () => (done ? actions.undoReading() : actions.readToday()),
        }, h("span", { class: done ? "box-inner is-on" : "box-inner" }, done ? "✓" : "")),
        h("span", null, "Read a chapter today"),
        h("span", { class: "reading-actions" },
          h("button", { type: "button", class: "icon-btn", "aria-label": "Decrease chapter", disabled: state.readingBusy || progress.chapter <= 0, onclick: () => actions.adjustChapter(-1) }, "−"),
          h("button", { type: "button", class: "icon-btn", "aria-label": "Increase chapter", disabled: state.readingBusy || progress.finished, onclick: () => actions.adjustChapter(1) }, "+"),
        ),
      ) : null,
      state.readingForm ? readingForm(state, actions, book) : h("div", { class: "reading-actions" },
        h("button", { type: "button", class: "ghost", onclick: () => actions.openReadingForm("add") }, book ? "Change book" : "Add book"),
        book ? h("button", { type: "button", class: "ghost", onclick: () => actions.openReadingForm("edit") }, "Edit") : null,
      ),
      state.readingError ? h("div", { class: "alert mt8", role: "alert" }, state.readingError) : null,
    ]),
  );
}

function readingForm(state, actions, book) {
  const editing = state.readingForm === "edit" && book;
  const progress = editing ? readingProgress(book.meta.chapter, book.meta.chapters) : null;
  return h("form", {
    class: "reading-form",
    onsubmit: (event) => {
      event.preventDefault();
      actions.saveBook(Object.fromEntries(new FormData(event.target)));
    },
  },
    h("div", { class: "title-500 mb6" }, editing ? "Edit book" : (book ? "Change book" : "Add book")),
    h("label", { class: "field" }, "Title",
      h("input", { name: "title", required: true, value: editing ? (book.meta.title || book.content) : "", autocomplete: "off" }),
    ),
    h("label", { class: "field" }, "Author (optional)",
      h("input", { name: "author", value: editing ? (book.meta.author || "") : "", autocomplete: "off" }),
    ),
    h("label", { class: "field" }, "Total chapters",
      h("input", { name: "chapters", type: "number", min: "1", step: "1", required: true, inputmode: "numeric", value: editing ? String(progress.chapters || "") : "" }),
    ),
    h("label", { class: "field" }, "Current chapter",
      h("input", { name: "chapter", type: "number", min: "0", step: "1", inputmode: "numeric", value: editing ? String(progress.chapter) : "0" }),
    ),
    h("div", { class: "reading-actions" },
      h("button", { class: "primary", type: "submit", disabled: state.readingBusy }, state.readingBusy ? "Saving…" : "Save"),
      h("button", { class: "ghost", type: "button", onclick: actions.closeReadingForm }, "Cancel"),
    ),
  );
}

function life(state, actions) {
  const { model } = state;
  const days = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(model.weekStart, offset));
  const openWorkouts = stillOpen(state, model.workouts);
  const lifts = openWorkouts.filter((task) => task.date >= model.weekStart && task.date <= model.weekEnd && workoutKind(task) === "lift").length;
  const runs = openWorkouts.filter((task) => task.date >= model.weekStart && task.date <= model.weekEnd && workoutKind(task) === "run").length;
  const liftTarget = habitTarget(model.habits, "lift");
  const runTarget = habitTarget(model.habits, "run");
  const weeks = [0, 1, 2, 3, 4].map((step) => addDays(model.weekStart, step * 7));
  const monthGoals = shown(state, model.goals.filter((task) => task.horizon === "month"));
  return h("div", { class: "stack" },
    readingCard(state, actions),
    h("div", { class: "row" },
      col(1, 260,
        h("div", null,
          bar("💪", "Habits this week", MAROON),
          card(days.map((date) => {
            const sessions = openWorkouts.filter((task) => task.date === date);
            const label = sessions.length ? sessions.map((task) => `${task.content} · ${task.time || formatHours(task.startHour) || ""}`.replace(/ · $/, "")).join("; ") : "Rest";
            return h("div", { class: "habit-row" },
              h("span", { class: "day-label sub", style: { color: date === model.today ? "var(--warning)" : "var(--text-2)" } }, date === model.today ? "Today" : fd(date)),
              h("span", { style: { flex: "1", fontSize: "13px" } }, label),
            );
          }), true),
        ),
        h("div", null,
          bar("📊", "Weekly targets", MAROON),
          card([
            h("div", { style: { fontSize: "13px" } }, liftTarget == null ? `Lifts planned this week: ${lifts}` : `Lifts planned this week: ${lifts} of ${liftTarget}`),
            liftTarget == null ? null : prog(lifts, liftTarget, CAT0),
            h("div", { class: "mt8", style: { fontSize: "13px" } }, runTarget == null ? `Runs planned this week: ${runs}` : `Runs planned this week: ${runs} of ${runTarget}`),
            runTarget == null ? null : prog(runs, runTarget, CAT1),
            h("div", { class: "sub mt8" }, "Plan counts, not completed sessions."),
          ]),
        ),
      ),
      col(1.6, 360,
        h("div", null,
          bar("🎯", "Goals this month", MAROON),
          monthGoals.length ? card(monthGoals.map((task) => {
            const on = isChecked(state, task);
            return h("div", { class: on ? "task-row is-done" : "task-row" },
              box(state, task, actions),
              h("div", { style: { flex: "1" } },
                h("div", { class: on ? "strike on" : "" }, task.content),
                task.detail ? h("div", { class: "sub" }, task.detail) : null,
              ),
            );
          }), true) : empty("No goals this month."),
        ),
        h("div", null,
          bar("🏃", "Workout schedule", MAROON),
          h("div", { class: "mb8" }, segmented(weeks.map((week) => ({ value: week, label: fd(week).split(" ")[1] })), state.workoutWeek, actions.setWorkoutWeek, "Workout week")),
          weekView(state, state.workoutWeek || model.weekStart, 7, 18, workoutEvents(openWorkouts, state.workoutWeek || model.weekStart), { showNow: true }),
        ),
      ),
    ),
    h("div", null,
      bar("🧩", "Life areas", MAROON),
      h("div", { class: "gallery" },
        model.areas.filter((task) => !task.completed).map((task) => {
          const tab = ["home", "school", "rotc", "life"].includes(task.tab) ? task.tab : "";
          let detail = task.detail;
          if (task.tab === "life") detail = `${openWorkouts.filter((item) => item.date >= model.today).length} planned sessions left`;
          else if (task.tab === "school") detail = `${stillOpen(state, model.assignments).filter((item) => item.date >= model.today).length} items upcoming`;
          else if (task.tab === "rotc") detail = `${model.teams.reduce((sum, team) => sum + shown(state, stillOpen(state, team.items)).length, 0)} team items open`;
          const emoji = task.emoji || (task.tab === "school" ? "📚" : task.tab === "rotc" ? "✈️" : task.tab === "life" ? "🏋️" : "🧩");
          return h("button", { type: "button", class: "card", style: { textAlign: "left" }, onclick: () => { if (tab) actions.setTab(tab); } },
            h("div", { class: "emoji-lg" }, emoji),
            h("div", { class: "title-500" }, task.content),
            detail ? h("div", { class: "sub" }, detail) : null,
          );
        }),
        h("div", { class: "slot loose" }, "Open slot: add another area."),
      ),
    ),
    goalsBlock(state, actions, MAROON),
  );
}

function header(state, actions) {
  const count = (state.model?.completedCount || 0) + [...(state.pending?.values() || [])].filter((entry) => entry.phase === "gone").length;
  return [
    h("h1", null, "Dashboard"),
    h("p", { class: "summary" }, "Personal dashboard."),
    cover(),
    h("div", { class: "icon-tile", "aria-hidden": "true" }, "🎓"),
    h("div", { class: "controls" },
      state.screen === "app" && state.raw?.os ? h("div", { class: "tab-scroll" }, segmented(TABS, state.tab, actions.setTab, "Sections")) : null,
      state.screen === "app" && count > 0 ? h("button", {
        type: "button",
        class: "toggle",
        "aria-pressed": state.showCompleted ? "true" : "false",
        onclick: () => actions.toggleCompleted(!state.showCompleted),
      }, h("span", { class: "switch" }), `Show completed today (${count})`) : null,
      state.token ? h("button", { type: "button", class: "ghost", onclick: actions.refresh, disabled: state.refreshing }, state.refreshing ? "Refreshing…" : "Refresh") : null,
      state.screen === "app" ? h("button", { type: "button", class: "ghost", onclick: actions.openSettings }, "Settings") : null,
      state.token ? h("button", { type: "button", class: "ghost", onclick: actions.signOut }, "Sign out") : null,
      state.updatedLabel ? h("span", { class: "updated" }, state.updatedLabel) : null,
    ),
    state.screen === "app" && state.raw?.os ? h("div", { class: "hint" }, "Tap a box to complete a task.") : null,
  ];
}

export function renderShell(state, actions) {
  const page = h("main", { class: "page" },
    ...header(state, actions),
    state.banner ? h("div", { class: "banner", role: "alert" }, state.banner) : null,
    state.screen === "loading" ? card(h("div", null, "Loading your Todoist…")) : null,
    state.screen === "setup" ? setup(state, actions) : null,
    state.screen === "app" && !state.raw?.os ? missingProject() : null,
    state.screen === "app" && state.raw?.os ? h("div", { class: "stack" },
      state.offline ? h("div", { class: "info" }, "You're offline, so this is the last sync saved on this device.") : null,
      state.model?.missingSections?.length ? h("div", { class: "info" }, `Some sections were not found in Dylan OS: ${state.model.missingSections.join(", ")}.`) : null,
      state.tab === "home" ? home(state, actions) : null,
      state.tab === "school" ? school(state, actions) : null,
      state.tab === "rotc" ? rotc(state, actions) : null,
      state.tab === "life" ? life(state, actions) : null,
    ) : null,
    h("p", { class: "footer-note" }, "Not created by, affiliated with, or supported by Todoist. Your token stays in this browser."),
  );
  return page;
}

function missingProject() {
  return card([
    h("div", { class: "title-500 mb6" }, "Project not found"),
    h("p", { class: "sub" }, "No project named “Dylan OS” was found for this token. Create that project in Todoist, then refresh. The ROTC list is read from a project named “ROTC Digest To Do”."),
  ]);
}

function setup(state, actions) {
  return card(h("form", {
    class: "setup",
    onsubmit: (event) => {
      event.preventDefault();
      const token = String(new FormData(event.target).get("token") || "").trim();
      actions.saveToken(token);
    },
  },
    h("div", { class: "title-500 mb6" }, "Connect Todoist"),
    h("p", null, "Paste a Todoist API token. It is saved only in this browser’s localStorage and is sent only to Todoist. It is never stored in the site, a link, or another server."),
    state.error ? h("div", { class: "alert", role: "alert" }, state.error) : null,
    h("label", { class: "field" }, "Todoist API token",
      h("input", { type: "password", name: "token", autocomplete: "off", spellcheck: "false", placeholder: "Paste your token", required: true }),
    ),
    h("div", { class: "row-actions" },
      h("button", { class: "primary", type: "submit" }, "Save on this device"),
      h("a", { class: "ext", href: "https://app.todoist.com/app/settings/integrations/developer", target: "_blank", rel: "noreferrer", style: { padding: "0" } }, "Create a token"),
    ),
  ));
}

export function renderSettings(state, actions) {
  if (!state.settingsOpen) return null;
  const personal = state.settings.personal.length ? state.settings.personal : [{ label: "", value: "" }];
  const links = state.settings.links.length ? state.settings.links : [{ label: "", href: "" }];
  return h("div", { class: "modal-back", onclick: (event) => { if (event.target === event.currentTarget) actions.closeSettings(); } },
    h("form", {
      class: "modal",
      onsubmit: (event) => {
        event.preventDefault();
        actions.saveSettings(readSettings(event.target));
      },
    },
      h("h2", null, "On this device"),
      h("p", { class: "sub" }, "Personal rows and links stay in this browser. They are not written to Todoist or the public site."),
      h("div", { class: "title-500 mb6 mt8" }, "Personal"),
      ...personal.map((row, index) => h("div", { class: "setting-row" },
        h("input", { name: "plabel", value: row.label, placeholder: "Label", "aria-label": "Label" }),
        h("input", { name: "pvalue", value: row.value, placeholder: "Value", "aria-label": "Value" }),
        h("button", { type: "button", class: "ghost", onclick: (event) => actions.editSettings(drop(readSettings(event.target.form), "personal", index)) }, "Remove"),
      )),
      h("button", { type: "button", class: "ghost mb8", onclick: (event) => actions.editSettings(addBlank(readSettings(event.target.form), "personal")) }, "Add row"),
      h("div", { class: "title-500 mb6" }, "Links"),
      ...links.map((link) => h("div", { class: "setting-row" },
        h("input", { name: "llabel", value: link.label, placeholder: "Label", "aria-label": "Link label" }),
        h("input", { name: "lhref", type: "url", value: link.href, placeholder: "https://", "aria-label": "Link address" }),
      )),
      h("button", { type: "button", class: "ghost mb8", onclick: (event) => actions.editSettings(addBlank(readSettings(event.target.form), "links")) }, "Add link"),
      state.settingsError ? h("div", { class: "alert mb8", role: "alert" }, state.settingsError) : null,
      h("div", { class: "row-actions" },
        h("button", { class: "primary", type: "submit" }, "Save on this device"),
        h("button", { class: "ghost", type: "button", onclick: actions.closeSettings }, "Cancel"),
      ),
    ),
  );
}

function readSettings(form) {
  const labels = [...form.querySelectorAll("[name=plabel]")].map((input) => input.value.trim());
  const values = [...form.querySelectorAll("[name=pvalue]")].map((input) => input.value.trim());
  const linkLabels = [...form.querySelectorAll("[name=llabel]")].map((input) => input.value.trim());
  const hrefs = [...form.querySelectorAll("[name=lhref]")].map((input) => input.value.trim());
  return {
    personal: labels.map((label, index) => ({ label, value: values[index] || "" })).filter((row) => row.label || row.value),
    links: linkLabels.map((label, index) => ({ label, href: hrefs[index] || "" })).filter((link) => link.label || link.href),
  };
}

function drop(settings, key, index) {
  const next = { personal: settings.personal.slice(), links: settings.links.slice() };
  next[key].splice(index, 1);
  return next;
}

function addBlank(settings, key) {
  const next = { personal: settings.personal.slice(), links: settings.links.slice() };
  next[key].push(key === "personal" ? { label: "", value: "" } : { label: "", href: "" });
  return next;
}

export function renderToasts(toasts, onUndo) {
  return toasts.map((toast) => h("div", { class: "toast" },
    h("span", null, `Completed · ${toast.title}`),
    h("button", { type: "button", onclick: () => onUndo(toast.task) }, "Undo"),
  ));
}
