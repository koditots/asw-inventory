# ASW Inventory (Electron Desktop App)

AustCom Swift Inventory Software.

ASW Inventory is a fully offline desktop inventory application built with Electron, Node.js, SQLite, HTML, CSS, and JavaScript.

## Features

- Local SQLite database (`inventory.db`)
- Product CRUD: create, read, update, delete
- Sales recording with automatic stock reduction
- Dashboard cards:
  - Total products
  - Low stock alerts
  - Total sales
  - Transaction count
- One-click database backup to a selected folder
- Secure IPC architecture (`contextBridge` + `ipcMain`)
- Packaging support using `electron-builder`

## Project Structure

```text
inventory-app/
├── main.js
├── preload.js
├── package.json
├── renderer/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── database/
│   └── db.js
└── inventory.db (auto-created on first run in dev mode)
```

## Run the App

```bash
npm start
```

## Build / Package

```bash
npm run build
npm run dist
```

## Auto-Update Release Flow (GitHub)

- The app is configured to fetch updates from `koditots/asw-inventory` GitHub Releases.
- CI workflow: `.github/workflows/publish-updates.yml`
- On every push to `main`, CI checks `package.json` version:
  - If release tag `v<version>` does not exist, it builds and publishes installer + update metadata.
  - If it exists, it skips publish.

To ship a new update to installed users:

1. Bump app version in `package.json` (e.g. `1.0.1`).
2. Commit and push to `main`.
3. GitHub Action publishes release assets automatically.
4. Installed apps detect and download update through `electron-updater`.
