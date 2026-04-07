const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
const nodemailer = require('nodemailer');
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
let emailQueueTimer = null;
let autoBackupTimer = null;
const DEV_UPDATE_CONFIG_NAME = 'dev-app-update.yml';
const INDUSTRY_TYPES = ['retail', 'hospitality', 'medical', 'general'];
const DEFAULT_INDUSTRY = 'general';

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

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function deriveSmtpCipherKey() {
  // A simple local encryption key for SMTP credentials at rest.
  const seed = process.env.ASW_SMTP_SECRET || `${app.getPath('userData')}|asw-inventory-smtp-key`;
  return crypto.createHash('sha256').update(seed).digest();
}

function encryptSmtpPassword(plainText) {
  const text = String(plainText || '');
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveSmtpCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSmtpPassword(cipherText) {
  const raw = String(cipherText || '');
  if (!raw) return '';
  if (!raw.startsWith('v1:')) return raw;
  const [, iv64, tag64, enc64] = raw.split(':');
  if (!iv64 || !tag64 || !enc64) return '';
  const iv = Buffer.from(iv64, 'base64');
  const tag = Buffer.from(tag64, 'base64');
  const encrypted = Buffer.from(enc64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveSmtpCipherKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function normalizeSmtpConfig(input = {}) {
  const smtpHost = String(input.smtpHost || '').trim();
  const smtpPort = Number(input.smtpPort || 0);
  const smtpUser = String(input.smtpUser || '').trim();
  const smtpPass = String(input.smtpPass || '').trim();
  const smtpSecure = Boolean(input.smtpSecure);
  if (!smtpHost) throw new Error('SMTP host is required.');
  if (!Number.isFinite(smtpPort) || smtpPort <= 0 || smtpPort > 65535) throw new Error('SMTP port must be between 1 and 65535.');
  if (!isEmail(smtpUser)) throw new Error('SMTP email address is invalid.');
  if (!smtpPass) throw new Error('SMTP password is required.');
  return { smtpHost, smtpPort: Math.round(smtpPort), smtpUser, smtpPass, smtpSecure };
}

function sanitizeAttachments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => x && typeof x.path === 'string' && x.path.trim())
    .map((x) => ({
      filename: x.filename ? String(x.filename) : path.basename(String(x.path)),
      path: String(x.path)
    }));
}

function parseAttachmentsJson(raw) {
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return sanitizeAttachments(parsed);
  } catch {
    return [];
  }
}

async function sendEmailWithConfig(config, payload = {}) {
  const normalized = normalizeSmtpConfig(config);
  const to = String(payload.to || '').trim();
  const subject = String(payload.subject || '').trim();
  const text = String(payload.text || '').trim();
  const html = String(payload.html || '').trim();
  if (!isEmail(to)) throw new Error('Recipient email is invalid.');
  if (!subject) throw new Error('Email subject is required.');
  const transporter = nodemailer.createTransport({
    host: normalized.smtpHost,
    port: normalized.smtpPort,
    secure: normalized.smtpSecure,
    auth: { user: normalized.smtpUser, pass: normalized.smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
  const info = await transporter.sendMail({
    from: normalized.smtpUser,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
    attachments: sanitizeAttachments(payload.attachments)
  });
  return { messageId: info?.messageId || '' };
}

function paymentStatusLabel(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'paid') return 'Paid';
  if (status === 'partial') return 'Partial';
  return 'Unpaid';
}

async function queueOrSendInvoiceEmail(companyId, payload = {}) {
  const to = String(payload?.to || '').trim();
  if (!isEmail(to)) return { ok: false, skipped: 'invalid-recipient' };
  let company;
  try {
    company = await db.getCompanyEmailConfigRaw(companyId);
  } catch {
    return { ok: false, skipped: 'missing-config' };
  }
  const config = {
    smtpHost: company?.smtpHost,
    smtpPort: company?.smtpPort,
    smtpUser: company?.smtpUser,
    smtpPass: decryptSmtpPassword(company?.smtpPass),
    smtpSecure: company?.smtpSecure
  };
  try {
    normalizeSmtpConfig(config);
  } catch {
    return { ok: false, skipped: 'invalid-config' };
  }
  const emailPayload = {
    to,
    subject: String(payload?.subject || '').trim(),
    text: String(payload?.text || '').trim(),
    html: String(payload?.html || '').trim(),
    attachments: sanitizeAttachments(payload?.attachments)
  };
  try {
    const sent = await sendEmailWithConfig(config, emailPayload);
    return { ok: true, queued: false, messageId: sent?.messageId || '' };
  } catch (error) {
    const queueId = await db.enqueueEmail({
      companyId,
      recipient: emailPayload.to,
      subject: emailPayload.subject,
      textBody: emailPayload.text,
      htmlBody: emailPayload.html,
      attachments: emailPayload.attachments,
      purpose: String(payload?.purpose || 'invoice')
    });
    return { ok: true, queued: true, queueId, warning: error?.message || 'Email queued due to send failure.' };
  }
}

async function notifyInvoiceCreated(companyId, invoice) {
  if (!invoice || !isEmail(invoice.customerEmail)) return { ok: false, skipped: 'no-customer-email' };
  const summary = `${invoice.invoiceNumber} | Total: ${Number(invoice.totalAmount || 0).toFixed(2)} | Paid: ${Number(invoice.amountPaid || 0).toFixed(2)} | Balance: ${Number(invoice.balance || 0).toFixed(2)}`;
  return queueOrSendInvoiceEmail(companyId, {
    purpose: 'invoice',
    to: invoice.customerEmail,
    subject: 'New Invoice',
    text: `A new invoice has been created.\n${summary}\nStatus: ${paymentStatusLabel(invoice.paymentStatus)}`,
    html: `<p>A new invoice has been created for <strong>${invoice.customerName || 'Customer'}</strong>.</p>
<p><strong>Invoice:</strong> ${invoice.invoiceNumber}<br/><strong>Total:</strong> ${Number(invoice.totalAmount || 0).toFixed(2)}<br/><strong>Amount Paid:</strong> ${Number(invoice.amountPaid || 0).toFixed(2)}<br/><strong>Balance:</strong> ${Number(invoice.balance || 0).toFixed(2)}<br/><strong>Payment Status:</strong> ${paymentStatusLabel(invoice.paymentStatus)}</p>`
  });
}

async function notifyInvoicePayment(companyId, invoice, payment) {
  const notifications = [];
  if (invoice && isEmail(invoice.customerEmail)) {
    notifications.push(queueOrSendInvoiceEmail(companyId, {
      purpose: 'invoice',
      to: invoice.customerEmail,
      subject: 'Payment Received',
      text: `Payment received for invoice ${invoice.invoiceNumber}.\nAmount: ${Number(payment?.amount || 0).toFixed(2)}\nRemaining Balance: ${Number(invoice.balance || 0).toFixed(2)}`,
      html: `<p>We received your payment for invoice <strong>${invoice.invoiceNumber}</strong>.</p>
<p><strong>Amount Paid:</strong> ${Number(payment?.amount || 0).toFixed(2)}<br/><strong>Remaining Balance:</strong> ${Number(invoice.balance || 0).toFixed(2)}</p>`
    }));
  }
  const company = await db.getCompanyEmailConfigRaw(companyId);
  const adminRecipient = String(company?.smtpUser || '').trim();
  if (isEmail(adminRecipient)) {
    notifications.push(queueOrSendInvoiceEmail(companyId, {
      purpose: 'system',
      to: adminRecipient,
      subject: 'Payment Update Notification',
      text: `Invoice ${invoice?.invoiceNumber || ''}: payment ${Number(payment?.amount || 0).toFixed(2)} recorded. Remaining balance ${Number(invoice?.balance || 0).toFixed(2)}.`,
      html: `<p>Payment update recorded.</p><p><strong>Invoice:</strong> ${invoice?.invoiceNumber || '-'}<br/><strong>Amount:</strong> ${Number(payment?.amount || 0).toFixed(2)}<br/><strong>Balance:</strong> ${Number(invoice?.balance || 0).toFixed(2)}</p>`
    }));
  }
  await Promise.all(notifications);
}

async function notifyOutstandingReminder(companyId, invoice) {
  if (!invoice || String(invoice.paymentStatus || '').toLowerCase() === 'paid' || !isEmail(invoice.customerEmail)) return;
  await queueOrSendInvoiceEmail(companyId, {
    purpose: 'reminder',
    to: invoice.customerEmail,
    subject: 'Outstanding Payment Reminder',
    text: `Reminder: invoice ${invoice.invoiceNumber} has an outstanding balance of ${Number(invoice.balance || 0).toFixed(2)}.`,
    html: `<p>This is a reminder that invoice <strong>${invoice.invoiceNumber}</strong> has an outstanding payment.</p><p><strong>Total:</strong> ${Number(invoice.totalAmount || 0).toFixed(2)}<br/><strong>Amount Paid:</strong> ${Number(invoice.amountPaid || 0).toFixed(2)}<br/><strong>Balance:</strong> ${Number(invoice.balance || 0).toFixed(2)}<br/><strong>Status:</strong> ${paymentStatusLabel(invoice.paymentStatus)}</p>`
  });
}

async function processQueuedEmails(limit = 10) {
  const queueItems = await db.getPendingEmailQueue(limit);
  for (const item of queueItems) {
    try {
      const company = await db.getCompanyEmailConfigRaw(item.companyId);
      const config = {
        smtpHost: company.smtpHost,
        smtpPort: company.smtpPort,
        smtpUser: company.smtpUser,
        smtpPass: decryptSmtpPassword(company.smtpPass),
        smtpSecure: company.smtpSecure
      };
      await sendEmailWithConfig(config, {
        to: item.recipient,
        subject: item.subject,
        text: item.textBody,
        html: item.htmlBody,
        attachments: parseAttachmentsJson(item.attachments)
      });
      await db.markEmailQueuedSent(item.id);
    } catch (error) {
      await db.markEmailQueuedFailed(item.id, error?.message || 'Failed to send queued email.');
    }
  }
}

function startEmailQueueWorker() {
  if (emailQueueTimer) clearInterval(emailQueueTimer);
  emailQueueTimer = setInterval(() => {
    processQueuedEmails(12).catch((error) => {
      console.error('Email queue worker failed:', error);
    });
  }, 60 * 1000);
}

function startAutoBackupWorker() {
  if (autoBackupTimer) clearInterval(autoBackupTimer);
  autoBackupTimer = setInterval(() => {
    runAutoBackupIfDue().catch((error) => {
      console.error('Auto backup worker failed:', error);
    });
  }, 60 * 60 * 1000);
}

function configureAutoUpdater() {
  // Allow local updater checks when running unpackaged, if dev-app-update.yml is present.
  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true;
  }
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
    const devConfigPath = path.join(app.getAppPath(), DEV_UPDATE_CONFIG_NAME);
    if (!fs.existsSync(devConfigPath)) {
      const message = 'Updater requires a packaged app or dev-app-update.yml for local testing.';
      sendUpdateStatus({ state: 'disabled', message, progress: null, updateReady: false });
      return { checked: false, reason: 'dev', message };
    }
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
  lines.push('');
  lines.push('Invoice Payment Tracking');
  lines.push('Invoice Number,Customer,Total Amount,Amount Paid,Balance,Payment Status,Initiated By,Last Payment By,Last Payment Date');
  for (const row of report.invoicePayments || []) {
    lines.push([
      row.invoiceNumber,
      row.customerName,
      row.totalAmount,
      row.amountPaid,
      row.balance,
      row.paymentStatus,
      row.initiatedBy,
      row.lastPaymentByName,
      row.lastPaymentAt
    ].map(escapeCsvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function sanitizeFileName(fileName) {
  return String(fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function safeHexColor(color, fallback = '#f4c214') {
  return /^#[0-9a-fA-F]{6}$/.test(String(color || '').trim()) ? String(color).trim() : fallback;
}

function normalizeIndustryType(industryType) {
  const normalized = String(industryType || '').trim().toLowerCase();
  return INDUSTRY_TYPES.includes(normalized) ? normalized : DEFAULT_INDUSTRY;
}

function deepMerge(left = {}, right = {}) {
  const output = { ...(left || {}) };
  for (const [key, value] of Object.entries(right || {})) {
    if (Array.isArray(value)) output[key] = value.slice();
    else if (value && typeof value === 'object') output[key] = deepMerge(output[key] || {}, value);
    else output[key] = value;
  }
  return output;
}

function readIndustryConfigFile(name) {
  const filePath = path.join(__dirname, 'modules', name, 'industry_config.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function resolveIndustryConfig(industryType = DEFAULT_INDUSTRY, settings = {}) {
  const industry = normalizeIndustryType(industryType);
  const base = readIndustryConfigFile('core');
  const extension = readIndustryConfigFile(industry === 'general' ? 'core' : industry);
  const merged = deepMerge(base, extension);
  const enabledModules = Array.isArray(settings?.enabledModules) ? settings.enabledModules : ['core'];
  const featureToggles = settings?.featureToggles && typeof settings.featureToggles === 'object' ? settings.featureToggles : {};
  const syncEnabled = Boolean(settings?.syncEnabled);
  return {
    industry,
    visibleSidebarItems: Array.isArray(merged.visibleSidebarItems) ? merged.visibleSidebarItems : [],
    enabledFeatures: { ...(merged.enabledFeatures || {}), ...featureToggles, sync: syncEnabled },
    labelMap: merged.labelMap || {},
    enabledModules
  };
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

function getAutoBackupDirectory() {
  const sourceDbPath = db.getDatabasePath();
  const baseDir = sourceDbPath ? path.dirname(sourceDbPath) : app.getPath('userData');
  const backupDir = path.join(baseDir, 'auto_backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

async function runAutoBackupIfDue() {
  const sourcePath = db.getDatabasePath();
  if (!sourcePath || !fs.existsSync(sourcePath)) return { skipped: 'missing-db' };
  const now = new Date();
  const companies = await db.getAllCompanies();
  for (const company of companies) {
    const settings = await db.getCompanySettings(company.id);
    if (!settings.syncEnabled) continue;
    const last = settings.lastAutoBackupAt ? new Date(settings.lastAutoBackupAt) : null;
    if (last && !Number.isNaN(last.getTime()) && (now.getTime() - last.getTime()) < 24 * 60 * 60 * 1000) continue;
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const target = path.join(getAutoBackupDirectory(), `company-${company.id}-auto-${stamp}.db`);
    fs.copyFileSync(sourcePath, target);
    await db.updateCompanySettings(company.id, { lastAutoBackupAt: now.toISOString() });
  }
  return { ok: true };
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
    const docsUrl = 'http://austcomswift.com/doc/asw-inventory';
    await shell.openExternal(docsUrl);
    return { ok: true, url: docsUrl };
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

  // Email setup + sending module (SMTP).
  ipcMain.handle('email:settings:get', async () => {
    requireClockIn();
    requirePermission('settings', 'edit');
    return db.getCompanyEmailSetup(getActiveCompanyId());
  });
  ipcMain.handle('email:settings:update', async (_event, payload) => {
    requireClockIn();
    requirePermission('settings', 'edit');
    const config = normalizeSmtpConfig(payload || {});
    return db.updateCompanyEmailSetup(getActiveCompanyId(), {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      smtpPass: encryptSmtpPassword(config.smtpPass),
      smtpSecure: config.smtpSecure
    });
  });
  ipcMain.handle('email:testConnection', async (_event, payload) => {
    requireClockIn();
    requirePermission('settings', 'edit');
    let config;
    if (payload && Object.keys(payload).length) {
      config = normalizeSmtpConfig(payload);
    } else {
      const row = await db.getCompanyEmailConfigRaw(getActiveCompanyId());
      config = normalizeSmtpConfig({
        smtpHost: row.smtpHost,
        smtpPort: row.smtpPort,
        smtpUser: row.smtpUser,
        smtpPass: decryptSmtpPassword(row.smtpPass),
        smtpSecure: row.smtpSecure
      });
    }
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: { user: config.smtpUser, pass: config.smtpPass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      await transporter.verify();
      return { ok: true };
    } catch (error) {
      throw new Error(`SMTP test failed: ${error?.message || 'Connection could not be established.'}`);
    }
  });
  ipcMain.handle('email:send', async (_event, payload) => {
    requireClockIn();
    const purpose = String(payload?.purpose || 'invoice').toLowerCase();
    if (purpose === 'system') requirePermission('settings', 'edit');
    else if (purpose === 'reminder') requirePermission('customers', 'view');
    else requirePermission('invoices', 'print');
    const companyId = getActiveCompanyId();
    const company = await db.getCompanyEmailConfigRaw(companyId);
    const config = normalizeSmtpConfig({
      smtpHost: company.smtpHost,
      smtpPort: company.smtpPort,
      smtpUser: company.smtpUser,
      smtpPass: decryptSmtpPassword(company.smtpPass),
      smtpSecure: company.smtpSecure
    });
    const queueIfOffline = payload?.queueIfOffline !== false;
    try {
      const result = await sendEmailWithConfig(config, payload || {});
      return { ok: true, queued: false, messageId: result.messageId };
    } catch (error) {
      if (queueIfOffline) {
        const queueId = await db.enqueueEmail({
          companyId,
          recipient: payload?.to,
          subject: payload?.subject,
          textBody: payload?.text,
          htmlBody: payload?.html,
          attachments: sanitizeAttachments(payload?.attachments),
          purpose
        });
        return { ok: true, queued: true, queueId, warning: error?.message || 'Email queued due to send failure.' };
      }
      throw new Error(error?.message || 'Email sending failed.');
    }
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

  ipcMain.handle('modules:getConfig', async () => {
    requireLogin();
    const company = await db.getCompanyById(getActiveCompanyId());
    const settings = await db.getCompanySettings(getActiveCompanyId());
    return resolveIndustryConfig(company?.industryType || DEFAULT_INDUSTRY, settings || {});
  });

  ipcMain.handle('system:getConfiguration', async () => {
    requireClockIn();
    requirePermission('settings', 'view');
    const company = await db.getCompanyById(getActiveCompanyId());
    const settings = await db.getCompanySettings(getActiveCompanyId());
    return {
      companyId: company?.id,
      industryType: normalizeIndustryType(company?.industryType),
      syncEnabled: Boolean(settings?.syncEnabled),
      enabledModules: settings?.enabledModules || ['core'],
      featureToggles: settings?.featureToggles || {},
      moduleConfig: resolveIndustryConfig(company?.industryType, settings)
    };
  });

  ipcMain.handle('system:updateConfiguration', async (_event, payload) => {
    ensureAdmin();
    const activeCompanyId = getActiveCompanyId();
    const nextIndustry = normalizeIndustryType(payload?.industryType);
    const currentSettings = await db.getCompanySettings(activeCompanyId);
    await db.updateCompany(activeCompanyId, { industryType: nextIndustry });
    const updatedSettings = await db.updateCompanySettings(activeCompanyId, {
      ...currentSettings,
      syncEnabled: payload?.syncEnabled ?? currentSettings.syncEnabled,
      enabledModules: payload?.enabledModules ?? currentSettings.enabledModules,
      featureToggles: payload?.featureToggles ?? currentSettings.featureToggles
    });
    return {
      company: await db.getCompanyById(activeCompanyId),
      settings: updatedSettings,
      moduleConfig: resolveIndustryConfig(nextIndustry, updatedSettings)
    };
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

  ipcMain.handle('wallet:get', async () => {
    requireClockIn();
    requirePermission('cashflow', 'view');
    return db.getCompanyWallet(getActiveCompanyId());
  });

  ipcMain.handle('vendors:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('vendors', 'view');
    return db.getVendors(getActiveCompanyId(), payload || {});
  });
  ipcMain.handle('vendors:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('vendors', 'create');
    return db.createVendor(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });

  ipcMain.handle('expenses:categories:getAll', async () => {
    requireClockIn();
    requirePermission('expenses', 'view');
    return db.getExpenseCategories(getActiveCompanyId());
  });
  ipcMain.handle('expenses:categories:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('expenses', 'edit');
    if (!activeSession?.user?.isAdmin) throw new Error('Only admin can create expense categories.');
    return db.createExpenseCategory(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });
  ipcMain.handle('expenses:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('expenses', 'view');
    return db.getExpenses(getActiveCompanyId(), payload || {});
  });
  ipcMain.handle('expenses:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('expenses', 'create');
    return db.createExpense(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });

  ipcMain.handle('income:categories:getAll', async () => {
    requireClockIn();
    requirePermission('income', 'view');
    return db.getIncomeCategories(getActiveCompanyId());
  });
  ipcMain.handle('income:categories:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('income', 'edit');
    if (!activeSession?.user?.isAdmin) throw new Error('Only admin can create income categories.');
    return db.createIncomeCategory(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });
  ipcMain.handle('income:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('income', 'view');
    return db.getAdditionalIncome(getActiveCompanyId(), payload || {});
  });
  ipcMain.handle('income:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('income', 'create');
    return db.createAdditionalIncome(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });

  ipcMain.handle('rooms:getAll', async () => {
    requireClockIn();
    requirePermission('company', 'view');
    return db.getRooms(getActiveCompanyId());
  });
  ipcMain.handle('rooms:create', async (_event, payload) => {
    ensureAdmin();
    return db.createRoom(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('guests:getAll', async () => {
    requireClockIn();
    requirePermission('customers', 'view');
    return db.getGuests(getActiveCompanyId());
  });
  ipcMain.handle('guests:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('customers', 'create');
    return db.createGuest(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('bookings:getAll', async () => {
    requireClockIn();
    requirePermission('company', 'view');
    return db.getBookings(getActiveCompanyId());
  });
  ipcMain.handle('bookings:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('company', 'create');
    return db.createBooking(payload || {}, getActiveCompanyId(), activeSession?.user?.id);
  });
  ipcMain.handle('bookings:updateStatus', async (_event, payload) => {
    requireClockIn();
    requirePermission('company', 'edit');
    return db.updateBookingStatus(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('patients:getAll', async () => {
    requireClockIn();
    requirePermission('customers', 'view');
    return db.getPatients(getActiveCompanyId());
  });
  ipcMain.handle('patients:create', async (_event, payload) => {
    requireClockIn();
    requirePermission('customers', 'create');
    return db.createPatient(payload || {}, getActiveCompanyId());
  });
  ipcMain.handle('drugExpiry:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('products', 'view');
    return db.getDrugExpiry(getActiveCompanyId(), payload?.daysAhead || 30);
  });
  ipcMain.handle('insights:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getInsightLogs(getActiveCompanyId(), payload?.limit || 100);
  });

  ipcMain.handle('cashflow:transactions:getAll', async (_event, payload) => {
    requireClockIn();
    requirePermission('cashflow', 'view');
    return db.getTransactionLedger(getActiveCompanyId(), payload || {});
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
    const activeCompanyId = getActiveCompanyId();
    const companySettings = await db.getCompanySettings(activeCompanyId);
    const taxValue = payload?.taxPercent;
    const hasExplicitTax = !(taxValue === undefined || taxValue === null || String(taxValue).trim() === '');
    const merged = { ...(payload || {}) };
    if (!hasExplicitTax) merged.taxPercent = Number(companySettings?.defaultTaxRate || 0);
    const created = await db.createInvoice(merged, activeCompanyId, activeSession?.user?.id);
    await Promise.allSettled([
      notifyInvoiceCreated(activeCompanyId, created),
      notifyOutstandingReminder(activeCompanyId, created)
    ]);
    return created;
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
    const activeCompanyId = getActiveCompanyId();
    const payment = await db.recordInvoicePayment(payload || {}, activeCompanyId, activeSession?.user?.id);
    const invoice = await db.getInvoiceById(toPositiveInt(payload?.invoiceId, 'Invoice ID'), activeCompanyId);
    await Promise.allSettled([
      notifyInvoicePayment(activeCompanyId, invoice, payment),
      notifyOutstandingReminder(activeCompanyId, invoice)
    ]);
    return payment;
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
    const paymentStatus = String(payload?.paymentStatus || 'all').toLowerCase();
    return db.getSalesReport(period, getActiveCompanyId(), paymentStatus);
  });
  ipcMain.handle('reports:getInventory', async () => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getInventoryReport(getActiveCompanyId());
  });
  ipcMain.handle('reports:getExpenses', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getExpenseReport(getActiveCompanyId(), payload?.period || 'monthly');
  });
  ipcMain.handle('reports:getIncome', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getIncomeReport(getActiveCompanyId(), payload?.period || 'monthly');
  });
  ipcMain.handle('reports:getCashflow', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getCashflowReport(getActiveCompanyId(), payload?.period || 'monthly');
  });
  ipcMain.handle('reports:getRevenue', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getRevenueReport(getActiveCompanyId(), payload?.period || 'monthly');
  });
  ipcMain.handle('reports:getCombinedFinancial', async (_event, payload) => {
    requireClockIn();
    requirePermission('reports', 'view');
    return db.getCombinedFinancialReport(getActiveCompanyId(), payload?.period || 'monthly');
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
  ipcMain.handle('database:autoBackupNow', async () => {
    ensureAdmin();
    return runAutoBackupIfDue();
  });
}

async function bootstrap() {
  await db.initializeDatabase(app);
  // Hide native menu bar; renderer provides the custom professional menu UI.
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  configureAutoUpdater();
  createWindow();
  startEmailQueueWorker();
  startAutoBackupWorker();
  processQueuedEmails(12).catch(() => {});
  runAutoBackupIfDue().catch(() => {});
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
  if (emailQueueTimer) {
    clearInterval(emailQueueTimer);
    emailQueueTimer = null;
  }
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
  try {
    await db.closeDatabase();
  } catch (error) {
    console.error('Failed to close database connection:', error);
  }
});
