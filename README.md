# Dylan OS

A personal dashboard that runs entirely in the browser. It reads two Todoist projects at runtime and can close tasks from the page. There is no backend, and this repository contains no personal data.

This app is not created by, affiliated with, or supported by Todoist.

## Use it

1. Open the site.
2. Paste a Todoist API token from [Todoist → Settings → Integrations → Developer](https://app.todoist.com/app/settings/integrations/developer).
3. The token is saved in `localStorage` on that device only. It is never put in the repository, a URL, or another server.
4. Sign out clears the token and the on-device copy of your lists.

The dashboard looks up a project named exactly `Dylan OS` and these sections by name:

Taskers, A1 To-Do, Team: ACDO, Team: PARO, Team: DEVO, Assignments, Exams, Meetings, Workouts, Goals, Habits, Courses, Spring 2027, Life Areas.

The ROTC tab’s to-do list is the project named exactly `ROTC Digest To Do`.

A task description may be one line of JSON with extra fields (course, type, time, and similar). Labels carry the course code and the type. Bad JSON is ignored.

Checking a box closes that task in Todoist. The row leaves immediately, and Undo reopens it for a few seconds. Refresh, or return to the app, to load changes made on other devices.

Settings on the device can store personal rows and links. Those stay in the browser.

Add the site to your home screen to use it as an app. A service worker keeps the shell available offline; lists need a connection unless this device already saved a copy.

## Develop

Serve the folder with any static server and open `index.html`. API calls go to `https://api.todoist.com/api/v1/`.

```bash
node --test
```

## Deploy

Pushes to `main` run `.github/workflows/pages.yml`, which publishes the site with GitHub Pages. The live site is [https://dylan1806.github.io/dylan-os/](https://dylan1806.github.io/dylan-os/).
