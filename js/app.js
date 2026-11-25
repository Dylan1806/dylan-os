import { closeTask, createSection, createTask, loadDashboard, reopenTask, TodoistError, updateTask } from "./api.js";
import { addDays, analogAngles, chicagoHour, chicagoToday, mondayOf, sidebarClockParts } from "./dates.js";
import { adjustChapter, bookDescription, buildModel, incrementChapter, parseBookForm, readingProgress } from "./model.js";
import {
  authorizeUrl,
  codeChallenge,
  noDevice,
  parseSpotifyLink,
  premiumRequired,
  randomVerifier,
  SPOTIFY_REDIRECT,
  spotifyFetch,
  tokenBody,
} from "./spotify.js";
import { playCheckDing, soundEnabled } from "./ding.js";
import { renderSettings, renderShell, renderToasts } from "./views.js";

const TOKEN_KEY = "dylan-os.token";
const SETTINGS_KEY = "dylan-os.settings";
const CACHE_KEY = "dylan-os.cache";
const SOUND_KEY = "dylan-os.sound";

const state = {
  token: "",
  screen: "setup",
  error: "",
  banner: "",
  tab: "home",
  course: "",
  scope: "upcoming",
  month: "",
  calFilter: "all",
  workoutWeek: "",
  showCompleted: false,
  refreshing: false,
  offline: false,
  updatedLabel: "",
  raw: null,
  model: null,
  pending: new Map(),
  reopened: new Set(),
  toasts: [],
  settings: { personal: [], links: [] },
  soundOn: true,
  settingsOpen: false,
  settingsError: "",
  selectedDay: "",
  readingForm: null,
  readingError: "",
  readingBusy: false,
  readingUndo: null,
  spotify: {
    clientId: "",
    embed: null,
    embedError: "",
    connected: false,
    settings: false,
    player: null,
    editing: false,
    devices: [],
    note: "",
    premium: true,
  },
};

const actions = {
  saveToken,
  signOut,
  refresh: () => refresh({ silent: false }),
  setTab,
  complete,
  reopen,
  openCourse,
  setScope: (value) => { state.scope = value; renderShellOnly(); },
  setMonth: (value) => { state.month = value; state.selectedDay = ""; renderShellOnly(); },
  setCalFilter: (value) => { state.calFilter = value; state.selectedDay = ""; renderShellOnly(); },
  setWorkoutWeek: (value) => { state.workoutWeek = value; renderShellOnly(); },
  toggleCompleted: (value) => { state.showCompleted = value; renderShellOnly(); },
  selectDay: (iso) => { state.selectedDay = state.selectedDay === iso ? "" : iso; renderShellOnly(); },
  openSettings,
  closeSettings,
  editSettings,
  saveSettings,
  setSound,
  openReadingForm,
  closeReadingForm,
  saveBook,
  selectBook,
  adjustChapter: changeChapter,
  readToday,
  undoReading,
  saveSpotifyEmbed,
  clearSpotifyEmbed,
  saveSpotifyClient,
  connectSpotify,
  disconnectSpotify,
  toggleSpotifySettings,
  toggleSpotifyEdit,
  spotifyControl,
  spotifyTransfer,
};

function safeHttp(href) {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function loadSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const personal = Array.isArray(value.personal) ? value.personal.filter((row) => row && row.label).map((row) => ({ label: String(row.label), value: String(row.value || "") })) : [];
    const links = Array.isArray(value.links) ? value.links.filter((link) => link && link.label && safeHttp(link.href)).map((link) => ({ label: String(link.label), href: String(link.href) })) : [];
    return { personal, links };
  } catch {
    return { personal: [], links: [] };
  }
}

function readCache() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (value && Array.isArray(value.osTasks)) return value;
  } catch {
    // ignore a damaged cache
  }
  return null;
}

function writeCache(raw) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      os: raw.os ? { id: raw.os.id, name: raw.os.name } : null,
      digest: raw.digest ? { id: raw.digest.id, name: raw.digest.name } : null,
      sections: raw.sections,
      osTasks: raw.osTasks,
      digestTasks: raw.digestTasks,
      completed: raw.completed,
    }));
  } catch {
    // the dashboard still works if the browser refuses the copy
  }
}

function viewRaw() {
  const raw = state.raw;
  if (!raw) return null;
  const digestId = raw.digest?.id ? String(raw.digest.id) : "";
  const completed = (raw.completed || []).filter((task) => !state.reopened.has(String(task.id)));
  const revived = (raw.completed || []).filter((task) => state.reopened.has(String(task.id))).map((task) => ({ ...task, checked: false, completed: false }));
  return {
    ...raw,
    completed,
    osTasks: [...(raw.osTasks || []), ...revived.filter((task) => String(task.project_id) !== digestId)],
    digestTasks: [...(raw.digestTasks || []), ...revived.filter((task) => digestId && String(task.project_id) === digestId)],
  };
}

function rebuild() {
  const raw = viewRaw();
  if (!raw) return;
  const today = chicagoToday();
  state.model = buildModel({
    sections: raw.sections,
    osTasks: raw.osTasks,
    digestTasks: raw.digestTasks,
    completed: raw.completed,
    digestProjectId: raw.digest?.id || "",
    today,
  });
  if (!state.month) state.month = today.slice(0, 7);
  if (!state.workoutWeek) state.workoutWeek = mondayOf(today);
  if (!state.course || !state.model.courses.some((course) => course.code === state.course && !course.task.completed)) {
    state.course = state.model.courses.find((course) => !course.task.completed)?.code || "";
  }
}

function renderShellOnly() {
  const y = window.scrollY;
  try {
    document.getElementById("shell").replaceChildren(renderShell(state, actions));
  } catch (error) {
    document.getElementById("shell").replaceChildren(document.createTextNode(error?.message || "The dashboard could not be drawn."));
    return;
  }
  window.scrollTo(0, y);
  tickClock();
}

function renderModal() {
  const node = renderSettings(state, actions);
  const root = document.getElementById("modal");
  root.replaceChildren(node || document.createTextNode(""));
  if (!node) root.textContent = "";
}

function renderToastBox() {
  document.getElementById("toasts").replaceChildren(...renderToasts(state.toasts, reopen));
}

function render() {
  renderShellOnly();
  renderModal();
  renderToastBox();
}

function applyRaw(raw, { offline = false } = {}) {
  state.raw = raw;
  state.offline = offline;
  state.refreshing = false;
  state.screen = "app";
  state.error = "";
  rebuild();
  if (!offline) {
    writeCache(raw);
    state.updatedLabel = "Updated just now";
  } else {
    state.updatedLabel = "Saved copy";
  }
  render();
}

async function saveToken(token) {
  if (!token) {
    state.error = "Paste a token first.";
    render();
    return;
  }
  state.screen = "loading";
  state.error = "";
  state.banner = "";
  render();
  try {
    const raw = await loadDashboard(token);
    state.token = token;
    localStorage.setItem(TOKEN_KEY, token);
    applyRaw(raw);
  } catch (error) {
    state.token = "";
    state.screen = "setup";
    state.error = error instanceof TodoistError ? error.message : "Couldn't reach Todoist. Check your connection and try again.";
    render();
  }
}

function signOut() {
  if (!window.confirm("Sign out on this device? The token and the saved copy of your lists will be removed from this browser.")) return;
  clearSession();
  state.screen = "setup";
  state.error = "";
  render();
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CACHE_KEY);
  state.token = "";
  state.raw = null;
  state.model = null;
  state.pending.clear();
  state.reopened.clear();
  state.toasts.forEach((toast) => clearTimeout(toast.timer));
  state.toasts = [];
  state.banner = "";
  state.updatedLabel = "";
  state.offline = false;
}

function forceAuth(message) {
  localStorage.removeItem(TOKEN_KEY);
  state.token = "";
  state.screen = "setup";
  state.error = message;
  state.refreshing = false;
  state.pending.clear();
  render();
}

async function refresh({ silent }) {
  if (!state.token || state.refreshing) return;
  if (silent && (state.pending.size || state.settingsOpen || state.readingForm || state.readingBusy || state.readingUndo)) return;
  state.refreshing = true;
  if (!silent) state.banner = "";
  renderShellOnly();
  try {
    const raw = await loadDashboard(state.token);
    state.pending.clear();
    state.reopened.clear();
    state.readingUndo = null;
    state.readingForm = null;
    state.readingError = "";
    applyRaw(raw);
  } catch (error) {
    state.refreshing = false;
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    state.banner = error instanceof TodoistError ? error.message : "Couldn't reach Todoist. Check your connection and try again.";
    if (!navigator.onLine) state.offline = true;
    render();
  }
}

function setTab(tab) {
  state.tab = tab;
  state.selectedDay = "";
  renderShellOnly();
  window.scrollTo(0, 0);
}

function openCourse(code) {
  state.course = code;
  state.tab = "school";
  state.scope = "upcoming";
  renderShellOnly();
  window.scrollTo(0, 0);
}

function removeToast(id) {
  const toast = state.toasts.find((item) => item.id === id);
  if (toast) clearTimeout(toast.timer);
  state.toasts = state.toasts.filter((item) => item.id !== id);
  renderToastBox();
}

function pushToast(task) {
  removeToast(task.id);
  const toast = { id: task.id, title: task.content, task };
  toast.timer = setTimeout(() => removeToast(task.id), 5000);
  state.toasts = [...state.toasts, toast];
  renderToastBox();
}

function checkSoundOn() {
  return soundEnabled(localStorage.getItem(SOUND_KEY));
}

function setSound(on) {
  state.soundOn = !!on;
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  renderModal();
}

function complete(task) {
  if (!task?.id || state.pending.has(task.id) || task.completed) return;
  playCheckDing(state.soundOn);
  const entry = { phase: "checking", cancelled: false, closed: false };
  state.pending.set(task.id, entry);
  renderShellOnly();
  entry.timer = setTimeout(() => {
    if (entry.cancelled) return;
    entry.phase = "gone";
    pushToast(task);
    renderShellOnly();
  }, 400);
  entry.done = closeTask(state.token, task.id).then(() => {
    entry.closed = true;
  }).catch((error) => {
    if (entry.cancelled) return;
    clearTimeout(entry.timer);
    state.pending.delete(task.id);
    removeToast(task.id);
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    state.banner = "Could not complete that task. It is still open.";
    render();
  });
}

function findOsTask(id) {
  return (state.raw?.osTasks || []).find((task) => String(task.id) === String(id)) || null;
}

async function ensureReadingSection() {
  const found = (state.raw.sections || []).find((section) => section && section.name === "Reading" && !section.is_deleted && !section.is_archived);
  if (found) return found;
  if (!state.raw?.os?.id) throw new TodoistError("The dashboard project is not available.");
  const created = await createSection(state.token, { name: "Reading", project_id: state.raw.os.id });
  if (!created?.id) throw new TodoistError("Todoist did not create the reading section.");
  state.raw.sections = [...(state.raw.sections || []), created];
  return created;
}

async function ensureReadingHabit(sectionId) {
  rebuild();
  const existing = state.model.reading?.habit;
  if (existing) return findOsTask(existing.id) || existing;
  const created = await createTask(state.token, {
    content: "Read a chapter",
    description: JSON.stringify({ type: "reading-habit" }),
    project_id: state.raw.os.id,
    section_id: sectionId,
    due_string: "every day",
  });
  if (!created?.id) throw new TodoistError("Todoist did not create the daily reading task.");
  state.raw.osTasks = [...(state.raw.osTasks || []), created];
  rebuild();
  return created;
}

function openReadingForm(mode) {
  state.readingForm = mode === "edit" ? "edit" : "add";
  state.readingError = "";
  renderShellOnly();
}

function closeReadingForm() {
  state.readingForm = null;
  state.readingError = "";
  renderShellOnly();
}

async function saveBook(input) {
  const parsed = parseBookForm(input);
  if (parsed.error) {
    state.readingError = parsed.error;
    renderShellOnly();
    return;
  }
  if (state.readingBusy) return;
  state.readingBusy = true;
  state.readingError = "";
  renderShellOnly();
  const editing = state.readingForm === "edit";
  const previous = state.model.reading?.book || null;
  try {
    const section = await ensureReadingSection();
    await ensureReadingHabit(section.id);
    const description = bookDescription({
      title: parsed.title,
      author: parsed.author,
      chapters: parsed.chapters,
      chapter: parsed.chapter,
      meta: editing && previous ? previous.meta : { type: "book", current: true },
    });
    if (editing && previous) {
      await updateTask(state.token, previous.id, { content: parsed.title, description });
      const local = findOsTask(previous.id);
      if (local) {
        local.content = parsed.title;
        local.description = description;
      }
    } else {
      const created = await createTask(state.token, {
        content: parsed.title,
        description,
        project_id: state.raw.os.id,
        section_id: section.id,
      });
      if (!created?.id) throw new TodoistError("Todoist did not save the book.");
      if (!created.added_at) created.added_at = new Date().toISOString();
      state.raw.osTasks = [...(state.raw.osTasks || []), created];
      rebuild();
      const others = (state.model.reading?.books || []).filter((item) => String(item.id) !== String(created.id) && item.meta?.current === true);
      for (const item of others) {
        const meta = { ...item.meta };
        delete meta.current;
        const cleared = bookDescription({
          title: item.meta.title || item.content,
          author: item.meta.author,
          chapters: item.meta.chapters,
          chapter: item.meta.chapter,
          meta,
        });
        const local = findOsTask(item.id);
        if (local) local.description = cleared;
        try {
          await updateTask(state.token, item.id, { description: cleared });
        } catch (error) {
          if (error instanceof TodoistError && error.auth) throw error;
          if (local) local.description = item.meta ? bookDescription({
            title: item.meta.title || item.content,
            author: item.meta.author,
            chapters: item.meta.chapters,
            chapter: item.meta.chapter,
            meta: item.meta,
          }) : local.description;
          state.banner = "The new book was saved, but the previous selection could not be updated.";
        }
      }
    }
    state.readingForm = null;
    state.readingBusy = false;
    rebuild();
    render();
  } catch (error) {
    state.readingBusy = false;
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    state.readingError = error instanceof TodoistError ? error.message : "Could not save the book.";
    render();
  }
}

async function selectBook(id) {
  const books = state.model.reading?.books || [];
  const chosen = books.find((item) => String(item.id) === String(id));
  if (!chosen || String(state.model.reading?.book?.id) === String(chosen.id) || state.readingBusy) return;
  const updates = [];
  for (const item of books) {
    const selected = String(item.id) === String(chosen.id);
    if ((item.meta?.current === true) === selected) continue;
    const meta = { ...item.meta };
    if (selected) meta.current = true;
    else delete meta.current;
    const local = findOsTask(item.id);
    if (!local) continue;
    updates.push({
      id: item.id,
      local,
      previous: local.description,
      description: bookDescription({
        title: item.meta.title || item.content,
        author: item.meta.author,
        chapters: item.meta.chapters,
        chapter: item.meta.chapter,
        meta,
      }),
    });
  }
  if (!updates.length) return;
  state.readingBusy = true;
  for (const update of updates) update.local.description = update.description;
  rebuild();
  renderShellOnly();
  try {
    for (const update of updates) await updateTask(state.token, update.id, { description: update.description });
    state.readingBusy = false;
    renderShellOnly();
  } catch (error) {
    for (const update of updates) update.local.description = update.previous;
    state.readingBusy = false;
    rebuild();
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    state.banner = "Could not switch books.";
    render();
  }
}

async function changeChapter(delta) {
  const book = state.model.reading?.book;
  if (!book || state.readingBusy) return;
  const next = adjustChapter(book.meta.chapter, book.meta.chapters, delta);
  const now = readingProgress(book.meta.chapter, book.meta.chapters);
  if (next.chapter === now.chapter) return;
  const local = findOsTask(book.id);
  if (!local) return;
  const previous = local.description;
  const description = bookDescription({
    title: book.meta.title || book.content,
    author: book.meta.author,
    chapters: next.chapters,
    chapter: next.chapter,
    meta: book.meta,
  });
  local.description = description;
  rebuild();
  renderShellOnly();
  try {
    await updateTask(state.token, book.id, { description });
  } catch (error) {
    local.description = previous;
    rebuild();
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    state.banner = "Could not update the chapter.";
    render();
  }
}

async function readToday() {
  const book = state.model.reading?.book;
  if (!book || state.readingBusy || state.readingUndo || state.model.reading?.doneToday) return;
  playCheckDing(state.soundOn);
  state.readingBusy = true;
  renderShellOnly();
  const localBook = findOsTask(book.id);
  const beforeDesc = localBook?.description || "";
  try {
    const section = await ensureReadingSection();
    const habit = await ensureReadingHabit(section.id);
    const beforeDue = habit.due ? JSON.parse(JSON.stringify(habit.due)) : null;
    const next = incrementChapter(book.meta.chapter, book.meta.chapters);
    const description = bookDescription({
      title: book.meta.title || book.content,
      author: book.meta.author,
      chapters: next.chapters,
      chapter: next.chapter,
      meta: book.meta,
    });
    if (localBook && next.chapter !== readingProgress(book.meta.chapter, book.meta.chapters).chapter) localBook.description = description;
    habit.due = { ...(habit.due || {}), date: addDays(state.model.today, 1), string: habit.due?.string || "every day", is_recurring: true };
    state.readingUndo = {
      bookId: String(book.id),
      habitId: String(habit.id),
      beforeDesc,
      nextDesc: localBook?.description || description,
      beforeDue,
      closed: false,
      updated: false,
    };
    state.readingBusy = false;
    rebuild();
    pushToast({ id: "reading", content: "Read a chapter", reading: true });
    renderShellOnly();
    await closeTask(state.token, habit.id);
    state.readingUndo.closed = true;
    if (localBook && localBook.description !== beforeDesc) {
      await updateTask(state.token, book.id, { description: localBook.description });
      state.readingUndo.updated = true;
    }
  } catch (error) {
    state.readingBusy = false;
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    const message = error instanceof TodoistError ? error.message : "Could not record today's reading.";
    if (state.readingUndo) await undoReading(message);
    else {
      state.banner = message;
      render();
    }
  }
}

async function undoReading(failure) {
  const undo = state.readingUndo;
  removeToast("reading");
  if (!undo) {
    const book = state.model.reading?.book;
    const habit = state.model.reading?.habit;
    if (!book || !state.model.reading?.doneToday) return;
    const next = adjustChapter(book.meta.chapter, book.meta.chapters, -1);
    const description = bookDescription({
      title: book.meta.title || book.content,
      author: book.meta.author,
      chapters: next.chapters,
      chapter: next.chapter,
      meta: book.meta,
    });
    const local = findOsTask(book.id);
    if (local) local.description = description;
    const habitRaw = habit ? findOsTask(habit.id) : null;
    if (habitRaw) habitRaw.due = { ...(habitRaw.due || {}), date: state.model.today, string: habit.dueString || "every day" };
    rebuild();
    renderShellOnly();
    try {
      await updateTask(state.token, book.id, { description });
      if (habit) await updateTask(state.token, habit.id, { due_string: habit.dueString || "every day" });
    } catch (error) {
      if (error instanceof TodoistError && error.auth) {
        forceAuth(error.message);
        return;
      }
      state.banner = "Could not undo today's reading. Refresh to see the current list.";
      render();
    }
    return;
  }
  const book = findOsTask(undo.bookId);
  const habit = findOsTask(undo.habitId);
  if (book) book.description = undo.beforeDesc;
  if (habit) habit.due = undo.beforeDue;
  state.readingUndo = null;
  rebuild();
  renderShellOnly();
  try {
    if (undo.updated) await updateTask(state.token, undo.bookId, { description: undo.beforeDesc });
    if (undo.closed) {
      await reopenTask(state.token, undo.habitId).catch(() => {});
      await updateTask(state.token, undo.habitId, { due_string: undo.beforeDue?.string || "every day" });
    }
    if (failure) state.banner = failure;
    if (failure) render();
  } catch (error) {
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    state.banner = "Could not undo today's reading. Refresh to see the current list.";
    render();
  }
}

function reopen(task) {
  if (task?.reading || task?.id === "reading") {
    undoReading();
    return;
  }
  const entry = state.pending.get(task.id);
  if (entry) {
    entry.cancelled = true;
    clearTimeout(entry.timer);
    state.pending.delete(task.id);
    removeToast(task.id);
    renderShellOnly();
    entry.done.then(() => {
      if (!entry.closed) return null;
      return reopenTask(state.token, task.id);
    }).catch(() => {
      state.banner = "Could not reopen that task. Refresh to see the current list.";
      render();
    });
    return;
  }
  if (!task?.completed) return;
  state.reopened.add(task.id);
  rebuild();
  renderShellOnly();
  reopenTask(state.token, task.id).catch((error) => {
    state.reopened.delete(task.id);
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    state.banner = "Could not reopen that task.";
    rebuild();
    render();
  });
}

function openSettings() {
  state.settingsOpen = true;
  state.settingsError = "";
  renderModal();
}

function closeSettings() {
  state.settingsOpen = false;
  state.settings = loadSettings();
  state.settingsError = "";
  render();
}

function editSettings(next) {
  state.settings = next;
  renderModal();
}

function saveSettings(draft) {
  const links = [];
  for (const link of draft.links) {
    if (!link.label && !link.href) continue;
    if (!link.label || !safeHttp(link.href)) {
      state.settingsError = "Each link needs a name and an http or https address.";
      renderModal();
      return;
    }
    links.push(link);
  }
  const personal = draft.personal.filter((row) => row.label).map((row) => ({ label: row.label, value: row.value }));
  state.settings = { personal, links };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  state.settingsOpen = false;
  state.settingsError = "";
  render();
}

function tickAnalog(date = new Date()) {
  const angles = analogAngles(date);
  const label = `Local time ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  for (const face of document.querySelectorAll("[data-analog]")) {
    if (face.getAttribute("aria-label") !== label) face.setAttribute("aria-label", label);
    for (const name of ["hour", "minute", "second"]) {
      const hand = face.querySelector(`[data-hand="${name}"]`);
      if (hand) hand.setAttribute("transform", `rotate(${angles[name]} 50 50)`);
    }
  }
}

function tickClock() {
  const text = sidebarClockParts(new Date());
  tickAnalog();
  for (const node of document.querySelectorAll("[data-clock=hms]")) node.textContent = text.time;
  for (const node of document.querySelectorAll("[data-clock=day]")) node.textContent = text.date;
  const bar = document.querySelector("[data-np=bar]");
  const player = state.spotify?.player;
  if (bar && player?.item?.duration_ms) {
    let ms = player.progress_ms || 0;
    if (player.is_playing && player.fetchedAt) ms += Date.now() - player.fetchedAt;
    const pct = Math.max(0, Math.min(100, (ms / player.item.duration_ms) * 100));
    bar.style.width = `${pct}%`;
  }
  const line = document.querySelector("[data-now=line]");
  if (line) line.style.top = `${36 + (chicagoHour() - 7) * 40}px`;
  if (state.model && chicagoToday() !== state.model.today && state.raw) {
    rebuild();
    renderShellOnly();
  }
}

const SPOTIFY_KEYS = {
  clientId: "dashboard.spotify.clientId",
  embed: "dashboard.spotify.embed",
  tokens: "dashboard.spotify.tokens",
  verifier: "dashboard.spotify.verifier",
  state: "dashboard.spotify.state",
};

function loadSpotifyStore() {
  let embed = null;
  let tokens = null;
  try { embed = JSON.parse(localStorage.getItem(SPOTIFY_KEYS.embed) || "null"); } catch { embed = null; }
  try { tokens = JSON.parse(localStorage.getItem(SPOTIFY_KEYS.tokens) || "null"); } catch { tokens = null; }
  state.spotify.clientId = localStorage.getItem(SPOTIFY_KEYS.clientId) || "";
  state.spotify.embed = embed && embed.id ? embed : null;
  state.spotify.tokens = tokens;
  state.spotify.connected = !!(tokens && tokens.refresh_token);
}

function saveSpotifyEmbed(value) {
  const parsed = parseSpotifyLink(value);
  if (!parsed) {
    state.spotify.embedError = "Paste an open.spotify.com playlist, album, or track link.";
    renderShellOnly();
    return;
  }
  state.spotify.embed = parsed;
  state.spotify.embedError = "";
  state.spotify.editing = false;
  localStorage.setItem(SPOTIFY_KEYS.embed, JSON.stringify(parsed));
  renderShellOnly();
}

function clearSpotifyEmbed() {
  state.spotify.embed = null;
  state.spotify.editing = false;
  localStorage.removeItem(SPOTIFY_KEYS.embed);
  renderShellOnly();
}

function toggleSpotifyEdit() {
  state.spotify.editing = !state.spotify.editing;
  state.spotify.embedError = "";
  renderShellOnly();
}

function saveSpotifyClient(value) {
  const id = String(value || "").trim();
  state.spotify.clientId = id;
  if (id) localStorage.setItem(SPOTIFY_KEYS.clientId, id);
  else localStorage.removeItem(SPOTIFY_KEYS.clientId);
  state.spotify.settings = true;
  renderShellOnly();
}

function toggleSpotifySettings() {
  state.spotify.settings = !state.spotify.settings;
  renderShellOnly();
}

function disconnectSpotify() {
  localStorage.removeItem(SPOTIFY_KEYS.tokens);
  state.spotify.tokens = null;
  state.spotify.connected = false;
  state.spotify.player = null;
  state.spotify.editing = false;
  state.spotify.devices = [];
  state.spotify.note = "";
  renderShellOnly();
}

async function connectSpotify() {
  const clientId = state.spotify.clientId || localStorage.getItem(SPOTIFY_KEYS.clientId) || "";
  if (!clientId) {
    state.spotify.settings = true;
    state.spotify.embedError = "Save a Spotify client ID in Settings first.";
    renderShellOnly();
    return;
  }
  const verifier = randomVerifier();
  const challenge = await codeChallenge(verifier);
  const oauthState = randomVerifier().slice(0, 16);
  localStorage.setItem(SPOTIFY_KEYS.verifier, verifier);
  localStorage.setItem(SPOTIFY_KEYS.state, oauthState);
  localStorage.setItem(SPOTIFY_KEYS.clientId, clientId);
  location.assign(authorizeUrl({ clientId, challenge, state: oauthState }));
}

async function spotifyToken(body) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody({ ...body, client_id: state.spotify.clientId, redirect_uri: SPOTIFY_REDIRECT }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error_description || json.error || "Spotify did not return a token.");
  const tokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token || state.spotify.tokens?.refresh_token || "",
    expires_at: Date.now() + (Number(json.expires_in) || 3600) * 1000 - 60000,
  };
  state.spotify.tokens = tokens;
  state.spotify.connected = !!tokens.refresh_token || !!tokens.access_token;
  localStorage.setItem(SPOTIFY_KEYS.tokens, JSON.stringify(tokens));
  return tokens;
}

async function spotifyAccess() {
  const tokens = state.spotify.tokens;
  if (!tokens?.access_token) return "";
  if (tokens.expires_at && Date.now() < tokens.expires_at) return tokens.access_token;
  if (!tokens.refresh_token) return "";
  const next = await spotifyToken({ grant_type: "refresh_token", refresh_token: tokens.refresh_token });
  return next.access_token;
}

async function consumeSpotifyRedirect() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const error = params.get("error");
  if (!code && !error) return;
  const returned = params.get("state");
  history.replaceState({}, "", `${location.pathname}${location.hash}`);
  if (error) {
    state.spotify.note = "Spotify authorization was cancelled.";
    return;
  }
  if (!returned || returned !== localStorage.getItem(SPOTIFY_KEYS.state)) {
    state.spotify.note = "Spotify returned an unexpected response. Connect again.";
    return;
  }
  const verifier = localStorage.getItem(SPOTIFY_KEYS.verifier) || "";
  localStorage.removeItem(SPOTIFY_KEYS.verifier);
  localStorage.removeItem(SPOTIFY_KEYS.state);
  try {
    await spotifyToken({ grant_type: "authorization_code", code, code_verifier: verifier });
    await loadSpotifyPlayer(true);
  } catch (err) {
    state.spotify.note = err.message || "Could not connect Spotify.";
  }
}

function shapePlayer(body) {
  if (!body || !body.item) return { is_playing: !!body?.is_playing, progress_ms: body?.progress_ms || 0, item: null, device: body?.device || null, fetchedAt: Date.now() };
  const images = (body.item.album?.images || body.item.images || []).filter((img) => img?.url);
  const cover = images.reduce((best, img) => (!best || (img.width || 0) > (best.width || 0) ? img : best), null);
  return {
    is_playing: !!body.is_playing,
    progress_ms: body.progress_ms || 0,
    fetchedAt: Date.now(),
    device: body.device || null,
    item: {
      name: body.item.name || "",
      artists: (body.item.artists || []).map((artist) => artist.name).filter(Boolean).join(", "),
      duration_ms: body.item.duration_ms || 0,
      image: cover?.url || "",
    },
  };
}

async function loadSpotifyPlayer(full) {
  const access = await spotifyAccess();
  if (!access) return;
  const player = await spotifyFetch(access, "/me/player");
  if (player.status === 401) {
    disconnectSpotify();
    state.spotify.note = "Spotify session expired. Connect again.";
    renderShellOnly();
    return;
  }
  const noteBefore = state.spotify.note;
  if (player.status === 204 || player.status === 200) {
    state.spotify.player = player.status === 204 ? null : shapePlayer(player.body);
    if (player.status === 204) state.spotify.note = "Nothing is playing. Open Spotify on a device, or press play in the embed.";
    else if (!state.spotify.note?.includes("Premium")) state.spotify.note = "";
  }
  const live = document.querySelector("[data-spotify-live]");
  if (live && !full && state.spotify.note === noteBefore) paintSpotifyLive();
  else renderShellOnly();
}

function paintSpotifyLive() {
  const title = document.querySelector("[data-np=title]");
  if (!title) {
    renderShellOnly();
    return;
  }
  const item = state.spotify.player?.item;
  title.textContent = item?.name || "Nothing playing";
  const artist = document.querySelector("[data-np=artist]");
  if (artist) artist.textContent = item?.artists || "";
  const image = document.querySelector("[data-np=art]");
  if (!!image !== !!item?.image) {
    renderShellOnly();
    return;
  }
  if (image && item?.image && image.getAttribute("src") !== item.image) image.src = item.image;
  const toggle = document.querySelector("[data-np=toggle]");
  if (toggle) {
    const playing = !!state.spotify.player?.is_playing;
    toggle.textContent = playing ? "⏸" : "▶";
    toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
  }
}

async function spotifyCommand(path, { method = "PUT", json = null } = {}) {
  const access = await spotifyAccess();
  if (!access) return null;
  const result = await spotifyFetch(access, path, { method, json });
  if (premiumRequired(result)) {
    state.spotify.premium = false;
    state.spotify.note = "Playback controls need Spotify Premium. The embed below still works.";
    renderShellOnly();
    return result;
  }
  if (noDevice(result)) {
    const devices = await spotifyFetch(access, "/me/player/devices");
    state.spotify.devices = devices.status === 200 ? (devices.body?.devices || []) : [];
    state.spotify.note = state.spotify.devices.length
      ? "No active device. Transfer playback to one below."
      : "No active Spotify device. Open the Spotify app, then try again.";
    renderShellOnly();
    return result;
  }
  state.spotify.devices = [];
  if (result.status >= 200 && result.status < 300) state.spotify.note = "";
  await loadSpotifyPlayer(false);
  return result;
}

function spotifyControl(action) {
  if (action === "next") return spotifyCommand("/me/player/next", { method: "POST" });
  if (action === "previous") return spotifyCommand("/me/player/previous", { method: "POST" });
  if (action === "pause") return spotifyCommand("/me/player/pause", { method: "PUT" });
  return spotifyCommand("/me/player/play", { method: "PUT" });
}

function spotifyTransfer(deviceId) {
  return spotifyCommand("/me/player", { method: "PUT", json: { device_ids: [deviceId], play: true } });
}

function boot() {
  state.soundOn = checkSoundOn();
  loadSpotifyStore();
  if (state.spotify.connected) loadSpotifyPlayer(true).catch(() => {});
  consumeSpotifyRedirect();
  state.settings = loadSettings();
  const token = localStorage.getItem(TOKEN_KEY) || "";
  if (!token) {
    state.screen = "setup";
    render();
    return;
  }
  state.token = token;
  state.screen = "loading";
  render();
  loadDashboard(token).then((raw) => applyRaw(raw)).catch((error) => {
    if (error instanceof TodoistError && error.auth) {
      forceAuth(error.message);
      return;
    }
    const cached = readCache();
    if (cached) {
      state.banner = error instanceof TodoistError ? error.message : "Couldn't reach Todoist. Showing the last copy saved on this device.";
      applyRaw(cached, { offline: true });
      return;
    }
    state.screen = "setup";
    state.error = error instanceof TodoistError ? error.message : "Couldn't reach Todoist. Check your connection and try again.";
    render();
  });
}

let focusTimer = 0;
function onFocus() {
  if (document.visibilityState === "hidden") return;
  clearTimeout(focusTimer);
  focusTimer = setTimeout(() => {
    if (state.token && state.screen === "app") refresh({ silent: true });
  }, 300);
}

document.addEventListener("visibilitychange", onFocus);
window.addEventListener("focus", onFocus);
setInterval(tickClock, 1000);
setInterval(() => {
  if (document.visibilityState === "hidden" || !state.spotify.connected) return;
  loadSpotifyPlayer(false).catch(() => {});
}, 8000);
function paintAnalog() {
  tickAnalog();
  requestAnimationFrame(paintAnalog);
}
requestAnimationFrame(paintAnalog);

if ("serviceWorker" in navigator) {
  const build = new URL(import.meta.url).searchParams.get("v") || "dev";
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem("dashboard-sw") === build) return;
    sessionStorage.setItem("dashboard-sw", build);
    location.reload();
  });
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
}

boot();
