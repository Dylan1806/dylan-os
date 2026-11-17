# Dashboard

Personal dashboard. Runs in the browser, reads a Todoist account with the owner's token, no data in this repo.

This app is not created by, affiliated with, or supported by Todoist.

## Setup

1. Open the site.
2. Paste a Todoist API token from [Todoist → Settings → Integrations → Developer](https://app.todoist.com/app/settings/integrations/developer).
3. The token stays in this browser only. Sign out removes it.

## Develop

Serve this folder with any static server. `node --test` runs the checks.

Pushes to `main` publish the site with GitHub Pages. The Pages source must be GitHub Actions.
