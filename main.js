const path = require('path');
const fs = require('fs');
const dns = require('dns');
const { spawn } = require('child_process');

const electronImport = require('electron');
if (typeof electronImport === 'string') {
  const relaunchEnv = { ...process.env };
  delete relaunchEnv.ELECTRON_RUN_AS_NODE;
  spawn(electronImport, [path.join(__dirname)], {
    env: relaunchEnv,
    detached: true,
    stdio: 'ignore'
  }).unref();
  process.exit(0);
}

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = electronImport;
const { autoUpdater } = require('electron-updater');
const packageMeta = require('./package.json');
const db = require('./database/db');
const { buildInvoiceTemplateHtml, buildInvoiceViewModel } = require('./invoice-template');

// Prevent app crashes when stdio pipe is unavailable (Windows/Electron can throw EPIPE on writes).
const isEpipe = (err) => Boolean(err && (err.code === 'EPIPE' || /EPIPE/i.test(String(err.message || ''))));
const nativeConsoleError = console.error.bind(console);
console.error = (...args) => {
  try {
    nativeConsoleError(...args);
  } catch (err) {
    if (!isEpipe(err)) throw err;
  }
};
if (process.stdout?.write) {
  const outWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (...args) => {
    try {
      return outWrite(...args);
    } catch (err) {
      if (isEpipe(err)) return false;
      throw err;
    }
  };
  process.stdout.on('error', (err) => {
    if (!isEpipe(err)) throw err;
  });
}
if (process.stderr?.write) {
  const errWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (...args) => {
    try {
      return errWrite(...args);
    } catch (err) {
      if (isEpipe(err)) return false;
      throw err;
    }
  };
  process.stderr.on('error', (err) => {
    if (!isEpipe(err)) throw err;
  });
}
process.on('uncaughtException', (err) => {
  if (isEpipe(err)) return;
  nativeConsoleError('Uncaught exception in main process:', err);
});
process.on('unhandledRejection', (reason) => {
  if (isEpipe(reason)) return;
  nativeConsoleError('Unhandled rejection in main process:', reason);
});

let mainWindow;
let activeSession = null;
const UPDATE_STATUS_CHANNEL = 'updater:status';
let currentUpdateState = { state: 'idle', message: 'Updater idle.', progress: null, updateReady: false };

function sendUpdateStatus(partial = {}) {
  currentUpdateState = { ...currentUpdateState, ...partial };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(UPDATE_STATUS_CHANNEL, currentUpdateState);
  }
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
  ]);
}

async function hasInternetConnection() {
  try {
    await withTimeout(dns.promises.lookup('github.com'), 2500);
    return true;
  } catch {
    return false;
  }
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ state: 'checking', message: 'Checking for updates...', progress: null, updateReady: false });
  });
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      state: 'available',
      message: `Update available (${info?.version || 'new version'}). Downloading in background...`,
      progress: 0,
      updateReady: false
    });
  });
  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ state: 'not-available', message: 'You are up to date.', progress: null, updateReady: false });
  });
  autoUpdater.on('download-progress', (progressObj) => {
    const pct = Number(progressObj?.percent || 0);
    sendUpdateStatus({
      state: 'downloading',
      message: `Downloading update... ${pct.toFixed(1)}%`,
      progress: pct,
      updateReady: false
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      state: 'downloaded',
      message: `Update ${info?.version || ''} ready. Restart to install.`,
      progress: 100,
      updateReady: true
    });
  });
  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error);
    sendUpdateStatus({ state: 'error', message: 'Update check failed. App continues normally.', progress: null, updateReady: false });
  });
}

async function checkForUpdatesIfOnline(source = 'startup') {
  if (!app.isPackaged) {
    sendUpdateStatus({ state: 'disabled', message: 'Auto-update is disabled in development mode.', progress: null, updateReady: false });
    return { checked: false, reason: 'dev' };
  }
  const isOnline = await hasInternetConnection();
  if (!isOnline) {
    sendUpdateStatus({ state: 'offline', message: 'Offline: update check skipped.', progress: null, updateReady: false });
    return { checked: false, reason: 'offline' };
  }
  try {
    if (source === 'startup') {
      await autoUpdater.checkForUpdatesAndNotify();
    } else {
      await autoUpdater.checkForUpdates();
    }
    return { checked: true };
  } catch (error) {
    console.error('Update check failed:', error);
    sendUpdateStatus({ state: 'error', message: 'Update check failed. App continues normally.', progress: null, updateReady: false });
    return { checked: false, reason: 'error' };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'ASW Inventory',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.on('did-finish-load', () => {
    sendUpdateStatus(currentUpdateState);
  });
}

function toPositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid positive integer.`);
  }
  return parsed;
}

function getActiveCompanyId() {
  return activeSession?.activeCompanyId || null;
}

function isClockedInForActiveCompany() {
  if (!activeSession || !activeSession.activeCompanyId) {
    return false;
  }
  return Boolean(activeSession.clockedInCompanies[String(activeSession.activeCompanyId)]);
}

function requireLogin() {
  if (!activeSession) {
    throw new Error('Please login to continue.');
  }
}

function requireClockIn() {
  requireLogin();
  if (!isClockedInForActiveCompany()) {
    throw new Error('Clock-in is required before accessing this module.');
  }
}

function ensureAdmin() {
  requireLogin();
  if (!activeSession.user.isAdmin) {
    throw new Error('Admin access required.');
  }
}

function hasPermission(moduleName, action) {
  if (!activeSession?.user) return false;
  if (activeSession.user.isAdmin || String(activeSession.user.username || '').toLowerCase() === 'admin') return true;
  const perms = activeSession.user.permissions || {};
  return Boolean(perms?.[moduleName]?.[action]);
}

function requirePermission(moduleName, action) {
  requireLogin();
  if (!hasPermission(moduleName, action)) {
    throw new Error(`Permission denied: ${moduleName}.${action}`);
  }
}

function userHasCompanyAccess(companyId) {
  if (!activeSession) return false;
  if (activeSession.user.isAdmin) return true;
  return activeSession.user.assignedCompanies.includes(companyId);
}

function setActiveCompany(companyId) {
  const id = toPositiveInt(companyId, 'Company ID');
  if (!userHasCompanyAccess(id)) {
    throw new Error('You do not have access to this company.');
  }
  activeSession.activeCompanyId = id;
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function reportToCsv(report) {
  const lines = [];
  lines.push('ASW Inventory Sales Report');
  lines.push(`Period,${escapeCsvCell(report.period)}`);
  lines.push(`Start Date,${escapeCsvCell(report.startDate)}`);
  lines.push(`End Date,${escapeCsvCell(report.endDate)}`);
  lines.push('');
  lines.push('Summary');
  lines.push('Total Transactions,Total Items Sold,Total Revenue');
  lines.push([report.summary.totalTransactions, report.summary.totalItemsSold, report.summary.totalRevenue].map(escapeCsvCell).join(','));
  lines.push('');
  lines.push('Top Selling Products');
  lines.push('Product ID,Product Name,Units Sold,Revenue');
  for (const row of report.topProducts || []) {
    lines.push([row.id, row.name, row.unitsSold, row.revenue].map(escapeCsvCell).join(','));
  }
  lines.push('');
  lines.push('Sales By Customer');
  lines.push('Customer,Transactions,Revenue');
  for (const row of report.customerSales || []) {
    lines.push([row.customerName, row.transactions, row.revenue].map(escapeCsvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function sanitizeFileName(fileName) {
  return String(fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function safeHexColor(color, fallback = '#f4c214') {
  return /^#[0-9a-fA-F]{6}$/.test(String(color || '').trim()) ? String(color).trim() : fallback;
}

async function generateInvoicePdf(invoice, company, settings, destinationPath) {
  const html = buildInvoiceTemplateHtml({ invoice, company: { ...company, primaryColor: safeHexColor(company?.primaryColor, '#f4c214') }, settings });
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: 'A4'
    });
    fs.writeFileSync(destinationPath, pdfBuffer);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

function getCompanyAssetDirectory() {
  const sourceDbPath = db.getDatabasePath();
  const baseDir = sourceDbPath ? path.dirname(sourceDbPath) : app.getPath('userData');
  const assetDir = path.join(baseDir, 'company_assets');
  if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true });
  }
  return assetDir;
}

function getUserProfileDirectory() {
  const sourceDbPath = db.getDatabasePath();
  const baseDir = sourceDbPath ? path.dirname(sourceDbPath) : app.getPath('userData');
  const profileDir = path.join(baseDir, 'user_profiles');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
  return profileDir;
}

async function pickAndStoreCompanyAsset(title, targetPrefix) {
  const selected = await dialog.showOpenDialog(mainWindow, {
    title,
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
  });
  if (selected.canceled || selected.filePaths.length === 0) return { cancelled: true };
  const sourcePath = selected.filePaths[0];
  const extension = path.extname(sourcePath).toLowerCase() || '.png';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetName = sanitizeFileName(`${targetPrefix}-${timestamp}${extension}`);
  const destinationPath = path.join(getCompanyAssetDirectory(), targetName);
  fs.copyFileSync(sourcePath, destinationPath);
  return { cancelled: false, path: destinationPath };
}

async function pickAndStoreUserProfileImage(targetUserId) {
  const selected = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Profile Image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });
  if (selected.canceled || selected.filePaths.length === 0) return { cancelled: true };
  const sourcePath = selected.filePaths[0];
  const stat = fs.statSync(sourcePath);
  const maxBytes = 5 * 1024 * 1024;
  if (stat.size > maxBytes) throw new Error('Profile image must be 5MB or smaller.');
  const extension = path.extname(sourcePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) throw new Error('Only PNG, JPG, and WEBP images are supported.');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetName = sanitizeFileName(`user-${targetUserId}-${timestamp}${extension}`);
  const destinationPath = path.join(getUserProfileDirectory(), targetName);
  fs.copyFileSync(sourcePath, destinationPath);
  await db.updateUserProfileImage(targetUserId, destinationPath);
  return { cancelled: false, path: destinationPath };
}

async function hydrateSessionPayload() {
  if (!activeSession) {
    return { authenticated: false };
  }
  const freshUser = await db.getUserAccessProfile(activeSession.user.id);
  if (!freshUser || !freshUser.isActive) {
    activeSession = null;
    return { authenticated: false };
  }
  activeSession.user = freshUser;
  const companies = await db.getCompaniesForUser(activeSession.user);
  if (!companies.length) {
    activeSession = null;
    return { authenticated: false };
  }
  if (!companies.some((c) => c.id === activeSession.activeCompanyId)) {
    activeSession.activeCompanyId = companies[0].id;
  }
  return {
    authenticated: true,
    user: activeSession.user,
    companies,
    activeCompanyId: activeSession.activeCompanyId,
    clockedIn: isClockedInForActiveCompany()
  };
}

function registerIpcHandlers() {
  // App/window utility channels used by the custom themed renderer menu.
  ipcMain.handle('app:getInfo', async () => ({
    name: app.getName() || packageMeta.productName || 'ASW Inventory',
    version: app.getVersion(),
    author: String(packageMeta.author || 'ASW'),
    license: String(packageMeta.license || 'ISC')
  }));
  ipcMain.handle('app:openDocumentation', async () => {
    const readmePath = path.join(__dirname, 'README.md');
    if (fs.existsSync(readmePath)) {
      await shell.openPath(readmePath);
      return { ok: true, path: readmePath };
    }
    await shell.openExternal('https://github.com/koditots/asw-inventory');
    return { ok: true, path: null };
  });
  ipcMain.handle('app:quit', async () => {
    app.quit();
    return { ok: true };
  });
  ipcMain.handle('window:action', async (_event, payload) => {
    const action = String(payload?.action || '').trim();
    const win = BrowserWindow.fromWebContents(_event.sender) || mainWindow;
    if (!win || win.isDestroyed()) return { ok: false };
    if (action === 'minimize') win.minimize();
    else if (action === 'maximize') {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    } else if (action === 'fullscreen') {
      win.setFullScreen(!win.isFullScreen());
    } else if (action === 'devtools') {
      win.webContents.toggleDevTools();
    } else if (action === 'refresh') {
      win.webContents.reloadIgnoringCache();
    }
    return { ok: true };
  });

  ipcMain.handle('updater:check', async () => checkForUpdatesIfOnline('manual'));
  ipcMain.handle('updater:install', async () => {
    if (!app.isPackaged) return { ok: false, reason: 'dev' };
    if (!currentUpdateState.updateReady) return { ok: false, reason: 'not-ready' };
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  });

  ipcMain.handle('auth:session', async () => hydrateSessionPayload());
  ipcMain.handle('auth:permissions', async () => {
    const session = await hydrateSessionPayload();
    return session?.user?.permissions || {};
  });

  ipcMain.handle('auth:login', async (_event, payload) => {
    const user = await db.authenticateUser(payload || {});
    const profile = await db.getUserAccessProfile(user.id);
    const companies = await db.getCompaniesForUser(user);
    if (companies.length === 0) {
      throw new Error('No company assigned to this user.');
    }
    activeSession = {
      user: profile || user,
      activeCompanyId: companies[0].id,
      clockedInCompanies: {}
    };
    return hydrateSessionPayload();
  });

  ipcMain.handle('auth:logout', async () => {
    activeSession = null;
    return { authenticated: false };
  });

  ipcMain.handle('session:switchCompany', async (_event, payload) => {
    requireLogin();
    setActiveCompany(payload?.companyId);
    return hydrateSessionPayload();
  });

  ipcMain.handle('clockin:status', async () => ({
    required: true,
    clockedIn: isClockedInForActiveCompany()
  }));

  ipcMain.handle('clockin:submit', async (_event, payload) => {
    requireLogin();
    const companyId = getActiveCompanyId();
    const eventRow = await db.recordClockIn({
      userId: activeSession.user.id,
      companyId,
      photoDataUrl: payload?.photoDataUrl
    });
    activeSession.clockedInCompanies[String(companyId)] = true;
    return eventRow;
  });

  ipcMain.handle('clockin:listRecent', async (_event, payload) => {
    requireLogin();
    requirePermission('dashboard', 'view');
    const limit = payload?.limit || 20;
    if (activeSession.user.isAdmin) {
      return db.getRecentClockIns(limit, payload?.allCompanies ? null : getActiveCompanyId());
    }
    return db.getRecentClockIns(limit, getActiveCompanyId(), activeSession.user.id);
  });

  ipcMain.handle('companies:getMine', async () => {
    requireLogin();
    return db.getCompaniesForUser(activeSession.user);
  });

  ipcMain.handle('companies:create', async (_event, payload) => {
    requirePermission('company', 'create');
    const company = await db.createCompany(payload || {});
    if (!activeSession.user.isAdmin && company?.id) {
      const assigned = Array.from(new Set([...(activeSession.user.assignedCompanies || []), company.id]));
      await db.updateUser({
        id: activeSession.user.id,
        username: activeSession.user.username,
        isAdmin: activeSession.user.isAdmin,
        assignedCompanies: assigned
      });
      activeSession.user.assignedCompanies = assigned;
      if (!activeSession.activeCompanyId) {
        activeSession.activeCompanyId = company.id;
      }
    }
    return company;
  });
  ipcMain.handle('companies:update', async (_event, payload) => {
    requirePermission('company', 'edit');
    return db.updateCompany(toPositiveInt(payload?.id, 'Company ID'), payload || {});
  });
  ipcMain.handle('companies:delete', async (_event, payload) => {
    requirePermission('company', 'delete');
    return db.deleteCompany(toPositiveInt(payload?.id, 'Company ID'));
  });

  ipcMain.handle('company:getActive', async () => {
    requirePermission('company', 'view');
    return db.getCompanyById(getActiveCompanyId());
  });
  ipcMain.handle('company:saveActive', async (_event, payload) => {
    requireClockIn();
    requirePermission('company', 'edit');
    return db.updateCompany(getActiveCompanyId(), payload || {});
  });
  ipcMain.handle('company:selectLogo', async () => {
    requirePermission('company', 'edit');
    return pickAndStoreCompanyAsset('Select Company Logo', 'logo');
  });
  ipcMain.handle('company:selectSignature', async () => {
    requirePermission('company', 'edit');
    return pickAndStoreCompanyAsset('Select Company Signature', 'signature');
  });

  ipcMain.handle('settings:get', async () => {
    requireClockIn();
    // Read access is needed broadly for invoice defaults/preview; write remains permission-gated.
    return db.getCompanySettings(getActiveCompanyId());
  });
  ipcMain.handle('settings:update', async (_event, payload) => {
    requirePermission('settings', 'edit');
    return db.updateCompanySettings(getActiveCompanyId(), payload || {});
  });

  ipcMain.handle('users:getAll', async () => {
    requirePermission('users', 'view');
    return db.getUsers();
  });
  ipcMain.handle('users:create', async (_event, payload) => {
    requirePermission('users', 'create');
    return db.createUser(payload || {});
  });
  ipcMain.handle('users:update', async (_event, payload) => {
    requirePermission('users', 'edit');
    return db.updateUser(payload || {});
  });
  ipcMain.handle('users:resetPassword', async (_event, payload) => {
    requirePermission('users', 'edit');
    return db.resetUserPassword(payload || {});
  });
  ipcMain.handle('users:delete', async (_event, payload) => {
    requirePermission('users', 'delete');
    return db.deleteUser(toPositiveInt(payload?.id, 'User ID'));
  });
  ipcMain.handle('users:changePassword', async (_event, payload) => db.changePassword(payload || {}));
  ipcMain.handle('users:selectProfileImage', async (_event, payload) => {
    requireLogin();
    const targetId = payload?.id ? toPositiveInt(payload.id, 'User ID') : activeSession.user.id;
    if (!activeSession.user.isAdmin && targetId !== activeSession.user.id) {
      throw new Error('You can only update your own profile image.');
    }
    if (activeSession.user.isAdmin || targetId === activeSession.user.id) {
      return pickAndStoreUserProfileImage(targetId);
    }
    throw new Error('Permission denied.');
  });

  ipcMain.handle('roles:getAll', async () => {
    requirePermission('roles', 'view');
    return db.getRoles();
  });
  ipcMain.handle('roles:create', async (_event, payload) => {
    requirePermission('roles', 'create');
    return db.createRole(payload || {});
  });
  ipcMain.handle('roles:update', async (_event, payload) => {
    requirePermission('roles', 'edit');
    return db.updateRole(payload || {});
  });
  ipcMain.handle('roles:delete', async (_event, payload) => {
    requirePermission('roles', 'delete');
    return db.deleteRole(toPositiveInt(payload?.id, 'Role ID'));
  });
  ipcMain.handle('rowAccess:getForUser', async (_event, payload) => {
    requirePermission('roles', 'view');
    return db.getUserRowAccess(toPositiveInt(payload?.userId, 'User ID'), payload?.tableName || null);
  });
  ipcMain.handle('rowAccess:add', async (_event, payload) => {
    requirePermission('roles', 'edit');
    return db.setUserRowAccess(payload || {});
  });
  ipcMain.handle('rowAccess:remove', async (_event, payload) => {
    requirePermission('roles', 'edit');
    return db.removeUserRowAccess(payload || {});
  });

  ipcMain.handle('categories:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('categories', 'create');
    return db.createCategory(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('categories:getAll', async () => {
    requireClockIn();
    requirePermission('categories', 'view');
    return db.getCategories(getActiveCompanyId());
  });
  ipcMain.handle('categories:update', async (_event, payload) => {
    requireClockIn();
    requirePermission('categories', 'edit');
    return db.updateCategory(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('categories:delete', async (_event, payload) => {
    requireClockIn();
    requirePermission('categories', 'delete');
    return db.deleteCategory(toPositiveInt(payload?.id, 'Category ID'), getActiveCompanyId());
  });

  ipcMain.handle('suppliers:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('suppliers', 'create');
    return db.createSupplier(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('suppliers:getAll', async () => {
    requireClockIn();
    requirePermission('suppliers', 'view');
    return db.getSuppliers(getActiveCompanyId());
  });
  ipcMain.handle('suppliers:update', async (_event, payload) => {
    requireClockIn();
    requirePermission('suppliers', 'edit');
    return db.updateSupplier(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('suppliers:delete', async (_event, payload) => {
    requireClockIn();
    requirePermission('suppliers', 'delete');
    return db.deleteSupplier(toPositiveInt(payload?.id, 'Supplier ID'), getActiveCompanyId());
  });

  ipcMain.handle('customers:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('customers', 'create');
    return db.createCustomer(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('customers:getAll', async () => {
    requireClockIn();
    requirePermission('customers', 'view');
    return db.getCustomers(getActiveCompanyId());
  });
  ipcMain.handle('customers:update', async (_event, payload) => {
    requireClockIn();
    requirePermission('customers', 'edit');
    return db.updateCustomer(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('customers:delete', async (_event, payload) => {
    requireClockIn();
    requirePermission('customers', 'delete');
    return db.deleteCustomer(toPositiveInt(payload?.id, 'Customer ID'), getActiveCompanyId());
  });

  ipcMain.handle('products:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('products', 'create');
    return db.createProduct(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('products:getAll', async () => {
    requireClockIn();
    requirePermission('products', 'view');
    return db.getProducts(getActiveCompanyId());
  });
  ipcMain.handle('products:update', async (_event, payload) => {
    requireClockIn();
    requirePermission('products', 'edit');
    return db.updateProduct(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('products:delete', async (_event, payload) => {
    requireClockIn();
    requirePermission('products', 'delete');
    return db.deleteProduct(toPositiveInt(payload?.id, 'Product ID'), getActiveCompanyId());
  });

  ipcMain.handle('sales:record', async (_event, payload) => {
    requireClockIn();
    requirePermission('sales', 'create');
    return db.recordSale({ ...(payload || {}), createdBy: activeSession?.user?.id }, getActiveCompanyId());
  });

  ipcMain.handle('invoices:getNextNumber', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'create');
    return db.getNextInvoiceNumber(getActiveCompanyId(), payload?.type);
  });
  ipcMain.handle('invoices:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'create');
    const companySettings = await db.getCompanySettings(getActiveCompanyId());
    const taxValue = payload?.taxPercent;
    const hasExplicitTax = !(taxValue === undefined || taxValue === null || String(taxValue).trim() === '');
    const merged = { ...(payload || {}) };
    if (!hasExplicitTax) merged.taxPercent = Number(companySettings?.defaultTaxRate || 0);
    return db.createInvoice(merged, getActiveCompanyId(), activeSession?.user?.id);
  });
  ipcMain.handle('invoices:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'view');
    return db.getInvoices(getActiveCompanyId(), payload || {});
  });
  ipcMain.handle('invoices:getById', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'view');
    return db.getInvoiceById(toPositiveInt(payload?.id, 'Invoice ID'), getActiveCompanyId());
  });
  ipcMain.handle('invoices:getPayments', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'view');
    return db.getInvoicePayments(toPositiveInt(payload?.invoiceId, 'Invoice ID'), getActiveCompanyId());
  });
  ipcMain.handle('invoices:addPayment', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'edit');
    return db.recordInvoicePayment(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });
  ipcMain.handle('invoices:exportPdf', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'print');
    const invoice = await db.getInvoiceById(toPositiveInt(payload?.id, 'Invoice ID'), getActiveCompanyId());
    if (!invoice) throw new Error('Invoice not found.');
    const company = await db.getCompanyById(getActiveCompanyId());
    const companySettings = await db.getCompanySettings(getActiveCompanyId());
    const selected = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Document (PDF)',
      defaultPath: `${sanitizeFileName(invoice.invoiceNumber || `document-${invoice.id}`)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (selected.canceled || !selected.filePath) return { cancelled: true };
    await generateInvoicePdf(invoice, company, companySettings, selected.filePath);
    if (payload?.openAfterSave) {
      await shell.openPath(selected.filePath);
    }
    return { cancelled: false, filePath: selected.filePath };
  });
  ipcMain.handle('invoices:previewPdf', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'print');
    const company = await db.getCompanyById(getActiveCompanyId());
    const companySettings = await db.getCompanySettings(getActiveCompanyId());
    const customerId = toPositiveInt(payload?.customerId, 'Customer ID');
    const customer = await db.getCustomers(getActiveCompanyId()).then((rows) => rows.find((c) => c.id === customerId));
    if (!customer) throw new Error('Selected customer not found.');
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    if (!rawItems.length) throw new Error('Add at least one item before generating preview PDF.');
    const items = rawItems.map((item) => {
      const qty = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Item quantity/price is invalid.');
      return {
        name: String(item.name || 'Item'),
        quantity: qty,
        unitPrice: Number(unitPrice.toFixed(2)),
        lineTotal: Number((qty * unitPrice).toFixed(2))
      };
    });
    const subtotal = Number(items.reduce((sum, x) => sum + x.lineTotal, 0).toFixed(2));
    const taxPercent = Math.max(0, Number(payload?.taxPercent || 0));
    const discountAmount = Math.max(0, Number(payload?.discountAmount || 0));
    const taxAmount = Number(((subtotal * taxPercent) / 100).toFixed(2));
    const totalAmount = Number(Math.max(0, subtotal + taxAmount - discountAmount).toFixed(2));
    const invoice = {
      type: String(payload?.type || 'invoice'),
      status: String(payload?.status || 'draft'),
      invoiceNumber: String(payload?.invoiceNumber || ''),
      date: payload?.date || new Date().toISOString(),
      validityPeriod: String(payload?.validityPeriod || ''),
      notes: String(payload?.notes || ''),
      customerName: customer.name,
      customerEmail: customer.email || '',
      customerPhone: customer.phone || '',
      items,
      subtotalAmount: subtotal,
      taxPercent,
      taxAmount,
      discountAmount,
      totalAmount
    };
    const settings = { ...companySettings, termsConditions: String(payload?.termsConditions || companySettings?.termsConditions || '') };
    const selected = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Preview Document (PDF)',
      defaultPath: `${sanitizeFileName(invoice.invoiceNumber || `preview-${Date.now()}`)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (selected.canceled || !selected.filePath) return { cancelled: true };
    await generateInvoicePdf(invoice, company, settings, selected.filePath);
    if (payload?.openAfterSave) await shell.openPath(selected.filePath);
    return { cancelled: false, filePath: selected.filePath };
  });
  ipcMain.handle('invoices:renderTemplate', async (_event, payload) => {
    requireClockIn();
    requirePermission('invoices', 'view');
    const company = await db.getCompanyById(getActiveCompanyId());
    const settings = await db.getCompanySettings(getActiveCompanyId());
    const invoice = payload || {};
    return buildInvoiceTemplateHtml({
      invoice,
      company: { ...(company || {}), primaryColor: safeHexColor(company?.primaryColor, '#f4c214') },
      settings: {
        ...(settings || {}),
        termsConditions: String(invoice?.termsConditions || settings?.termsConditions || '')
      }
    }, { fragment: true });
  });
  ipcMain.handle('dashboard:getStats', async () => {
    requireClockIn();
    requirePermission('dashboard', 'view');
    const scopeUserId = activeSession.user.isAdmin ? null : activeSession.user.id;
    return db.getDashboardStats(getActiveCompanyId(), scopeUserId);
  });
  ipcMain.handle('dashboard:getActivities', async (_event, payload) => {
    requireClockIn();
    requirePermission('dashboard', 'view');
    return db.getRecentActivities(getActiveCompanyId(), payload?.limit || 20);
  });

  ipcMain.handle('reports:getSales', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    const period = String(payload?.period || 'daily');
    return db.getSalesReport(period, getActiveCompanyId());
  });
  ipcMain.handle('reports:getInventory', async () => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getInventoryReport(getActiveCompanyId());
  });
  ipcMain.handle('reports:getProfitLoss', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getProfitLossSummary(getActiveCompanyId(), payload?.period || 'monthly');
  });
  ipcMain.handle('reports:getStaffPerformance', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getStaffPerformanceReport(getActiveCompanyId(), payload?.period || 'monthly');
  });
  ipcMain.handle('finance:getSummary', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getFinancialSummary(getActiveCompanyId(), payload?.period || 'daily');
  });
  ipcMain.handle('customers:getInsights', async (_event, payload) => {
    requireClockIn();
    requirePermission('customers', 'view');
    return db.getCustomerInsights(getActiveCompanyId(), payload?.customerId || null);
  });
  ipcMain.handle('stock:getMovements', async (_event, payload) => {
    requireClockIn();
    requirePermission('products', 'view');
    return db.getStockMovements(getActiveCompanyId(), payload || {});
  });
  ipcMain.handle('stock:adjust', async (_event, payload) => {
    requireClockIn();
    requirePermission('products', 'edit');
    return db.adjustStock(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });
  ipcMain.handle('receipts:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('sales', 'view');
    return db.getReceipts(getActiveCompanyId(), payload || {});
  });

  ipcMain.handle('reports:exportCsv', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'print');
    const report = payload?.report;
    if (!report) throw new Error('No report data provided for export.');
    const selected = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Sales Report (CSV)',
      defaultPath: `sales-report-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (selected.canceled || !selected.filePath) return { cancelled: true };
    fs.writeFileSync(selected.filePath, reportToCsv(report), 'utf8');
    return { cancelled: false, filePath: selected.filePath };
  });

  ipcMain.handle('database:backup', async () => {
    requireLogin();
    const sourcePath = db.getDatabasePath();
    if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error('Database file was not found.');
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup Folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (selected.canceled || selected.filePaths.length === 0) return { cancelled: true };
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destinationPath = path.join(selected.filePaths[0], `inventory-backup-${timestamp}.db`);
    fs.copyFileSync(sourcePath, destinationPath);
    return { cancelled: false, destinationPath };
  });

  ipcMain.handle('database:restore', async () => {
    requireLogin();
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Inventory Backup File',
      properties: ['openFile'],
      filters: [{ name: 'Database Files', extensions: ['db', 'sqlite', 'sqlite3'] }]
    });
    if (selected.canceled || selected.filePaths.length === 0) return { cancelled: true };
    await db.restoreDatabase(selected.filePaths[0]);
    return { cancelled: false, restoredFrom: selected.filePaths[0] };
  });
}

async function bootstrap() {
  await db.initializeDatabase(app);
  // Hide native menu bar; renderer provides the custom professional menu UI.
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  configureAutoUpdater();
  createWindow();
  await checkForUpdatesIfOnline('startup');
}

app.whenReady().then(bootstrap).catch((error) => {
  console.error('Failed to start ASW Inventory:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', async () => {
  try {
    await db.closeDatabase();
  } catch (error) {
    console.error('Failed to close database connection:', error);
  }
});
