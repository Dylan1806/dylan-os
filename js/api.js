// Browser client for the Todoist unified API v1.
// The token is passed in from memory. It is never written to a URL.

import { addDays, chicagoToday, zonedMidnightUtc } from "./dates.js";

const ROOT = "https://api.todoist.com/api/v1/";

export class TodoistError extends Error {
  constructor(message, { status = 0, auth = false } = {}) {
    super(message);
    this.name = "TodoistError";
    this.status = status;
    this.auth = auth;
  }
}

function errorFor(status) {
  if (status === 401) return new TodoistError("That token was rejected by Todoist. Check it and try again.", { status, auth: true });
  if (status === 403) return new TodoistError("Todoist refused this request. The token may not have access to the project.", { status, auth: true });
  if (status === 429) return new TodoistError("Todoist is busy right now. Wait a moment, then refresh.", { status });
  return new TodoistError(`Todoist returned an error (${status}). Try refreshing.`, { status });
}

async function request(token, path, { method = "GET", query = null, json = null, fetchImpl = fetch, timeout = 20000 } = {}) {
  const url = new URL(path.replace(/^\//, ""), ROOT);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (json != null) headers["Content-Type"] = "application/json";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetchImpl(url, {
      method,
      cache: "no-store",
      signal: ctrl.signal,
      headers,
      body: json != null ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new TodoistError("Couldn't reach Todoist. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return null;
  if (!res.ok) throw errorFor(res.status);
  if (res.status === 200 || res.status === 201) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new TodoistError("Todoist sent a response that could not be read.");
    }
  }
  return null;
}

export async function getAll(token, path, query = {}, fetchImpl = fetch) {
  const items = [];
  let cursor = "";
  const limit = path.includes("completed") ? "50" : "200";
  for (let page = 0; page < 40; page++) {
    const body = await request(token, path, {
      query: { ...query, limit, cursor: cursor || undefined },
      fetchImpl,
    });
    const chunk = Array.isArray(body) ? body : body?.results || body?.items || [];
    items.push(...chunk);
    cursor = body && !Array.isArray(body) ? body.next_cursor || "" : "";
    if (!cursor) break;
  }
  return items;
}

export function closeTask(token, id, fetchImpl = fetch) {
  return request(token, `tasks/${encodeURIComponent(id)}/close`, { method: "POST", fetchImpl });
}

export function reopenTask(token, id, fetchImpl = fetch) {
  return request(token, `tasks/${encodeURIComponent(id)}/reopen`, { method: "POST", fetchImpl });
}

export function updateTask(token, id, fields, fetchImpl = fetch) {
  return request(token, `tasks/${encodeURIComponent(id)}`, { method: "POST", json: fields, fetchImpl });
}

export function createTask(token, fields, fetchImpl = fetch) {
  return request(token, "tasks", { method: "POST", json: fields, fetchImpl });
}

export function createSection(token, fields, fetchImpl = fetch) {
  return request(token, "sections", { method: "POST", json: fields, fetchImpl });
}

export async function loadDashboard(token, fetchImpl = fetch, now = new Date()) {
  const projects = await getAll(token, "projects", {}, fetchImpl);
  const os = projects.find((p) => p && p.name === "Dylan OS") || null;
  const digest = projects.find((p) => p && p.name === "ROTC Digest To Do") || null;
  if (!os) {
    return { os: null, digest, sections: [], osTasks: [], digestTasks: [], completed: [] };
  }
  const [sections, osTasks, digestTasks] = await Promise.all([
    getAll(token, "sections", { project_id: os.id }, fetchImpl),
    getAll(token, "tasks", { project_id: os.id }, fetchImpl),
    digest ? getAll(token, "tasks", { project_id: digest.id }, fetchImpl) : Promise.resolve([]),
  ]);
  const completed = [];
  try {
    const today = chicagoToday(now);
    const since = zonedMidnightUtc(today).toISOString();
    const until = zonedMidnightUtc(addDays(today, 1)).toISOString();
    const calls = [getAll(token, "tasks/completed/by_completion_date", { project_id: os.id, since, until }, fetchImpl)];
    if (digest) calls.push(getAll(token, "tasks/completed/by_completion_date", { project_id: digest.id, since, until }, fetchImpl));
    const pages = await Promise.all(calls);
    for (const page of pages) completed.push(...page);
  } catch {
    // Completed history is optional. The open lists still work.
  }
  return { os, digest, sections, osTasks, digestTasks, completed };
}
