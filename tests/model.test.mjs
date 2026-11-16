import assert from "node:assert/strict";
import test from "node:test";
import { closeTask, getAll, TodoistError } from "../js/api.js";
import {
  addDays,
  analogAngles,
  assignmentStatus,
  chicagoParts,
  dueParts,
  mondayOf,
  monthCells,
  parseDays,
  parseTime,
  relative,
  weekEnd,
  zonedMidnightUtc,
} from "../js/dates.js";
import {
  avatarColor,
  buildModel,
  calendarEvents,
  habitTarget,
  initials,
  parseMeta,
  priorityLabel,
  springWeekEvents,
  springWhen,
} from "../js/model.js";

test("analog hands follow the device clock", () => {
  const three = new Date(2026, 0, 1, 3, 0, 0, 0);
  assert.deepEqual(analogAngles(three), { hour: 90, minute: 0, second: 0 });
  const half = new Date(2026, 0, 1, 3, 30, 30, 0);
  const angles = analogAngles(half);
  assert.equal(angles.minute, 183);
  assert.equal(angles.second, 180);
  assert.ok(Math.abs(angles.hour - 105.25) < 0.001);
});

test("week boundaries stay on the calendar, including Sunday", () => {
  assert.equal(weekEnd("2026-11-16"), "2026-11-22"); // Monday
  assert.equal(weekEnd("2026-11-22"), "2026-11-22"); // Sunday
  assert.equal(mondayOf("2026-11-16"), "2026-11-16");
  assert.equal(mondayOf("2026-11-22"), "2026-11-16");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
});

test("relative labels and assignment status", () => {
  assert.deepEqual(relative("2026-11-15", "2026-11-16"), { text: "1 day ago", tone: "neutral" });
  assert.equal(relative("2026-11-14", "2026-11-16").text, "2 days ago");
  assert.equal(relative("2026-11-16", "2026-11-16").text, "Today");
  assert.equal(relative("2026-11-17", "2026-11-16").text, "Tomorrow");
  assert.equal(relative("2026-11-19", "2026-11-16").text, "In 3 days");
  assert.equal(assignmentStatus("2026-11-15", "2026-11-16", "2026-11-22").label, "Due date passed");
  assert.equal(assignmentStatus("2026-11-16", "2026-11-16", "2026-11-22").tone, "warning");
  assert.equal(assignmentStatus("2026-11-20", "2026-11-16", "2026-11-22").label, "This week");
  assert.equal(assignmentStatus("2026-11-24", "2026-11-16", "2026-11-22").label, "Upcoming");
});

test("Chicago conversion handles standard and daylight time", () => {
  const winter = chicagoParts(new Date("2026-01-15T18:00:00.000Z"));
  assert.equal(winter.iso, "2026-01-15");
  assert.equal(winter.hour, 12);
  const summer = chicagoParts(new Date("2026-07-15T17:00:00.000Z"));
  assert.equal(summer.iso, "2026-07-15");
  assert.equal(summer.hour, 12);
  const late = chicagoParts(new Date("2026-01-15T05:30:00.000Z"));
  assert.equal(late.iso, "2026-01-14");
  assert.equal(late.hour, 23);
  assert.equal(late.minute, 30);
});

test("due parts accept full-day, floating, and zoned values", () => {
  assert.deepEqual(dueParts({ date: "2026-03-02" }), { date: "2026-03-02", time: "" });
  assert.deepEqual(dueParts({ date: "2026-03-02T15:30:00" }), { date: "2026-03-02", time: "3:30 PM" });
  const zoned = dueParts({ date: "2026-01-15T18:00:00.000000Z", timezone: "UTC" });
  assert.equal(zoned.date, "2026-01-15");
  assert.equal(zoned.time, "12:00 PM");
});

test("midnight in Chicago is an absolute instant", () => {
  const instant = zonedMidnightUtc("2026-01-15");
  assert.equal(chicagoParts(instant).iso, "2026-01-15");
  assert.equal(chicagoParts(instant).hour, 0);
  assert.equal(chicagoParts(instant).minute, 0);
});

test("day patterns and times", () => {
  assert.deepEqual(parseDays("MWF"), [1, 3, 5]);
  assert.deepEqual(parseDays("TTh"), [2, 4]);
  assert.deepEqual(parseDays("Monday"), [1]);
  assert.deepEqual(parseDays("Mon, Wed, Fri"), [1, 3, 5]);
  assert.deepEqual(parseDays("Tue/Thu"), [2, 4]);
  assert.deepEqual(parseDays(["Mon", "Wed"]), [1, 3]);
  assert.deepEqual(parseDays("MWThF"), [1, 3, 4, 5]);
  assert.equal(parseTime("15:30"), 15.5);
  assert.equal(parseTime("3:30 PM"), 15.5);
  assert.equal(parseTime("12:00 AM"), 0);
  assert.equal(parseTime("nope"), null);
});

test("description JSON is defensive", () => {
  assert.deepEqual(parseMeta(""), {});
  assert.deepEqual(parseMeta("not json"), {});
  assert.deepEqual(parseMeta("{"), {});
  assert.deepEqual(parseMeta('{"course":"DEMO101","type":"homework"}'), { course: "DEMO101", type: "homework" });
  assert.deepEqual(parseMeta("note\n{\"kind\":\"paro\"}\n"), { kind: "paro" });
  assert.deepEqual(parseMeta("[1,2]"), {});
});

test("priority matches the Todoist scale", () => {
  assert.equal(priorityLabel(4), "p1");
  assert.equal(priorityLabel(1), "p4");
  assert.equal(priorityLabel(undefined), "p4");
});

test("avatars are stable and use initials", () => {
  assert.equal(initials("Ada Lovelace"), "AL");
  assert.equal(initials("Prince"), "P");
  assert.equal(avatarColor("Ada Lovelace"), avatarColor("Ada Lovelace"));
});

test("month grid starts on Sunday", () => {
  const cells = monthCells("2026-11");
  assert.equal(cells[0].iso, "2026-11-01");
  assert.equal(cells[0].inMonth, true);
  assert.equal(weekdayIndexSafe(cells[0].iso), 0);
  assert.equal(cells.filter((cell) => cell.inMonth).length, 30);
  assert.equal(cells.length % 7, 0);
});

function weekdayIndexSafe(iso) {
  return new Date(Date.UTC(...iso.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))))).getUTCDay();
}

function task(partial) {
  return {
    id: partial.id,
    content: partial.content,
    description: partial.description || "",
    labels: partial.labels || [],
    priority: partial.priority ?? 1,
    due: partial.due || null,
    section_id: partial.section,
    project_id: partial.project || "os",
    child_order: partial.order || 1,
    checked: false,
    ...partial.extra,
  };
}

test("buildModel groups sections by name and sorts taskers by due date", () => {
  const sections = [
    ["Taskers", "s-task"],
    ["A1 To-Do", "s-a1"],
    ["Team: ACDO", "s-acdo"],
    ["Assignments", "s-as"],
    ["Exams", "s-ex"],
    ["Courses", "s-c"],
    ["Goals", "s-g"],
    ["Habits", "s-h"],
    ["Workouts", "s-w"],
    ["Meetings", "s-m"],
    ["Life Areas", "s-l"],
    ["Spring 2027", "s-sp"],
  ].map(([name, id]) => ({ id, name }));

  const osTasks = [
    task({ id: "t2", content: "Later tasker", section: "s-task", due: { date: "2026-11-20" }, description: '{"source":"Staff","dueLabel":"Fri"}', labels: ["tasker"] }),
    task({ id: "t1", content: "Older tasker", section: "s-task", due: { date: "2026-11-10" }, description: '{"source":"Orders","dueLabel":"Tue","note":"bring form"}', labels: ["tasker"] }),
    task({ id: "a1", content: "Read chapter", section: "s-a1", due: { date: "2026-11-18" }, description: '{"area":"School"}', labels: ["school"] }),
    task({ id: "a2", content: "Formation", section: "s-a1", due: { date: "2026-11-16" }, description: '{"area":"ROTC"}', labels: ["rotc"] }),
    task({ id: "tm", content: "Call roster", section: "s-acdo", description: '{"role":"Lead","member":"Sam Lee","dueLabel":"Today","checkIn":"Due"}', labels: ["acdo"] }),
    task({ id: "hw", content: "Problem set", section: "s-as", due: { date: "2026-11-19T23:00:00" }, description: '{"course":"DEMO101","type":"homework"}', labels: ["DEMO101", "homework"] }),
    task({ id: "rd", content: "SB Chapter 2", section: "s-as", due: { date: "2026-11-12" }, description: '{"course":"DEMO101","type":"reading"}', labels: ["reading"] }),
    task({ id: "ex", content: "Midterm", section: "s-ex", due: { date: "2026-11-25" }, description: '{"course":"DEMO101","type":"exam","time":"9:00 AM"}', labels: ["exam"] }),
    task({ id: "fin", content: "Finals window", section: "s-ex", due: { date: "2026-12-10" }, description: '{"type":"finals","endDate":"2026-12-12","note":"Campus closed Sunday"}', labels: ["finals"] }),
    task({ id: "c1", content: "DEMO101", section: "s-c", description: '{"code":"DEMO101","name":"Demo course","color":"#336699","icon":"gear","term":"Fall"}', labels: ["course"] }),
    task({ id: "g1", content: "Ship the draft", section: "s-g", description: '{"horizon":"week"}', labels: ["goal"] }),
    task({ id: "g2", content: "Run a 5k", section: "s-g", description: '{"horizon":"month","detail":"easy pace"}', labels: ["goal"] }),
    task({ id: "h1", content: "Lifts", section: "s-h", description: '{"target":3,"per":"week","matchLabel":"lift"}', labels: ["habit"] }),
    task({ id: "w1", content: "Squat", section: "s-w", due: { date: "2026-11-17" }, description: '{"start":"07:00","end":"08:00","kind":"lift"}', labels: ["lift"] }),
    task({ id: "m1", content: "Lab brief", section: "s-m", due: { date: "2026-11-18T15:30:00" }, description: '{"kind":"meeting"}', labels: ["rotc"] }),
    task({ id: "p1", content: "Post recap", section: "s-m", due: { date: "2026-11-19" }, description: '{"kind":"paro"}', labels: ["paro"] }),
    task({ id: "ar", content: "Fitness", section: "s-l", description: '{"kind":"area","emoji":"🏋️","tab":"life"}', labels: ["area"] }),
    task({ id: "pr", content: "Newsletter", section: "s-l", description: '{"kind":"project","owner":"Sam","next":"Draft","status":"Active","tone":"accent"}', labels: ["project"] }),
    task({
      id: "sp",
      content: "DEMO201",
      section: "s-sp",
      due: { date: "2027-01-11" },
      description: '{"code":"DEMO201","name":"Next demo","location":"Hall","meetings":[{"days":"TTh","start":"09:00","end":"10:15"}],"firstDay":"2027-01-11","noClass":["2026-11-19"]}',
      labels: ["spring2027"],
    }),
  ];

  const model = buildModel({
    sections,
    osTasks,
    digestTasks: [
      task({ id: "d1", content: "Sign form", project: "digest", due: { date: "2026-11-14" }, priority: 4 }),
      task({ id: "d2", content: "Optional note", project: "digest", due: { date: "2026-11-21" }, priority: 1 }),
    ],
    digestProjectId: "digest",
    completed: [task({ id: "done-1", content: "Finished homework", section: "s-as", project: "os", due: { date: "2026-11-16" }, description: '{"course":"DEMO101","type":"homework"}' })],
    today: "2026-11-16",
  });

  assert.deepEqual(model.taskers.map((item) => item.id), ["t1", "t2"]);
  assert.equal(model.taskers[0].source, "Orders");
  assert.equal(model.taskers[0].note, "bring form");
  assert.equal(model.a1.find((item) => item.id === "a2").area, "ROTC");
  assert.equal(model.teams[0].member, "Sam Lee");
  assert.equal(model.teams[0].checkIn, "Due");
  assert.equal(model.assignments.find((item) => item.id === "hw").typeLabel, "Homework");
  assert.equal(model.assignments.find((item) => item.id === "hw").time, "11:00 PM");
  assert.equal(model.exams[0].content, "Midterm");
  assert.equal(model.finals[0].endDate, "2026-12-12");
  assert.equal(model.courses[0].color, "#336699");
  assert.equal(model.courses[0].term, "Fall");
  assert.equal(model.termLabel, "Fall");
  assert.equal(model.goals.find((item) => item.horizon === "month").detail, "easy pace");
  assert.equal(habitTarget(model.habits, "lift"), 3);
  assert.equal(model.meetings.find((item) => item.id === "m1").time, "3:30 PM");
  assert.equal(model.areas[0].emoji, "🏋️");
  assert.equal(model.projects[0].tone, "accent");
  assert.equal(model.digest[0].priority, "p1");
  assert.equal(model.digest[0].date < "2026-11-16", true);
  assert.equal(model.digest[1].priority, "p4");
  assert.ok(model.assignments.some((item) => item.completed && item.id === "done-1"));
  assert.ok(model.missingSections.includes("Team: PARO"));
  assert.equal(springWhen(model.spring[0].meetings), "Tue Thu 9:00 AM–10:15 AM");
  const week = springWeekEvents(model.spring, "2026-11-16");
  assert.ok(week.some((event) => event.date === "2026-11-17" && event.title === "DEMO201"));
  assert.ok(!week.some((event) => event.date === "2026-11-19"));

  const events = calendarEvents({
    assignments: model.assignments.filter((item) => !item.completed),
    exams: model.exams,
    finals: model.finals,
    meetings: model.meetings,
    workouts: model.workouts,
    month: "2026-11",
    filter: "all",
  });
  assert.ok(events.some((event) => event.title === "DEMO101: Problem set"));
  assert.ok(events.some((event) => event.title === "Midterm"));
  assert.ok(events.some((event) => event.title === "3:30 PM Lab brief"));
  assert.ok(events.some((event) => event.title === "7:00 AM Squat"));
  const finals = calendarEvents({
    assignments: [],
    exams: [],
    finals: model.finals,
    meetings: [],
    workouts: [],
    month: "2026-12",
    filter: "school",
  });
  assert.equal(finals.filter((event) => event.title === "Finals week").length, 3);
});

test("api client paginates and closes a task", async () => {
  const pages = [
    { results: [{ id: "p1", name: "One" }], next_cursor: "cursor-2" },
    { results: [{ id: "p2", name: "Two" }], next_cursor: null },
  ];
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push(String(url));
    assert.equal(options.headers.Authorization, "Bearer secret-token");
    const body = pages.shift();
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  };
  const items = await getAll("secret-token", "projects", {}, fetchImpl);
  assert.equal(items.length, 2);
  assert.match(seen[1], /cursor=cursor-2/);
  assert.doesNotMatch(seen[0], /token/);

  const fetchClose = async (url, options) => {
    assert.equal(options.method, "POST");
    assert.match(String(url), /tasks\/abc%20123\/close$/);
    return { ok: true, status: 204, text: async () => "" };
  };
  await closeTask("secret-token", "abc 123", fetchClose);
});

test("api client reports a rejected token", async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => "" });
  await assert.rejects(getAll("nope", "projects", {}, fetchImpl), (error) => {
    assert.ok(error instanceof TodoistError);
    assert.equal(error.auth, true);
    assert.match(error.message, /rejected/);
    return true;
  });
});
