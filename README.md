# Dashboard

Personal dashboard. Runs in the browser, reads a Todoist account with the owner's token, no data in this repo.

This app is not created by, affiliated with, or supported by Todoist.

## Setup

1. Open the site.
2. Paste a Todoist API token from [Todoist → Settings → Integrations → Developer](https://app.todoist.com/app/settings/integrations/developer).
3. The token stays in this browser only. Sign out removes it.

The Life tab includes a reading card. Adding or editing a book, and checking off a daily read, writes back to Todoist. Nothing about a book is stored in this repo.

The Home column can show a Spotify embed from a link saved in the browser. Connecting Spotify for playback controls uses a client ID that also stays on the device.

## Develop

Serve this folder with any static server. `node --test` runs the checks.

Pushes to `main` publish the site with GitHub Pages. The Pages source must be GitHub Actions.
