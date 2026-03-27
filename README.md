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
