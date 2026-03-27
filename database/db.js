const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

let db;
let databasePath;

const toInt = (v, d = null) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : d;
};
const isEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isHexColor = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || '').trim());
const parseJsonArray = (v) => {
  try {
    const parsed = JSON.parse(v || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const parseJsonObject = (v, fallback = {}) => {
  try {
    const parsed = JSON.parse(v || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const PERMISSION_MODULES = ['dashboard', 'products', 'sales', 'categories', 'suppliers', 'customers', 'invoices', 'reports', 'company', 'users', 'roles', 'settings'];
const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'print'];

function fullPermissions() {
  const permissions = {};
  for (const module of PERMISSION_MODULES) {
    permissions[module] = {};
    for (const action of PERMISSION_ACTIONS) permissions[module][action] = true;
  }
  return permissions;
}

function normalizePermissions(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalized = {};
  for (const module of PERMISSION_MODULES) {
    const moduleSrc = source[module] && typeof source[module] === 'object' ? source[module] : {};
    normalized[module] = {};
    for (const action of PERMISSION_ACTIONS) normalized[module][action] = Boolean(moduleSrc[action]);
  }
  return normalized;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function openDb(filePath) {
  return new Promise((resolve, reject) => {
    const conn = new sqlite3.Database(filePath, (err) => (err ? reject(err) : resolve(conn)));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function colExists(table, col) {
  const rows = await all(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === col);
}

async function ensureCol(table, col, def) {
  if (!(await colExists(table, col))) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
}

const hashPassword = (password, salt) => crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

function strongPassword(password) {
  const p = String(password || '');
  const checks = [p.length >= 8, /[A-Z]/.test(p), /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)];
  return checks.filter(Boolean).length >= 4;
}

async function migrate() {
  await run('PRAGMA foreign_keys = ON');

  await run(`CREATE TABLE IF NOT EXISTS company (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    logo_path TEXT DEFAULT '',
    signature_path TEXT DEFAULT '',
    bank_name TEXT DEFAULT '',
    account_number TEXT DEFAULT '',
    payment_methods TEXT DEFAULT '[]',
    primary_color TEXT NOT NULL DEFAULT '#f4c214',
    smtp_host TEXT NOT NULL DEFAULT '',
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user TEXT NOT NULL DEFAULT '',
    smtp_pass TEXT NOT NULL DEFAULT '',
    smtp_secure INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    UNIQUE(company_id, name)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    contact_info TEXT DEFAULT '',
    UNIQUE(company_id, name)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT ''
  )`);

  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    category_id INTEGER,
    supplier_id INTEGER,
    price REAL NOT NULL CHECK(price >= 0),
    quantity INTEGER NOT NULL CHECK(quantity >= 0),
    min_stock INTEGER NOT NULL DEFAULT 5
  )`);

  await run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    product_id INTEGER NOT NULL,
    customer_id INTEGER,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    total_price REAL NOT NULL CHECK(total_price >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
    balance_due REAL NOT NULL DEFAULT 0 CHECK(balance_due >= 0),
    date TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    date TEXT NOT NULL,
    items TEXT NOT NULL,
    subtotal_amount REAL NOT NULL DEFAULT 0,
    tax_percent REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
    balance REAL NOT NULL DEFAULT 0 CHECK(balance >= 0),
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    type TEXT NOT NULL CHECK(type IN ('invoice', 'proforma', 'quote')),
    status TEXT NOT NULL DEFAULT 'draft',
    last_payment_by INTEGER,
    last_payment_at TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL
  )`);
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_company_number ON invoices(company_id, invoice_number)');

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    assigned_companies TEXT NOT NULL DEFAULT '[]',
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS clock_in (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    photo_path TEXT NOT NULL,
    notified INTEGER NOT NULL DEFAULT 0
  )`);

  await run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL UNIQUE,
    default_tax_rate REAL NOT NULL DEFAULT 0,
    terms_conditions TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS user_row_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    access_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_row_access_unique ON user_row_access(user_id, table_name, row_id, access_type)');

  await run(`CREATE TABLE IF NOT EXISTS stock_movement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    change_qty INTEGER NOT NULL,
    movement_type TEXT NOT NULL,
    reason TEXT DEFAULT '',
    ref_type TEXT DEFAULT '',
    ref_id INTEGER,
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS invoice_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_date TEXT NOT NULL,
    recorded_by INTEGER,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    added_by INTEGER,
    created_at TEXT NOT NULL,
    note TEXT DEFAULT ''
  )`);

  await run(`CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    sale_id INTEGER,
    invoice_id INTEGER,
    receipt_number TEXT NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    total_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_at TEXT NOT NULL
  )`);
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_number_company ON receipts(company_id, receipt_number)');

  await run(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    user_id INTEGER,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    text_body TEXT NOT NULL DEFAULT '',
    html_body TEXT NOT NULL DEFAULT '',
    attachments TEXT NOT NULL DEFAULT '[]',
    purpose TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    sent_at TEXT
  )`);
  await run('CREATE INDEX IF NOT EXISTS idx_email_queue_company_status ON email_queue(company_id, status, created_at)');

  await ensureCol('products', 'company_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('products', 'category_id', 'INTEGER');
  await ensureCol('products', 'supplier_id', 'INTEGER');
  await ensureCol('products', 'min_stock', 'INTEGER NOT NULL DEFAULT 5');
  await ensureCol('products', 'cost_price', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('products', 'batch_no', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('products', 'expiry_date', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('company', 'created_at', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('company', 'primary_color', "TEXT NOT NULL DEFAULT '#f4c214'");
  await ensureCol('company', 'smtp_host', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('company', 'smtp_port', 'INTEGER NOT NULL DEFAULT 587');
  await ensureCol('company', 'smtp_user', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('company', 'smtp_pass', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('company', 'smtp_secure', 'INTEGER NOT NULL DEFAULT 0');
  await ensureCol('sales', 'company_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('sales', 'customer_id', 'INTEGER');
  await ensureCol('sales', 'created_by', 'INTEGER');
  await ensureCol('sales', 'amount_paid', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('sales', 'balance_due', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'company_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('invoices', 'customer_id', 'INTEGER');
  await ensureCol('invoices', 'invoice_number', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('invoices', 'date', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('invoices', 'items', "TEXT NOT NULL DEFAULT '[]'");
  await ensureCol('invoices', 'subtotal_amount', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'tax_percent', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'tax_amount', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'discount_amount', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'total_amount', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'type', "TEXT NOT NULL DEFAULT 'invoice'");
  await ensureCol('invoices', 'status', "TEXT NOT NULL DEFAULT 'draft'");
  await ensureCol('invoices', 'validity_period', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('invoices', 'notes', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('invoices', 'amount_paid', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'balance', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('invoices', 'payment_status', "TEXT NOT NULL DEFAULT 'unpaid'");
  await ensureCol('invoices', 'last_payment_by', 'INTEGER');
  await ensureCol('invoices', 'last_payment_at', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('invoices', 'created_by', 'INTEGER');
  await ensureCol('invoices', 'created_at', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('categories', 'company_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('suppliers', 'company_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('customers', 'company_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('customers', 'notes', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('customers', 'tags', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('users', 'assigned_companies', "TEXT NOT NULL DEFAULT '[]'");
  await ensureCol('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');
  await ensureCol('users', 'role_id', 'INTEGER');
  await ensureCol('users', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('users', 'profile_image_path', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('settings', 'company_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureCol('settings', 'default_tax_rate', 'REAL NOT NULL DEFAULT 0');
  await ensureCol('settings', 'terms_conditions', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('settings', 'created_at', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('settings', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('roles', 'permissions', "TEXT NOT NULL DEFAULT '{}'");
  await ensureCol('roles', 'created_at', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('roles', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  await ensureCol('company', 'industry_type', "TEXT NOT NULL DEFAULT 'retail'");

  const companyCount = await get('SELECT COUNT(*) AS c FROM company');
  if (!companyCount || companyCount.c === 0) {
    await run(
      `INSERT INTO company (name, address, phone, email, logo_path, signature_path, bank_name, account_number, payment_methods, created_at)
       VALUES (?, '', '', '', '', '', '', '', '[]', ?)`,
      ['Default Company', new Date().toISOString()]
    );
  }

  await run(`INSERT OR IGNORE INTO categories(company_id, name)
             SELECT 1, TRIM(category) FROM products WHERE category IS NOT NULL AND TRIM(category) <> ''`);

  await run(`UPDATE products SET category_id = (
               SELECT c.id FROM categories c
               WHERE c.company_id = products.company_id AND c.name = products.category LIMIT 1
             )
             WHERE category_id IS NULL AND category IS NOT NULL AND TRIM(category) <> ''`);

  await run('UPDATE products SET min_stock = 5 WHERE min_stock IS NULL OR min_stock < 0');
  await run('UPDATE products SET cost_price = 0 WHERE cost_price IS NULL OR cost_price < 0');
  await run("UPDATE products SET batch_no = '' WHERE batch_no IS NULL");
  await run("UPDATE products SET expiry_date = '' WHERE expiry_date IS NULL");
  await run("UPDATE company SET created_at = ? WHERE created_at IS NULL OR TRIM(created_at) = ''", [new Date().toISOString()]);
  await run("UPDATE company SET primary_color = '#f4c214' WHERE primary_color IS NULL OR TRIM(primary_color) = ''");
  await run("UPDATE company SET smtp_host = '' WHERE smtp_host IS NULL");
  await run("UPDATE company SET smtp_port = 587 WHERE smtp_port IS NULL OR smtp_port <= 0");
  await run("UPDATE company SET smtp_user = '' WHERE smtp_user IS NULL");
  await run("UPDATE company SET smtp_pass = '' WHERE smtp_pass IS NULL");
  await run("UPDATE company SET smtp_secure = 0 WHERE smtp_secure IS NULL");
  await run("UPDATE invoices SET created_at = COALESCE(NULLIF(TRIM(created_at), ''), date) WHERE created_at IS NULL OR TRIM(created_at) = ''");
  await run("UPDATE invoices SET date = COALESCE(NULLIF(TRIM(date), ''), created_at) WHERE date IS NULL OR TRIM(date) = ''");
  await run("UPDATE invoices SET items = '[]' WHERE items IS NULL OR TRIM(items) = ''");
  await run("UPDATE invoices SET validity_period = '' WHERE validity_period IS NULL");
  await run("UPDATE invoices SET amount_paid = 0 WHERE amount_paid IS NULL OR amount_paid < 0");
  await run("UPDATE invoices SET balance = COALESCE(total_amount, 0) WHERE balance IS NULL OR balance < 0");
  await run("UPDATE invoices SET payment_status = 'unpaid' WHERE payment_status IS NULL OR TRIM(payment_status) = ''");
  await run("UPDATE invoices SET last_payment_at = '' WHERE last_payment_at IS NULL");
  await run("UPDATE sales SET amount_paid = COALESCE(amount_paid, 0)");
  await run("UPDATE sales SET balance_due = COALESCE(balance_due, 0)");
  await run("UPDATE invoices SET notes = '' WHERE notes IS NULL");
  await run("UPDATE customers SET notes = '' WHERE notes IS NULL");
  await run("UPDATE customers SET tags = '' WHERE tags IS NULL");
  await run("UPDATE company SET industry_type = 'retail' WHERE industry_type IS NULL OR TRIM(industry_type) = ''");

  // Backfill canonical payment history from legacy invoice_payments where needed.
  await run(
    `INSERT INTO payment_history (company_id, invoice_id, amount, added_by, created_at, note)
     SELECT ip.company_id, ip.invoice_id, ip.amount, ip.recorded_by, COALESCE(NULLIF(ip.created_at, ''), ip.payment_date), COALESCE(ip.note, '')
     FROM invoice_payments ip
     WHERE NOT EXISTS (
       SELECT 1
       FROM payment_history ph
       WHERE ph.company_id = ip.company_id
         AND ph.invoice_id = ip.invoice_id
         AND ABS(ph.amount - ip.amount) < 0.0001
         AND COALESCE(ph.created_at, '') = COALESCE(NULLIF(ip.created_at, ''), ip.payment_date)
     )`
  );

  // Keep invoice payment fields synced for existing records.
  await run(
    `UPDATE invoices
     SET amount_paid = COALESCE((
       SELECT ROUND(SUM(ph.amount), 2)
       FROM payment_history ph
       WHERE ph.company_id = invoices.company_id AND ph.invoice_id = invoices.id
     ), 0)`
  );
  await run(
    `UPDATE invoices
     SET balance = ROUND(CASE
       WHEN COALESCE(total_amount, 0) - COALESCE(amount_paid, 0) < 0 THEN 0
       ELSE COALESCE(total_amount, 0) - COALESCE(amount_paid, 0)
     END, 2)`
  );
  await run(
    `UPDATE invoices
     SET payment_status = CASE
       WHEN COALESCE(amount_paid, 0) <= 0 THEN 'unpaid'
       WHEN COALESCE(amount_paid, 0) + 0.0001 < COALESCE(total_amount, 0) THEN 'partial'
       ELSE 'paid'
     END`
  );
  await run(
    `UPDATE invoices
     SET last_payment_at = COALESCE((
       SELECT ph.created_at
       FROM payment_history ph
       WHERE ph.company_id = invoices.company_id AND ph.invoice_id = invoices.id
       ORDER BY ph.created_at DESC, ph.id DESC
       LIMIT 1
     ), COALESCE(last_payment_at, ''))`
  );
  await run(
    `UPDATE invoices
     SET last_payment_by = (
       SELECT ph.added_by
       FROM payment_history ph
       WHERE ph.company_id = invoices.company_id AND ph.invoice_id = invoices.id
       ORDER BY ph.created_at DESC, ph.id DESC
       LIMIT 1
     )
     WHERE EXISTS (
       SELECT 1
       FROM payment_history ph
       WHERE ph.company_id = invoices.company_id AND ph.invoice_id = invoices.id
     )`
  );

  const userCount = await get('SELECT COUNT(*) AS c FROM users');
  if (!userCount || userCount.c === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword('admin123', salt);
    const firstCompany = await get('SELECT id FROM company ORDER BY id ASC LIMIT 1');
    await run(
      `INSERT INTO users (username, password_hash, password_salt, assigned_companies, is_admin, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      ['admin', hash, salt, JSON.stringify([firstCompany?.id || 1]), new Date().toISOString()]
    );
  }
  // Ensure the built-in admin account remains usable.
  await run("UPDATE users SET is_admin = 1, is_active = 1 WHERE LOWER(username) = 'admin'");

  const firstCompany = await get('SELECT id FROM company ORDER BY id ASC LIMIT 1');
  if (firstCompany?.id) {
    await run(
      `UPDATE users
       SET assigned_companies = ?
       WHERE is_admin = 0
         AND (assigned_companies IS NULL OR TRIM(assigned_companies) = '' OR TRIM(assigned_companies) = '[]')`,
      [JSON.stringify([firstCompany.id])]
    );
  }

  const companies = await all('SELECT id FROM company');
  for (const c of companies) {
    await run(
      `INSERT OR IGNORE INTO settings (company_id, default_tax_rate, terms_conditions, created_at, updated_at)
       VALUES (?, 0, '', ?, ?)`,
      [c.id, new Date().toISOString(), new Date().toISOString()]
    );
  }
  await run("UPDATE settings SET created_at = ? WHERE created_at IS NULL OR TRIM(created_at) = ''", [new Date().toISOString()]);
  await run("UPDATE settings SET updated_at = ? WHERE updated_at IS NULL OR TRIM(updated_at) = ''", [new Date().toISOString()]);
  await run('UPDATE users SET is_active = 1 WHERE is_active IS NULL');
  await run("UPDATE users SET profile_image_path = '' WHERE profile_image_path IS NULL");
  await run("UPDATE roles SET permissions = '{}' WHERE permissions IS NULL OR TRIM(permissions) = ''");
  await run("UPDATE roles SET created_at = ? WHERE created_at IS NULL OR TRIM(created_at) = ''", [new Date().toISOString()]);
  await run("UPDATE roles SET updated_at = ? WHERE updated_at IS NULL OR TRIM(updated_at) = ''", [new Date().toISOString()]);
}

async function initializeDatabase(electronApp) {
  const basePath = electronApp.isPackaged ? electronApp.getPath('userData') : path.join(__dirname, '..');
  ensureDir(basePath);
  databasePath = path.join(basePath, 'inventory.db');
  db = await openDb(databasePath);
  await migrate();
  return databasePath;
}

function normalizeCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    logoPath: row.logo_path || '',
    signaturePath: row.signature_path || '',
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    paymentMethods: parseJsonArray(row.payment_methods),
    primaryColor: isHexColor(row.primary_color) ? String(row.primary_color).trim() : '#f4c214',
    industryType: String(row.industry_type || 'retail'),
    smtpHost: String(row.smtp_host || ''),
    smtpPort: toInt(row.smtp_port, 587),
    smtpUser: String(row.smtp_user || ''),
    smtpSecure: Number(row.smtp_secure || 0) === 1,
    smtpPass: ''
  };
}

const cleanAssigned = (arr) => [...new Set((Array.isArray(arr) ? arr : []).map((x) => toInt(x, -1)).filter((x) => x > 0))];

async function getAllCompanies() {
  const rows = await all('SELECT * FROM company ORDER BY name ASC');
  return rows.map(normalizeCompany);
}

async function getCompanyById(companyId) {
  const id = toInt(companyId, -1);
  if (id <= 0) throw new Error('A valid company ID is required.');
  return normalizeCompany(await get('SELECT * FROM company WHERE id = ?', [id]));
}

async function getCompaniesForUser(user) {
  if (user?.isAdmin) return getAllCompanies();
  const assigned = cleanAssigned(user?.assignedCompanies || []);
  if (assigned.length === 0) return [];
  const placeholders = assigned.map(() => '?').join(', ');
  const rows = await all(`SELECT * FROM company WHERE id IN (${placeholders}) ORDER BY name ASC`, assigned);
  return rows.map(normalizeCompany);
}

function mapCompanyInput(payload, fallback = {}) {
  const name = String(payload.name ?? fallback.name ?? '').trim();
  const address = String(payload.address ?? fallback.address ?? '').trim();
  const phone = String(payload.phone ?? fallback.phone ?? '').trim();
  const email = String(payload.email ?? fallback.email ?? '').trim();
  const logoPath = String(payload.logoPath ?? fallback.logoPath ?? '').trim();
  const signaturePath = String(payload.signaturePath ?? fallback.signaturePath ?? '').trim();
  const bankName = String(payload.bankName ?? fallback.bankName ?? '').trim();
  const accountNumber = String(payload.accountNumber ?? fallback.accountNumber ?? '').trim();
  const primaryColorRaw = String(payload.primaryColor ?? fallback.primaryColor ?? '#f4c214').trim();
  const primaryColor = isHexColor(primaryColorRaw) ? primaryColorRaw : '#f4c214';
  const industryType = String(payload.industryType ?? fallback.industryType ?? 'retail').trim().toLowerCase() || 'retail';
  const smtpHost = String(payload.smtpHost ?? fallback.smtpHost ?? '').trim();
  const smtpPortRaw = payload.smtpPort ?? fallback.smtpPort ?? 587;
  const smtpPort = Number(smtpPortRaw);
  const smtpUser = String(payload.smtpUser ?? fallback.smtpUser ?? '').trim();
  const smtpPass = String(payload.smtpPass ?? fallback.smtpPass ?? '').trim();
  const smtpSecure = Boolean(payload.smtpSecure ?? fallback.smtpSecure ?? false);
  const paymentMethods = normalizePaymentMethods(payload.paymentMethods ?? fallback.paymentMethods ?? []);
  if (!name) throw new Error('Company name is required.');
  if (!isEmail(email)) throw new Error('Please provide a valid company email.');
  if (accountNumber && !/^\d+$/.test(accountNumber)) throw new Error('Account number must contain only digits.');
  if (!Number.isFinite(smtpPort) || smtpPort <= 0 || smtpPort > 65535) throw new Error('SMTP port must be between 1 and 65535.');
  if (smtpUser && !isEmail(smtpUser)) throw new Error('SMTP user must be a valid email address.');
  return { name, address, phone, email, logoPath, signaturePath, bankName, accountNumber, paymentMethods, primaryColor, industryType, smtpHost, smtpPort: Math.round(smtpPort), smtpUser, smtpPass, smtpSecure };
}

function normalizePaymentMethods(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
}

async function createCompany(payload) {
  const input = mapCompanyInput(payload || {});
  const result = await run(
    `INSERT INTO company (name, address, phone, email, logo_path, signature_path, bank_name, account_number, payment_methods, primary_color, industry_type, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.address,
      input.phone,
      input.email,
      input.logoPath,
      input.signaturePath,
      input.bankName,
      input.accountNumber,
      JSON.stringify(input.paymentMethods),
      input.primaryColor,
      input.industryType,
      input.smtpHost,
      input.smtpPort,
      input.smtpUser,
      input.smtpPass,
      input.smtpSecure ? 1 : 0,
      new Date().toISOString()
    ]
  );
  const stamp = new Date().toISOString();
  await run(
    `INSERT OR IGNORE INTO settings (company_id, default_tax_rate, terms_conditions, created_at, updated_at)
     VALUES (?, 0, '', ?, ?)`,
    [result.id, stamp, stamp]
  );
  return getCompanyById(result.id);
}

async function updateCompany(companyId, payload) {
  const id = toInt(companyId, -1);
  if (id <= 0) throw new Error('A valid company ID is required.');
  const existingRow = await get('SELECT * FROM company WHERE id = ?', [id]);
  if (!existingRow) throw new Error('Company not found.');
  const input = mapCompanyInput(payload || {}, {
    name: existingRow.name,
    address: existingRow.address,
    phone: existingRow.phone,
    email: existingRow.email,
    logoPath: existingRow.logo_path,
    signaturePath: existingRow.signature_path,
    bankName: existingRow.bank_name,
    accountNumber: existingRow.account_number,
    paymentMethods: parseJsonArray(existingRow.payment_methods),
    primaryColor: existingRow.primary_color,
    industryType: existingRow.industry_type,
    smtpHost: existingRow.smtp_host,
    smtpPort: existingRow.smtp_port,
    smtpUser: existingRow.smtp_user,
    smtpPass: existingRow.smtp_pass,
    smtpSecure: Number(existingRow.smtp_secure || 0) === 1
  });
  await run(
    `UPDATE company
     SET name = ?, address = ?, phone = ?, email = ?, logo_path = ?, signature_path = ?, bank_name = ?, account_number = ?, payment_methods = ?, primary_color = ?, industry_type = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?
     WHERE id = ?`,
    [
      input.name,
      input.address,
      input.phone,
      input.email,
      input.logoPath,
      input.signaturePath,
      input.bankName,
      input.accountNumber,
      JSON.stringify(input.paymentMethods),
      input.primaryColor,
      input.industryType,
      input.smtpHost,
      input.smtpPort,
      input.smtpUser,
      input.smtpPass,
      input.smtpSecure ? 1 : 0,
      id
    ]
  );
  return getCompanyById(id);
}

async function getCompanyEmailSetup(companyId) {
  const id = toInt(companyId, -1);
  if (id <= 0) throw new Error('A valid company ID is required.');
  const row = await get(
    `SELECT id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure
     FROM company
     WHERE id = ?`,
    [id]
  );
  if (!row) throw new Error('Company not found.');
  return {
    companyId: row.id,
    smtpHost: String(row.smtp_host || ''),
    smtpPort: toInt(row.smtp_port, 587),
    smtpUser: String(row.smtp_user || ''),
    smtpPass: '',
    smtpSecure: Number(row.smtp_secure || 0) === 1,
    hasPassword: Boolean(String(row.smtp_pass || ''))
  };
}

async function getCompanyEmailConfigRaw(companyId) {
  const id = toInt(companyId, -1);
  if (id <= 0) throw new Error('A valid company ID is required.');
  const row = await get(
    `SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure
     FROM company
     WHERE id = ?`,
    [id]
  );
  if (!row) throw new Error('Company not found.');
  return {
    smtpHost: String(row.smtp_host || ''),
    smtpPort: toInt(row.smtp_port, 587),
    smtpUser: String(row.smtp_user || ''),
    smtpPass: String(row.smtp_pass || ''),
    smtpSecure: Number(row.smtp_secure || 0) === 1
  };
}

async function updateCompanyEmailSetup(companyId, payload = {}) {
  const id = toInt(companyId, -1);
  if (id <= 0) throw new Error('A valid company ID is required.');
  const row = await get('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure FROM company WHERE id = ?', [id]);
  if (!row) throw new Error('Company not found.');
  const smtpHost = String(payload.smtpHost ?? row.smtp_host ?? '').trim();
  const smtpPortValue = Number(payload.smtpPort ?? row.smtp_port ?? 587);
  const smtpUser = String(payload.smtpUser ?? row.smtp_user ?? '').trim();
  const smtpPassInput = String(payload.smtpPass ?? '').trim();
  const smtpPass = smtpPassInput || String(row.smtp_pass || '');
  const smtpSecure = Boolean(payload.smtpSecure ?? (Number(row.smtp_secure || 0) === 1));
  if (!smtpHost) throw new Error('SMTP host is required.');
  if (!Number.isFinite(smtpPortValue) || smtpPortValue <= 0 || smtpPortValue > 65535) throw new Error('SMTP port must be between 1 and 65535.');
  if (!smtpUser || !isEmail(smtpUser)) throw new Error('SMTP email address is required.');
  if (!smtpPass) throw new Error('SMTP password is required.');
  await run(
    `UPDATE company
     SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?
     WHERE id = ?`,
    [smtpHost, Math.round(smtpPortValue), smtpUser, smtpPass, smtpSecure ? 1 : 0, id]
  );
  return getCompanyEmailSetup(id);
}

async function enqueueEmail(payload = {}) {
  const companyId = toInt(payload.companyId, -1);
  const recipient = String(payload.recipient || '').trim();
  const subject = String(payload.subject || '').trim();
  const textBody = String(payload.textBody || '').trim();
  const htmlBody = String(payload.htmlBody || '').trim();
  const purpose = String(payload.purpose || 'general').trim().toLowerCase() || 'general';
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  if (companyId <= 0) throw new Error('Company ID is required.');
  if (!isEmail(recipient)) throw new Error('A valid recipient email is required.');
  if (!subject) throw new Error('Email subject is required.');
  const result = await run(
    `INSERT INTO email_queue (company_id, recipient, subject, text_body, html_body, attachments, purpose, status, attempts, last_error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, '', ?)`,
    [companyId, recipient, subject, textBody, htmlBody, JSON.stringify(attachments), purpose, new Date().toISOString()]
  );
  return result.id;
}

async function getPendingEmailQueue(limit = 20) {
  const lim = Math.max(1, Math.min(100, toInt(limit, 20)));
  return all(
    `SELECT id, company_id AS companyId, recipient, subject, text_body AS textBody, html_body AS htmlBody,
            attachments, purpose, status, attempts, last_error AS lastError, created_at AS createdAt, sent_at AS sentAt
     FROM email_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT ?`,
    [lim]
  );
}

async function markEmailQueuedSent(id) {
  const queueId = toInt(id, -1);
  if (queueId <= 0) return;
  await run(
    `UPDATE email_queue
     SET status = 'sent', sent_at = ?, last_error = ''
     WHERE id = ?`,
    [new Date().toISOString(), queueId]
  );
}

async function markEmailQueuedFailed(id, message = '') {
  const queueId = toInt(id, -1);
  if (queueId <= 0) return;
  const msg = String(message || '').slice(0, 400);
  await run(
    `UPDATE email_queue
     SET attempts = attempts + 1, last_error = ?
     WHERE id = ?`,
    [msg, queueId]
  );
}

async function deleteCompany(companyId) {
  const id = toInt(companyId, -1);
  if (id <= 0) throw new Error('A valid company ID is required.');
  const total = await get('SELECT COUNT(*) AS c FROM company');
  if ((total?.c || 0) <= 1) throw new Error('At least one company must exist.');
  await run('DELETE FROM company WHERE id = ?', [id]);
}

async function createCategory(payload, companyId) {
  const cid = toInt(companyId, -1);
  const name = String(payload.name || '').trim();
  if (cid <= 0 || !name) throw new Error('Category name is required.');
  const res = await run('INSERT INTO categories (company_id, name) VALUES (?, ?)', [cid, name]);
  return get('SELECT id, name FROM categories WHERE id = ? AND company_id = ?', [res.id, cid]);
}

function getCategories(companyId) {
  const cid = toInt(companyId, -1);
  return all('SELECT id, name FROM categories WHERE company_id = ? ORDER BY name ASC', [cid]);
}

async function updateCategory(payload, companyId) {
  const cid = toInt(companyId, -1);
  const id = toInt(payload.id, -1);
  const name = String(payload.name || '').trim();
  if (cid <= 0 || id <= 0 || !name) throw new Error('Category update data is invalid.');
  await run('UPDATE categories SET name = ? WHERE id = ? AND company_id = ?', [name, id, cid]);
  return get('SELECT id, name FROM categories WHERE id = ? AND company_id = ?', [id, cid]);
}

const deleteCategory = (id, companyId) => run('DELETE FROM categories WHERE id = ? AND company_id = ?', [toInt(id, -1), toInt(companyId, -1)]);

async function createSupplier(payload, companyId) {
  const cid = toInt(companyId, -1);
  const name = String(payload.name || '').trim();
  const contactInfo = String(payload.contactInfo || '').trim();
  if (cid <= 0 || !name) throw new Error('Supplier name is required.');
  const res = await run('INSERT INTO suppliers (company_id, name, contact_info) VALUES (?, ?, ?)', [cid, name, contactInfo]);
  return get('SELECT id, name, contact_info AS contactInfo FROM suppliers WHERE id = ? AND company_id = ?', [res.id, cid]);
}

function getSuppliers(companyId) {
  const cid = toInt(companyId, -1);
  return all('SELECT id, name, contact_info AS contactInfo FROM suppliers WHERE company_id = ? ORDER BY name ASC', [cid]);
}

async function updateSupplier(payload, companyId) {
  const cid = toInt(companyId, -1);
  const id = toInt(payload.id, -1);
  const name = String(payload.name || '').trim();
  const contactInfo = String(payload.contactInfo || '').trim();
  if (cid <= 0 || id <= 0 || !name) throw new Error('Supplier update data is invalid.');
  await run('UPDATE suppliers SET name = ?, contact_info = ? WHERE id = ? AND company_id = ?', [name, contactInfo, id, cid]);
  return get('SELECT id, name, contact_info AS contactInfo FROM suppliers WHERE id = ? AND company_id = ?', [id, cid]);
}

const deleteSupplier = (id, companyId) => run('DELETE FROM suppliers WHERE id = ? AND company_id = ?', [toInt(id, -1), toInt(companyId, -1)]);

async function createCustomer(payload, companyId) {
  const cid = toInt(companyId, -1);
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();
  const email = String(payload.email || '').trim();
  const notes = String(payload.notes || '').trim();
  const tags = String(payload.tags || '').trim();
  if (cid <= 0 || !name) throw new Error('Customer name is required.');
  if (!isEmail(email)) throw new Error('Please provide a valid customer email.');
  const res = await run('INSERT INTO customers (company_id, name, phone, email, notes, tags) VALUES (?, ?, ?, ?, ?, ?)', [cid, name, phone, email, notes, tags]);
  return get('SELECT id, name, phone, email, notes, tags FROM customers WHERE id = ? AND company_id = ?', [res.id, cid]);
}

function getCustomers(companyId) {
  const cid = toInt(companyId, -1);
  return all(
    `SELECT c.id, c.name, c.phone, c.email, c.notes, c.tags,
            COALESCE(SUM(COALESCE(s.balance_due, 0)), 0) AS outstandingBalance
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id AND s.company_id = c.company_id
     WHERE c.company_id = ?
     GROUP BY c.id, c.name, c.phone, c.email, c.notes, c.tags
     ORDER BY c.name ASC`,
    [cid]
  );
}

async function updateCustomer(payload, companyId) {
  const cid = toInt(companyId, -1);
  const id = toInt(payload.id, -1);
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();
  const email = String(payload.email || '').trim();
  const notes = String(payload.notes || '').trim();
  const tags = String(payload.tags || '').trim();
  if (cid <= 0 || id <= 0 || !name) throw new Error('Customer update data is invalid.');
  if (!isEmail(email)) throw new Error('Please provide a valid customer email.');
  await run('UPDATE customers SET name = ?, phone = ?, email = ?, notes = ?, tags = ? WHERE id = ? AND company_id = ?', [name, phone, email, notes, tags, id, cid]);
  return get('SELECT id, name, phone, email, notes, tags FROM customers WHERE id = ? AND company_id = ?', [id, cid]);
}

const deleteCustomer = (id, companyId) => run('DELETE FROM customers WHERE id = ? AND company_id = ?', [toInt(id, -1), toInt(companyId, -1)]);

async function getProductById(id, companyId) {
  const pid = toInt(id, -1);
  const cid = toInt(companyId, -1);
  return get(
    `SELECT p.id, p.name,
            COALESCE(c.name, p.category, 'Uncategorized') AS category,
            p.category_id AS categoryId,
            p.supplier_id AS supplierId,
            COALESCE(s.name, '') AS supplierName,
            p.price, p.cost_price AS costPrice, p.batch_no AS batchNo, p.expiry_date AS expiryDate,
            p.quantity, COALESCE(p.min_stock, 5) AS minStock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.id = ? AND p.company_id = ?`,
    [pid, cid]
  );
}

async function createProduct(payload, companyId) {
  const cid = toInt(companyId, -1);
  const name = String(payload.name || '').trim();
  const categoryId = toInt(payload.categoryId, null);
  const supplierId = toInt(payload.supplierId, null);
  const price = Number(payload.price);
  const costPrice = Number(payload.costPrice ?? 0);
  const batchNo = String(payload.batchNo || '').trim();
  const expiryDate = String(payload.expiryDate || '').trim();
  const quantity = toInt(payload.quantity, -1);
  const minStock = toInt(payload.minStock, -1);
  if (cid <= 0 || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(costPrice) || costPrice < 0 || quantity < 0 || minStock < 0) {
    throw new Error('Product data is invalid.');
  }
  const category = categoryId ? await get('SELECT id, name FROM categories WHERE id = ? AND company_id = ?', [categoryId, cid]) : null;
  const supplier = supplierId ? await get('SELECT id FROM suppliers WHERE id = ? AND company_id = ?', [supplierId, cid]) : null;
  if (categoryId && !category) throw new Error('Selected category not found in active company.');
  if (supplierId && !supplier) throw new Error('Selected supplier not found in active company.');
  const categoryName = category?.name || String(payload.category || 'Uncategorized').trim() || 'Uncategorized';
  const result = await run(
    `INSERT INTO products (company_id, name, category, category_id, supplier_id, price, cost_price, batch_no, expiry_date, quantity, min_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cid, name, categoryName, category ? category.id : null, supplier ? supplierId : null, price, costPrice, batchNo, expiryDate, quantity, minStock]
  );
  if (quantity > 0) {
    await addStockMovement({
      companyId: cid,
      productId: result.id,
      userId: toInt(payload.userId, null),
      changeQty: quantity,
      movementType: 'opening',
      reason: 'Opening stock',
      refType: 'product',
      refId: result.id
    });
  }
  await logAudit({
    companyId: cid,
    userId: toInt(payload.userId, null),
    action: 'create',
    module: 'products',
    entityId: result.id,
    metadata: { name, quantity, price }
  });
  return getProductById(result.id, cid);
}

function getProducts(companyId) {
  const cid = toInt(companyId, -1);
  return all(
    `SELECT p.id, p.name,
            COALESCE(c.name, p.category, 'Uncategorized') AS category,
            p.category_id AS categoryId,
            p.supplier_id AS supplierId,
            COALESCE(s.name, '') AS supplierName,
            p.price, p.cost_price AS costPrice, p.batch_no AS batchNo, p.expiry_date AS expiryDate,
            p.quantity, COALESCE(p.min_stock, 5) AS minStock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.company_id = ?
     ORDER BY p.id DESC`,
    [cid]
  );
}

async function updateProduct(payload, companyId) {
  const cid = toInt(companyId, -1);
  const id = toInt(payload.id, -1);
  const name = String(payload.name || '').trim();
  const categoryId = toInt(payload.categoryId, null);
  const supplierId = toInt(payload.supplierId, null);
  const price = Number(payload.price);
  const costPrice = Number(payload.costPrice ?? 0);
  const batchNo = String(payload.batchNo || '').trim();
  const expiryDate = String(payload.expiryDate || '').trim();
  const quantity = toInt(payload.quantity, -1);
  const minStock = toInt(payload.minStock, -1);
  if (cid <= 0 || id <= 0 || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(costPrice) || costPrice < 0 || quantity < 0 || minStock < 0) {
    throw new Error('Product update data is invalid.');
  }
  const category = categoryId ? await get('SELECT id, name FROM categories WHERE id = ? AND company_id = ?', [categoryId, cid]) : null;
  const supplier = supplierId ? await get('SELECT id FROM suppliers WHERE id = ? AND company_id = ?', [supplierId, cid]) : null;
  const before = await get('SELECT quantity FROM products WHERE id = ? AND company_id = ?', [id, cid]);
  if (categoryId && !category) throw new Error('Selected category not found in active company.');
  if (supplierId && !supplier) throw new Error('Selected supplier not found in active company.');
  const categoryName = category?.name || String(payload.category || 'Uncategorized').trim() || 'Uncategorized';
  await run(
    `UPDATE products
     SET name = ?, category = ?, category_id = ?, supplier_id = ?, price = ?, quantity = ?, min_stock = ?
     WHERE id = ? AND company_id = ?`,
    [name, categoryName, category ? category.id : null, supplier ? supplierId : null, price, quantity, minStock, id, cid]
  );
  await run('UPDATE products SET cost_price = ?, batch_no = ?, expiry_date = ? WHERE id = ? AND company_id = ?', [costPrice, batchNo, expiryDate, id, cid]);
  const qtyDiff = toInt(quantity, 0) - toInt(before?.quantity, 0);
  if (qtyDiff !== 0) {
    await addStockMovement({
      companyId: cid,
      productId: id,
      userId: toInt(payload.userId, null),
      changeQty: qtyDiff,
      movementType: qtyDiff > 0 ? 'increase' : 'decrease',
      reason: 'Manual product update',
      refType: 'product',
      refId: id
    });
  }
  await logAudit({
    companyId: cid,
    userId: toInt(payload.userId, null),
    action: 'update',
    module: 'products',
    entityId: id,
    metadata: { quantity, price }
  });
  return getProductById(id, cid);
}

const deleteProduct = (id, companyId) => run('DELETE FROM products WHERE id = ? AND company_id = ?', [toInt(id, -1), toInt(companyId, -1)]);

async function recordSale(payload, companyId) {
  const cid = toInt(companyId, -1);
  const productId = toInt(payload.productId, -1);
  const customerId = toInt(payload.customerId, null);
  const qty = toInt(payload.quantity, -1);
  if (cid <= 0 || productId <= 0 || qty <= 0) throw new Error('Sale data is invalid.');
  await run('BEGIN TRANSACTION');
  try {
    const product = await get('SELECT id, price, quantity FROM products WHERE id = ? AND company_id = ?', [productId, cid]);
    if (!product) throw new Error('Product not found in active company.');
    if (qty > product.quantity) throw new Error('Insufficient stock for this sale.');
    let customerValue = null;
    if (customerId) {
      const customer = await get('SELECT id FROM customers WHERE id = ? AND company_id = ?', [customerId, cid]);
      if (!customer) throw new Error('Customer not found in active company.');
      customerValue = customerId;
    }
    const totalPrice = Number((product.price * qty).toFixed(2));
    const amountPaidRaw = Number(payload.amountPaid);
    const amountPaid = Number.isFinite(amountPaidRaw) ? Number(amountPaidRaw.toFixed(2)) : totalPrice;
    if (amountPaid < 0) throw new Error('Amount paid cannot be negative.');
    if (amountPaid > totalPrice) throw new Error('Amount paid cannot exceed total sale amount.');
    const balanceDue = Number((totalPrice - amountPaid).toFixed(2));
    const stamp = new Date().toISOString();
    await run('UPDATE products SET quantity = quantity - ? WHERE id = ? AND company_id = ?', [qty, productId, cid]);
    const res = await run(
      'INSERT INTO sales (company_id, product_id, customer_id, quantity, total_price, amount_paid, balance_due, date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cid, productId, customerValue, qty, totalPrice, amountPaid, balanceDue, stamp, toInt(payload?.createdBy, null)]
    );
    await addStockMovement({
      companyId: cid,
      productId,
      userId: toInt(payload?.createdBy, null),
      changeQty: -qty,
      movementType: 'sale',
      reason: 'Sale recorded',
      refType: 'sale',
      refId: res.id
    });
    const receiptNumber = `RCT-${new Date().getFullYear()}-${String(res.id).padStart(6, '0')}`;
    await run(
      'INSERT INTO receipts (company_id, sale_id, invoice_id, receipt_number, items, total_amount, payment_method, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
      [cid, res.id, receiptNumber, JSON.stringify([{ productId, quantity: qty, unitPrice: product.price, lineTotal: totalPrice }]), totalPrice, String(payload?.paymentMethod || 'cash'), stamp]
    );
    await logAudit({
      companyId: cid,
      userId: toInt(payload?.createdBy, null),
      action: 'create',
      module: 'sales',
      entityId: res.id,
      metadata: { productId, quantity: qty, totalPrice, amountPaid, balanceDue, paymentMethod: String(payload?.paymentMethod || 'cash') }
    });
    await run('COMMIT');
    return { id: res.id, productId, customerId: customerValue, quantity: qty, totalPrice, amountPaid, balanceDue, date: stamp, receiptNumber };
  } catch (e) {
    await run('ROLLBACK');
    throw e;
  }
}

async function getDashboardStats(companyId, userId = null) {
  const cid = toInt(companyId, -1);
  const totalProductsRow = await get('SELECT COUNT(*) AS totalProducts FROM products WHERE company_id = ?', [cid]);
  const lowStock = await all(
    `SELECT id, name, quantity, COALESCE(min_stock, 5) AS minStock
     FROM products
     WHERE company_id = ? AND quantity <= COALESCE(min_stock, 5)
     ORDER BY quantity ASC, name ASC`,
    [cid]
  );
  const salesTotals = await get('SELECT COALESCE(SUM(total_price), 0) AS totalSales, COUNT(*) AS totalTransactions FROM sales WHERE company_id = ?', [cid]);
  const recentClockIns = await getRecentClockIns(10, cid, userId);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(monthStart.getDate() - 29); monthStart.setHours(0, 0, 0, 0);
  const [daily, weekly, monthly] = await Promise.all([
    get('SELECT COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS totalSales FROM sales WHERE company_id = ? AND date >= ?', [cid, todayStart.toISOString()]),
    get('SELECT COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS totalSales FROM sales WHERE company_id = ? AND date >= ?', [cid, weekStart.toISOString()]),
    get('SELECT COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS totalSales FROM sales WHERE company_id = ? AND date >= ?', [cid, monthStart.toISOString()])
  ]);
  const topSellingProducts = await all(
    `SELECT p.id, p.name, COALESCE(SUM(s.quantity), 0) AS unitsSold, COALESCE(SUM(s.total_price), 0) AS revenue
     FROM sales s
     INNER JOIN products p ON p.id = s.product_id
     WHERE s.company_id = ?
     GROUP BY p.id, p.name
     ORDER BY unitsSold DESC, revenue DESC
     LIMIT 5`,
    [cid]
  );
  const debtors = await all(
    `SELECT i.id AS invoiceId,
            i.invoice_number AS invoiceNumber,
            c.name AS customerName,
            i.total_amount AS totalAmount,
            i.amount_paid AS amountPaid,
            i.balance AS balance,
            i.payment_status AS paymentStatus,
            i.last_payment_at AS lastPaymentAt
     FROM invoices i
     INNER JOIN customers c ON c.id = i.customer_id
     WHERE i.company_id = ? AND COALESCE(i.payment_status, 'unpaid') IN ('partial', 'unpaid')
     ORDER BY i.balance DESC, i.date DESC
     LIMIT 20`,
    [cid]
  );
  const staffClockInSummary = await all(
    `SELECT u.username, COUNT(ci.id) AS clockIns
     FROM clock_in ci
     INNER JOIN users u ON u.id = ci.user_id
     WHERE ci.company_id = ?
     GROUP BY u.id, u.username
     ORDER BY clockIns DESC
     LIMIT 10`,
    [cid]
  );
  const recentActivities = await getRecentActivities(cid, 20);
  return {
    totalProducts: totalProductsRow?.totalProducts || 0,
    lowStock,
    totalSales: Number(salesTotals?.totalSales || 0),
    totalTransactions: salesTotals?.totalTransactions || 0,
    recentClockIns,
    periods: {
      daily: { totalSales: Number(daily?.totalSales || 0), revenue: Number(daily?.revenue || 0) },
      weekly: { totalSales: Number(weekly?.totalSales || 0), revenue: Number(weekly?.revenue || 0) },
      monthly: { totalSales: Number(monthly?.totalSales || 0), revenue: Number(monthly?.revenue || 0) }
    },
    topSellingProducts,
    debtors: debtors.map((d) => ({
      invoiceId: d.invoiceId,
      invoiceNumber: d.invoiceNumber,
      customerName: d.customerName || '',
      totalAmount: Number(d.totalAmount || 0),
      amountPaid: Number(d.amountPaid || 0),
      balance: Number(d.balance || 0),
      paymentStatus: normalizePaymentStatus(d.paymentStatus),
      lastPaymentAt: d.lastPaymentAt || ''
    })),
    staffClockInSummary,
    recentActivities
  };
}

function buildReportRange(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'daily') start.setHours(0, 0, 0, 0);
  else if (period === 'weekly') { start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); }
  else { start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0); }
  return { startIso: start.toISOString(), endIso: now.toISOString() };
}

async function getSalesReport(period = 'daily', companyId, paymentStatus = 'all') {
  const cid = toInt(companyId, -1);
  const range = buildReportRange(period);
  const summary = await get(
    `SELECT COUNT(*) AS totalTransactions, COALESCE(SUM(quantity), 0) AS totalItemsSold, COALESCE(SUM(total_price), 0) AS totalRevenue
     FROM sales WHERE company_id = ? AND date BETWEEN ? AND ?`,
    [cid, range.startIso, range.endIso]
  );
  const topProducts = await all(
    `SELECT p.id, p.name, COALESCE(SUM(s.quantity), 0) AS unitsSold, COALESCE(SUM(s.total_price), 0) AS revenue
     FROM sales s
     INNER JOIN products p ON p.id = s.product_id
     WHERE s.company_id = ? AND s.date BETWEEN ? AND ?
     GROUP BY p.id, p.name
     ORDER BY unitsSold DESC, revenue DESC
     LIMIT 10`,
    [cid, range.startIso, range.endIso]
  );
  const customerSales = await all(
    `SELECT COALESCE(c.name, 'Walk-in Customer') AS customerName, COUNT(s.id) AS transactions, COALESCE(SUM(s.total_price), 0) AS revenue
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.company_id = ? AND s.date BETWEEN ? AND ?
     GROUP BY COALESCE(c.name, 'Walk-in Customer')
     ORDER BY revenue DESC`,
    [cid, range.startIso, range.endIso]
  );
  const paymentFilter = String(paymentStatus || 'all').trim().toLowerCase();
  const filterAllowed = new Set(['all', 'paid', 'partial', 'unpaid']);
  const normalizedFilter = filterAllowed.has(paymentFilter) ? paymentFilter : 'all';
  const paymentRows = await all(
    `SELECT i.id AS invoiceId,
            i.invoice_number AS invoiceNumber,
            COALESCE(c.name, 'Walk-in Customer') AS customerName,
            i.total_amount AS totalAmount,
            i.amount_paid AS amountPaid,
            i.balance AS balance,
            i.payment_status AS paymentStatus,
            i.created_by AS createdBy,
            uc.username AS initiatedBy,
            i.last_payment_by AS lastPaymentBy,
            up.username AS lastPaymentByName,
            i.last_payment_at AS lastPaymentAt
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     LEFT JOIN users uc ON uc.id = i.created_by
     LEFT JOIN users up ON up.id = i.last_payment_by
     WHERE i.company_id = ?
       AND i.date BETWEEN ? AND ?
       AND (? = 'all' OR COALESCE(i.payment_status, 'unpaid') = ?)
     ORDER BY i.date DESC, i.id DESC`,
    [cid, range.startIso, range.endIso, normalizedFilter, normalizedFilter]
  );
  return {
    period,
    paymentFilter: normalizedFilter,
    startDate: range.startIso,
    endDate: range.endIso,
    summary: {
      totalTransactions: summary?.totalTransactions || 0,
      totalItemsSold: summary?.totalItemsSold || 0,
      totalRevenue: Number(summary?.totalRevenue || 0)
    },
    topProducts,
    customerSales,
    invoicePayments: paymentRows.map((row) => ({
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoiceNumber,
      customerName: row.customerName || '',
      totalAmount: Number(row.totalAmount || 0),
      amountPaid: Number(row.amountPaid || 0),
      balance: Number(row.balance || 0),
      paymentStatus: normalizePaymentStatus(row.paymentStatus),
      createdBy: toInt(row.createdBy, null),
      initiatedBy: row.initiatedBy || '',
      lastPaymentBy: toInt(row.lastPaymentBy, null),
      lastPaymentByName: row.lastPaymentByName || '',
      lastPaymentAt: row.lastPaymentAt || ''
    }))
  };
}

async function getInventoryReport(companyId) {
  const cid = toInt(companyId, -1);
  return all(
    `SELECT p.id, p.name, p.quantity, p.price, p.cost_price AS costPrice, COALESCE(p.min_stock, 5) AS minStock,
            (p.price - p.cost_price) AS unitProfit
     FROM products p
     WHERE p.company_id = ?
     ORDER BY p.name ASC`,
    [cid]
  );
}

async function getProfitLossSummary(companyId, period = 'monthly') {
  const cid = toInt(companyId, -1);
  const range = buildReportRange(period === 'daily' ? 'daily' : period === 'weekly' ? 'weekly' : 'monthly');
  const revenueRow = await get('SELECT COALESCE(SUM(total_price), 0) AS revenue FROM sales WHERE company_id = ? AND date BETWEEN ? AND ?', [cid, range.startIso, range.endIso]);
  const cogsRow = await get(
    `SELECT COALESCE(SUM(s.quantity * p.cost_price), 0) AS cogs
     FROM sales s
     INNER JOIN products p ON p.id = s.product_id
     WHERE s.company_id = ? AND s.date BETWEEN ? AND ?`,
    [cid, range.startIso, range.endIso]
  );
  const revenue = Number(revenueRow?.revenue || 0);
  const cogs = Number(cogsRow?.cogs || 0);
  return { period, startDate: range.startIso, endDate: range.endIso, revenue, cogs, grossProfit: Number((revenue - cogs).toFixed(2)) };
}

async function getStaffPerformanceReport(companyId, period = 'monthly') {
  const cid = toInt(companyId, -1);
  const range = buildReportRange(period === 'daily' ? 'daily' : period === 'weekly' ? 'weekly' : 'monthly');
  return all(
    `SELECT u.id AS userId, u.username, COUNT(s.id) AS salesCount, COALESCE(SUM(s.total_price), 0) AS revenue
     FROM sales s
     LEFT JOIN users u ON u.id = s.created_by
     WHERE s.company_id = ? AND s.date BETWEEN ? AND ?
     GROUP BY u.id, u.username
     ORDER BY revenue DESC`,
    [cid, range.startIso, range.endIso]
  );
}

async function getStockMovements(companyId, payload = {}) {
  const cid = toInt(companyId, -1);
  const limit = Math.max(1, Math.min(200, toInt(payload.limit, 50)));
  return all(
    `SELECT sm.id, sm.product_id AS productId, p.name AS productName, sm.user_id AS userId, u.username,
            sm.change_qty AS changeQty, sm.movement_type AS movementType, sm.reason, sm.ref_type AS refType, sm.ref_id AS refId, sm.created_at AS createdAt
     FROM stock_movement sm
     INNER JOIN products p ON p.id = sm.product_id
     LEFT JOIN users u ON u.id = sm.user_id
     WHERE sm.company_id = ?
     ORDER BY sm.created_at DESC
     LIMIT ?`,
    [cid, limit]
  );
}

async function adjustStock(payload, companyId, userId = null) {
  const cid = toInt(companyId, -1);
  const productId = toInt(payload?.productId, -1);
  const delta = toInt(payload?.delta, 0);
  if (cid <= 0 || productId <= 0 || delta === 0) throw new Error('Stock adjustment data is invalid.');
  const product = await get('SELECT id, quantity FROM products WHERE id = ? AND company_id = ?', [productId, cid]);
  if (!product) throw new Error('Product not found.');
  const nextQty = toInt(product.quantity, 0) + delta;
  if (nextQty < 0) throw new Error('Stock cannot go below zero.');
  await run('UPDATE products SET quantity = ? WHERE id = ? AND company_id = ?', [nextQty, productId, cid]);
  await addStockMovement({
    companyId: cid,
    productId,
    userId,
    changeQty: delta,
    movementType: delta > 0 ? 'increase' : 'decrease',
    reason: String(payload?.reason || 'Manual stock adjustment'),
    refType: 'adjustment'
  });
  await logAudit({ companyId: cid, userId, action: 'adjust', module: 'stock', entityId: productId, metadata: { delta, nextQty } });
  return getProductById(productId, cid);
}

async function getCustomerInsights(companyId, customerId = null) {
  const cid = toInt(companyId, -1);
  const params = [cid];
  let filter = '';
  if (customerId) {
    filter = ' AND c.id = ?';
    params.push(toInt(customerId, -1));
  }
  return all(
    `SELECT c.id, c.name, c.phone, c.email, c.notes, c.tags,
            COALESCE(COUNT(s.id), 0) AS purchases,
            COALESCE(SUM(s.total_price), 0) AS totalSpent
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id AND s.company_id = c.company_id
     WHERE c.company_id = ?${filter}
     GROUP BY c.id, c.name, c.phone, c.email, c.notes, c.tags
     ORDER BY totalSpent DESC, c.name ASC`,
    params
  );
}

async function getInvoicePayments(invoiceId, companyId) {
  const id = toInt(invoiceId, -1);
  const cid = toInt(companyId, -1);
  if (id <= 0 || cid <= 0) throw new Error('Valid invoice/company required.');
  return all(
    `SELECT ph.id, ph.amount, 'cash' AS paymentMethod, ph.created_at AS paymentDate, ph.added_by AS recordedBy, u.username AS recordedByName, ph.note, ph.created_at AS createdAt
     FROM payment_history ph
     LEFT JOIN users u ON u.id = ph.added_by
     WHERE ph.company_id = ? AND ph.invoice_id = ?
     ORDER BY ph.created_at DESC, ph.id DESC`,
    [cid, id]
  );
}

async function recordInvoicePayment(payload, companyId, userId = null) {
  const cid = toInt(companyId, -1);
  const invoiceId = toInt(payload?.invoiceId, -1);
  const amount = Number(payload?.amount || 0);
  const note = String(payload?.note || '').trim();
  const paymentDate = payload?.paymentDate ? new Date(payload.paymentDate) : new Date();
  if (cid <= 0 || invoiceId <= 0 || !Number.isFinite(amount) || amount <= 0) throw new Error('Payment data is invalid.');
  if (Number.isNaN(paymentDate.getTime())) throw new Error('Payment date is invalid.');
  const invoice = await get('SELECT id, total_amount AS totalAmount FROM invoices WHERE id = ? AND company_id = ?', [invoiceId, cid]);
  if (!invoice) throw new Error('Invoice not found.');
  const paidRow = await get('SELECT COALESCE(SUM(amount),0) AS paid FROM payment_history WHERE company_id = ? AND invoice_id = ?', [cid, invoiceId]);
  const alreadyPaid = Number(paidRow?.paid || 0);
  const nextPaid = Number((alreadyPaid + amount).toFixed(2));
  if (nextPaid - Number(invoice.totalAmount || 0) > 0.0001) throw new Error('Payment exceeds outstanding amount.');
  const createdAt = paymentDate.toISOString();
  const balance = Number((Number(invoice.totalAmount || 0) - nextPaid).toFixed(2));
  const paymentStatus = derivePaymentStatus(Number(invoice.totalAmount || 0), nextPaid);
  const res = await run(
    `INSERT INTO payment_history (company_id, invoice_id, amount, added_by, created_at, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cid, invoiceId, amount, toInt(userId, null), createdAt, note]
  );
  const documentStatus = paymentStatus === 'paid' ? 'paid' : (paymentStatus === 'partial' ? 'partially_paid' : 'pending');
  await run(
    'UPDATE invoices SET amount_paid = ?, balance = ?, payment_status = ?, status = ?, last_payment_by = ?, last_payment_at = ? WHERE id = ? AND company_id = ?',
    [nextPaid, balance, paymentStatus, documentStatus, toInt(userId, null), createdAt, invoiceId, cid]
  );
  await logAudit({ companyId: cid, userId, action: 'payment', module: 'invoices', entityId: invoiceId, metadata: { amount, status: paymentStatus, balance } });
  return { id: res.id, invoiceId, amount, status: paymentStatus, amountPaid: nextPaid, balance, paymentDate: createdAt };
}

async function getFinancialSummary(companyId, period = 'daily') {
  const cid = toInt(companyId, -1);
  const range = buildReportRange(period === 'daily' ? 'daily' : period === 'weekly' ? 'weekly' : 'monthly');
  const revenue = await get('SELECT COALESCE(SUM(total_price),0) AS value FROM sales WHERE company_id = ? AND date BETWEEN ? AND ?', [cid, range.startIso, range.endIso]);
  const paid = await get('SELECT COALESCE(SUM(amount),0) AS value FROM payment_history WHERE company_id = ? AND created_at BETWEEN ? AND ?', [cid, range.startIso, range.endIso]);
  const cogs = await get(
    `SELECT COALESCE(SUM(s.quantity * p.cost_price), 0) AS value
     FROM sales s INNER JOIN products p ON p.id = s.product_id
     WHERE s.company_id = ? AND s.date BETWEEN ? AND ?`,
    [cid, range.startIso, range.endIso]
  );
  return {
    period,
    startDate: range.startIso,
    endDate: range.endIso,
    revenue: Number(revenue?.value || 0),
    paymentsReceived: Number(paid?.value || 0),
    cogs: Number(cogs?.value || 0),
    profit: Number((Number(revenue?.value || 0) - Number(cogs?.value || 0)).toFixed(2))
  };
}

async function getReceipts(companyId, payload = {}) {
  const cid = toInt(companyId, -1);
  const limit = Math.max(1, Math.min(200, toInt(payload.limit, 50)));
  return all(
    `SELECT id, sale_id AS saleId, invoice_id AS invoiceId, receipt_number AS receiptNumber, items, total_amount AS totalAmount, payment_method AS paymentMethod, created_at AS createdAt
     FROM receipts
     WHERE company_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [cid, limit]
  );
}

const INVOICE_TYPES = ['invoice', 'performa', 'proforma', 'quote'];

function normalizeInvoiceType(type) {
  const value = String(type || 'invoice').trim().toLowerCase();
  if (!INVOICE_TYPES.includes(value)) throw new Error('Invoice type must be invoice, performa, or quote.');
  // Backward compatibility: keep legacy stored value "proforma" while accepting "performa" everywhere in APIs/UI.
  return value === 'performa' ? 'proforma' : value;
}

function normalizeInvoiceStatus(status) {
  const allowed = new Set(['draft', 'sent', 'accepted', 'pending', 'partially_paid', 'paid', 'cancelled']);
  const value = String(status || 'draft').trim().toLowerCase();
  return allowed.has(value) ? value : 'draft';
}

function normalizePaymentStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'paid' || value === 'partial' || value === 'unpaid') return value;
  return 'unpaid';
}

function derivePaymentStatus(totalAmount, amountPaid) {
  const total = Math.max(0, Number(totalAmount || 0));
  const paid = Math.max(0, Number(amountPaid || 0));
  if (paid <= 0) return 'unpaid';
  if (paid + 0.0001 < total) return 'partial';
  return 'paid';
}

function invoicePrefixForType(type) {
  if (type === 'proforma' || type === 'performa') return 'PFI';
  if (type === 'quote') return 'QTE';
  return 'INV';
}

function normalizeInvoiceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id,
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || '',
    invoiceNumber: row.invoice_number,
    date: row.date,
    items: parseJsonArray(row.items),
    subtotalAmount: Number(row.subtotal_amount || 0),
    taxPercent: Number(row.tax_percent || 0),
    taxAmount: Number(row.tax_amount || 0),
    discountAmount: Number(row.discount_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    amountPaid: Number(row.amount_paid || 0),
    balance: Number(row.balance || 0),
    paymentStatus: normalizePaymentStatus(row.payment_status),
    // Backward compatibility: legacy rows may still contain "proforma".
    type: row.type === 'proforma' ? 'performa' : row.type,
    status: row.status || 'draft',
    validityPeriod: String(row.validity_period || ''),
    notes: String(row.notes || ''),
    createdBy: toInt(row.created_by, null),
    createdByUsername: row.created_by_username || '',
    lastPaymentBy: toInt(row.last_payment_by, null),
    lastPaymentByUsername: row.last_payment_by_username || '',
    lastPaymentAt: String(row.last_payment_at || ''),
    createdAt: row.created_at
  };
}

function normalizeCompanySettings(row, companyId) {
  return {
    companyId: toInt(row?.company_id, toInt(companyId, 1)),
    defaultTaxRate: Number(row?.default_tax_rate || 0),
    termsConditions: String(row?.terms_conditions || '')
  };
}

async function getCompanySettings(companyId) {
  const cid = toInt(companyId, -1);
  if (cid <= 0) throw new Error('A valid company ID is required.');
  let row = await get('SELECT * FROM settings WHERE company_id = ?', [cid]);
  if (!row) {
    const stamp = new Date().toISOString();
    await run(
      'INSERT INTO settings (company_id, default_tax_rate, terms_conditions, created_at, updated_at) VALUES (?, 0, ?, ?, ?)',
      [cid, '', stamp, stamp]
    );
    row = await get('SELECT * FROM settings WHERE company_id = ?', [cid]);
  }
  return normalizeCompanySettings(row, cid);
}

async function updateCompanySettings(companyId, payload = {}) {
  const cid = toInt(companyId, -1);
  if (cid <= 0) throw new Error('A valid company ID is required.');
  const existing = await getCompanySettings(cid);
  const defaultTaxRate = Number(payload.defaultTaxRate ?? existing.defaultTaxRate ?? 0);
  if (!Number.isFinite(defaultTaxRate) || defaultTaxRate < 0 || defaultTaxRate > 100) {
    throw new Error('Default tax rate must be between 0 and 100.');
  }
  const termsConditions = String(payload.termsConditions ?? existing.termsConditions ?? '').trim();
  const stamp = new Date().toISOString();
  await run(
    `UPDATE settings
     SET default_tax_rate = ?, terms_conditions = ?, updated_at = ?
     WHERE company_id = ?`,
    [Number(defaultTaxRate.toFixed(4)), termsConditions, stamp, cid]
  );
  return getCompanySettings(cid);
}

const normalizeRole = (row) => ({
  id: row.id,
  roleName: row.role_name,
  permissions: normalizePermissions(parseJsonObject(row.permissions, {})),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

async function getRoles() {
  const rows = await all('SELECT * FROM roles ORDER BY role_name ASC');
  return rows.map(normalizeRole);
}

async function getRoleById(roleId) {
  const id = toInt(roleId, -1);
  if (id <= 0) return null;
  const row = await get('SELECT * FROM roles WHERE id = ?', [id]);
  return row ? normalizeRole(row) : null;
}

async function createRole(payload = {}) {
  const roleName = String(payload.roleName || '').trim();
  if (!roleName) throw new Error('Role name is required.');
  const permissions = normalizePermissions(payload.permissions || {});
  const stamp = new Date().toISOString();
  const res = await run(
    'INSERT INTO roles (role_name, permissions, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [roleName, JSON.stringify(permissions), stamp, stamp]
  );
  return getRoleById(res.id);
}

async function updateRole(payload = {}) {
  const id = toInt(payload.id, -1);
  const roleName = String(payload.roleName || '').trim();
  if (id <= 0 || !roleName) throw new Error('Role update data is invalid.');
  const permissions = normalizePermissions(payload.permissions || {});
  const stamp = new Date().toISOString();
  await run(
    'UPDATE roles SET role_name = ?, permissions = ?, updated_at = ? WHERE id = ?',
    [roleName, JSON.stringify(permissions), stamp, id]
  );
  return getRoleById(id);
}

async function deleteRole(roleId) {
  const id = toInt(roleId, -1);
  if (id <= 0) throw new Error('A valid role ID is required.');
  const usage = await get('SELECT COUNT(*) AS c FROM users WHERE role_id = ?', [id]);
  if ((usage?.c || 0) > 0) throw new Error('Cannot delete role assigned to users.');
  await run('DELETE FROM roles WHERE id = ?', [id]);
}

async function setUserRowAccess(payload = {}) {
  const userId = toInt(payload.userId, -1);
  const rowId = toInt(payload.rowId, -1);
  const tableName = String(payload.tableName || '').trim();
  const accessType = String(payload.accessType || '').trim().toLowerCase();
  if (userId <= 0 || rowId <= 0 || !tableName || !['view', 'edit', 'delete'].includes(accessType)) {
    throw new Error('Row access data is invalid.');
  }
  const stamp = new Date().toISOString();
  await run(
    `INSERT OR IGNORE INTO user_row_access (user_id, table_name, row_id, access_type, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, tableName, rowId, accessType, stamp]
  );
}

async function removeUserRowAccess(payload = {}) {
  const userId = toInt(payload.userId, -1);
  const rowId = toInt(payload.rowId, -1);
  const tableName = String(payload.tableName || '').trim();
  const accessType = String(payload.accessType || '').trim().toLowerCase();
  if (userId <= 0 || rowId <= 0 || !tableName || !accessType) throw new Error('Row access data is invalid.');
  await run('DELETE FROM user_row_access WHERE user_id = ? AND table_name = ? AND row_id = ? AND access_type = ?', [userId, tableName, rowId, accessType]);
}

async function getUserRowAccess(userId, tableName = null) {
  const uid = toInt(userId, -1);
  if (uid <= 0) throw new Error('A valid user ID is required.');
  const rows = tableName
    ? await all('SELECT user_id AS userId, table_name AS tableName, row_id AS rowId, access_type AS accessType FROM user_row_access WHERE user_id = ? AND table_name = ?', [uid, String(tableName).trim()])
    : await all('SELECT user_id AS userId, table_name AS tableName, row_id AS rowId, access_type AS accessType FROM user_row_access WHERE user_id = ?', [uid]);
  return rows;
}

async function logAudit({ companyId = null, userId = null, action = '', module = '', entityId = null, metadata = {} } = {}) {
  const act = String(action || '').trim();
  const mod = String(module || '').trim();
  if (!act || !mod) return;
  await run(
    'INSERT INTO audit_log (company_id, user_id, action, module, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [toInt(companyId, null), toInt(userId, null), act, mod, toInt(entityId, null), JSON.stringify(metadata || {}), new Date().toISOString()]
  );
}

async function addStockMovement({ companyId, productId, userId = null, changeQty, movementType, reason = '', refType = '', refId = null }) {
  await run(
    `INSERT INTO stock_movement (company_id, product_id, user_id, change_qty, movement_type, reason, ref_type, ref_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      toInt(companyId, -1),
      toInt(productId, -1),
      toInt(userId, null),
      toInt(changeQty, 0),
      String(movementType || 'adjustment'),
      String(reason || ''),
      String(refType || ''),
      toInt(refId, null),
      new Date().toISOString()
    ]
  );
}

async function getRecentActivities(companyId, limit = 20) {
  const cid = toInt(companyId, -1);
  const lim = Math.max(1, Math.min(100, toInt(limit, 20)));
  return all(
    `SELECT a.id, a.action, a.module, a.entity_id AS entityId, a.metadata, a.created_at AS createdAt, u.username
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE (a.company_id = ? OR a.company_id IS NULL)
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [cid, lim]
  );
}

async function getNextInvoiceNumber(companyId, type = 'invoice') {
  const cid = toInt(companyId, -1);
  if (cid <= 0) throw new Error('A valid company ID is required.');
  const invoiceType = normalizeInvoiceType(type);
  const year = new Date().getFullYear();
  const prefix = `${invoicePrefixForType(invoiceType)}-${year}-`;
  const row = await get(
    `SELECT invoice_number
     FROM invoices
     WHERE company_id = ? AND type = ? AND invoice_number LIKE ?
     ORDER BY id DESC
     LIMIT 1`,
    [cid, invoiceType, `${prefix}%`]
  );
  let next = 1;
  if (row?.invoice_number) {
    const m = String(row.invoice_number).match(/-(\d+)$/);
    if (m) next = Number(m[1]) + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function normalizeInvoiceItems(items, companyId) {
  const cid = toInt(companyId, -1);
  const raw = Array.isArray(items) ? items : [];
  if (raw.length === 0) throw new Error('Add at least one invoice item.');
  const normalized = [];
  let total = 0;
  for (const item of raw) {
    const productId = toInt(item?.productId, -1);
    const quantity = Number(item?.quantity);
    const unitPrice = Number(item?.unitPrice);
    if (productId <= 0 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Each invoice item must include a valid product, quantity, and unit price.');
    }
    const product = await get('SELECT id, name FROM products WHERE id = ? AND company_id = ?', [productId, cid]);
    if (!product) throw new Error(`Product #${productId} was not found in active company.`);
    const lineTotal = Number((quantity * unitPrice).toFixed(2));
    total += lineTotal;
    normalized.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: Number(unitPrice.toFixed(2)),
      lineTotal
    });
  }
  return { items: normalized, total: Number(total.toFixed(2)) };
}

async function createInvoice(payload, companyId, createdBy = null) {
  const cid = toInt(companyId, -1);
  if (cid <= 0) throw new Error('A valid company ID is required.');
  const type = normalizeInvoiceType(payload?.type);
  const status = normalizeInvoiceStatus(payload?.status);
  let customerId = toInt(payload?.customerId, -1);
  if (customerId <= 0) {
    const fallback = await get('SELECT id FROM customers WHERE company_id = ? ORDER BY id ASC LIMIT 1', [cid]);
    if (fallback?.id) {
      customerId = fallback.id;
    } else {
      const created = await run(
        'INSERT INTO customers (company_id, name, phone, email) VALUES (?, ?, ?, ?)',
        [cid, 'Walk-in Customer', '', '']
      );
      customerId = created.id;
    }
  } else {
    const customer = await get('SELECT id FROM customers WHERE id = ? AND company_id = ?', [customerId, cid]);
    if (!customer) throw new Error('Selected customer was not found in active company.');
  }
  const invoiceDate = payload?.date ? new Date(payload.date) : new Date();
  if (Number.isNaN(invoiceDate.getTime())) throw new Error('Invoice date is invalid.');
  const { items, total } = await normalizeInvoiceItems(payload?.items, cid);
  const subtotalAmount = Number(total.toFixed(2));
  const taxPercent = Math.max(0, Number(payload?.taxPercent ?? 0));
  const discountAmount = Math.max(0, Number(payload?.discountAmount || 0));
  const validityPeriod = String(payload?.validityPeriod || '').trim();
  const notes = String(payload?.notes || '').trim();
  const taxAmount = Number(((subtotalAmount * taxPercent) / 100).toFixed(2));
  const totalAmount = Number(Math.max(0, subtotalAmount + taxAmount - discountAmount).toFixed(2));
  const amountPaidRaw = Number(payload?.amountPaid ?? 0);
  if (!Number.isFinite(amountPaidRaw) || amountPaidRaw < 0) throw new Error('Amount paid must be a valid non-negative number.');
  const amountPaid = Number(amountPaidRaw.toFixed(2));
  if (amountPaid - totalAmount > 0.0001) throw new Error('Amount paid cannot exceed total invoice amount.');
  const balance = Number((totalAmount - amountPaid).toFixed(2));
  const paymentStatus = derivePaymentStatus(totalAmount, amountPaid);
  let invoiceNumber = String(payload?.invoiceNumber || '').trim();
  if (!invoiceNumber) invoiceNumber = await getNextInvoiceNumber(cid, type);
  const exists = await get('SELECT id FROM invoices WHERE company_id = ? AND invoice_number = ?', [cid, invoiceNumber]);
  if (exists) throw new Error('Invoice number already exists for this company.');
  const createdAt = new Date().toISOString();
  const res = await run(
    `INSERT INTO invoices (company_id, customer_id, invoice_number, date, items, subtotal_amount, tax_percent, tax_amount, discount_amount, total_amount, amount_paid, balance, payment_status, type, status, validity_period, notes, created_by, last_payment_by, last_payment_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cid,
      customerId,
      invoiceNumber,
      invoiceDate.toISOString(),
      JSON.stringify(items),
      subtotalAmount,
      taxPercent,
      taxAmount,
      discountAmount,
      totalAmount,
      amountPaid,
      balance,
      paymentStatus,
      type,
      status,
      validityPeriod,
      notes,
      toInt(createdBy, null),
      amountPaid > 0 ? toInt(createdBy, null) : null,
      amountPaid > 0 ? createdAt : '',
      createdAt
    ]
  );
  if (amountPaid > 0) {
    await run(
      `INSERT INTO payment_history (company_id, invoice_id, amount, added_by, created_at, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cid, res.id, amountPaid, toInt(createdBy, null), createdAt, 'Initial payment']
    );
  }
  await logAudit({
    companyId: cid,
    userId: toInt(createdBy, null),
    action: 'create',
    module: 'invoices',
    entityId: res.id,
    metadata: { type, invoiceNumber, totalAmount, amountPaid, balance, paymentStatus }
  });
  return getInvoiceById(res.id, cid);
}

async function getInvoiceById(invoiceId, companyId) {
  const id = toInt(invoiceId, -1);
  const cid = toInt(companyId, -1);
  if (id <= 0 || cid <= 0) throw new Error('Valid invoice and company IDs are required.');
  const row = await get(
    `SELECT i.*,
            c.name AS customer_name,
            c.phone AS customer_phone,
            c.email AS customer_email,
            uc.username AS created_by_username,
            up.username AS last_payment_by_username
     FROM invoices i
     INNER JOIN customers c ON c.id = i.customer_id
     LEFT JOIN users uc ON uc.id = i.created_by
     LEFT JOIN users up ON up.id = i.last_payment_by
     WHERE i.id = ? AND i.company_id = ?`,
    [id, cid]
  );
  return normalizeInvoiceRow(row);
}

async function getInvoices(companyId, payload = {}) {
  const cid = toInt(companyId, -1);
  if (cid <= 0) throw new Error('A valid company ID is required.');
  const limit = Math.max(1, Math.min(200, toInt(payload.limit, 50)));
  const type = payload?.type ? normalizeInvoiceType(payload.type) : null;
  const rows = type
    ? await all(
      `SELECT i.*,
              c.name AS customer_name,
              c.phone AS customer_phone,
              c.email AS customer_email,
              uc.username AS created_by_username,
              up.username AS last_payment_by_username
       FROM invoices i
       INNER JOIN customers c ON c.id = i.customer_id
       LEFT JOIN users uc ON uc.id = i.created_by
       LEFT JOIN users up ON up.id = i.last_payment_by
       WHERE i.company_id = ? AND i.type = ?
       ORDER BY i.date DESC, i.id DESC
       LIMIT ?`,
      [cid, type, limit]
    )
    : await all(
      `SELECT i.*,
              c.name AS customer_name,
              c.phone AS customer_phone,
              c.email AS customer_email,
              uc.username AS created_by_username,
              up.username AS last_payment_by_username
       FROM invoices i
       INNER JOIN customers c ON c.id = i.customer_id
       LEFT JOIN users uc ON uc.id = i.created_by
       LEFT JOIN users up ON up.id = i.last_payment_by
       WHERE i.company_id = ?
       ORDER BY i.date DESC, i.id DESC
       LIMIT ?`,
      [cid, limit]
    );
  return rows.map(normalizeInvoiceRow);
}

function normalizeUser(row) {
  return {
    id: row.id,
    username: row.username,
    isAdmin: Boolean(row.is_admin),
    assignedCompanies: parseJsonArray(row.assigned_companies),
    roleId: toInt(row.role_id, null),
    roleName: row.role_name || null,
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
    profileImagePath: row.profile_image_path || '',
    createdAt: row.created_at
  };
}

function buildEffectivePermissions(user) {
  if (user?.isAdmin || String(user?.username || '').toLowerCase() === 'admin') return fullPermissions();
  const rolePerms = normalizePermissions(user?.rolePermissions || {});
  const hasAny = Object.values(rolePerms).some((m) => Object.values(m).some(Boolean));
  if (hasAny) return rolePerms;
  const fallback = normalizePermissions({});
  ['dashboard', 'products', 'sales', 'categories', 'suppliers', 'customers', 'invoices', 'reports', 'company'].forEach((m) => {
    fallback[m].view = true;
  });
  ['products', 'sales', 'categories', 'suppliers', 'customers', 'invoices', 'company'].forEach((m) => {
    fallback[m].create = true;
    fallback[m].edit = true;
  });
  ['products', 'categories', 'suppliers', 'customers'].forEach((m) => {
    fallback[m].delete = true;
  });
  fallback.invoices.print = true;
  fallback.reports.print = true;
  return fallback;
}

async function createUser(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  const assignedCompanies = cleanAssigned(payload.assignedCompanies || []);
  const isAdmin = payload.isAdmin ? 1 : 0;
  const roleId = toInt(payload.roleId, null);
  const isActive = payload.isActive === undefined ? 1 : (payload.isActive ? 1 : 0);
  const profileImagePath = String(payload.profileImagePath || '').trim();
  if (!username) throw new Error('Username is required.');
  if (!strongPassword(password)) throw new Error('Password must be strong (8+ chars with upper/lower/number/symbol).');
  if (!isAdmin && assignedCompanies.length === 0) throw new Error('Assign at least one company to non-admin users.');
  if (roleId !== null) {
    const role = await get('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!role) throw new Error('Selected role does not exist.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const res = await run(
    `INSERT INTO users (username, password_hash, password_salt, assigned_companies, is_admin, role_id, is_active, profile_image_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [username, hash, salt, JSON.stringify(assignedCompanies), isAdmin, roleId, isActive, profileImagePath, new Date().toISOString()]
  );
  const row = await get(
    `SELECT u.*, r.role_name, r.permissions AS role_permissions
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [res.id]
  );
  return normalizeUser(row);
}

async function updateUser(payload) {
  const id = toInt(payload.id, -1);
  const username = String(payload.username || '').trim();
  const assignedCompanies = cleanAssigned(payload.assignedCompanies || []);
  const isAdmin = payload.isAdmin ? 1 : 0;
  const roleId = toInt(payload.roleId, null);
  const isActive = payload.isActive === undefined ? 1 : (payload.isActive ? 1 : 0);
  const profileImagePath = payload.profileImagePath === undefined ? undefined : String(payload.profileImagePath || '').trim();
  if (id <= 0 || !username) throw new Error('User update data is invalid.');
  if (!isAdmin && assignedCompanies.length === 0) throw new Error('Assign at least one company to non-admin users.');
  if (roleId !== null) {
    const role = await get('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!role) throw new Error('Selected role does not exist.');
  }
  const existing = await get('SELECT username, is_admin AS isAdmin, is_active AS isActive FROM users WHERE id = ?', [id]);
  if (!existing) throw new Error('User not found.');
  const isBuiltinAdmin = String(existing.username || '').toLowerCase() === 'admin';
  if (isBuiltinAdmin && (!isAdmin || !isActive)) {
    throw new Error('Built-in admin account cannot be disabled or downgraded.');
  }
  if (existing.isAdmin && !isAdmin) {
    const admins = await get('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1');
    if ((admins?.c || 0) <= 1) throw new Error('Cannot downgrade the last admin user.');
  }
  if (profileImagePath === undefined) {
    await run(
      'UPDATE users SET username = ?, assigned_companies = ?, is_admin = ?, role_id = ?, is_active = ? WHERE id = ?',
      [username, JSON.stringify(assignedCompanies), isAdmin, roleId, isActive, id]
    );
  } else {
    await run(
      'UPDATE users SET username = ?, assigned_companies = ?, is_admin = ?, role_id = ?, is_active = ?, profile_image_path = ? WHERE id = ?',
      [username, JSON.stringify(assignedCompanies), isAdmin, roleId, isActive, profileImagePath, id]
    );
  }
  if (payload.password) {
    const pw = String(payload.password);
    if (!strongPassword(pw)) throw new Error('New password must be strong.');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(pw, salt);
    await run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [hash, salt, id]);
  }
  const row = await get(
    `SELECT u.*, r.role_name, r.permissions AS role_permissions
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [id]
  );
  return normalizeUser(row);
}

async function resetUserPassword(payload) {
  const id = toInt(payload?.id, -1);
  const newPassword = String(payload?.newPassword || '');
  if (id <= 0) throw new Error('A valid user ID is required.');
  if (!strongPassword(newPassword)) throw new Error('Password must be strong (8+ chars with upper/lower/number/symbol).');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(newPassword, salt);
  await run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [hash, salt, id]);
}

async function updateUserProfileImage(userId, profileImagePath = '') {
  const id = toInt(userId, -1);
  if (id <= 0) throw new Error('A valid user ID is required.');
  const pathValue = String(profileImagePath || '').trim();
  await run('UPDATE users SET profile_image_path = ? WHERE id = ?', [pathValue, id]);
}

async function deleteUser(userId) {
  const id = toInt(userId, -1);
  if (id <= 0) throw new Error('A valid user ID is required.');
  const admins = await get('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1');
  const target = await get('SELECT username, is_admin AS isAdmin FROM users WHERE id = ?', [id]);
  if (String(target?.username || '').toLowerCase() === 'admin') throw new Error('Built-in admin account cannot be deleted.');
  if (target?.isAdmin && admins?.c <= 1) throw new Error('Cannot delete last admin user.');
  await run('DELETE FROM users WHERE id = ?', [id]);
}

async function getUsers() {
  const rows = await all(
    `SELECT u.*, r.role_name, r.permissions AS role_permissions
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY u.username ASC`
  );
  return rows.map(normalizeUser);
}

async function getUserAccessProfile(userId) {
  const id = toInt(userId, -1);
  if (id <= 0) throw new Error('A valid user ID is required.');
  const row = await get(
    `SELECT u.id, u.username, u.assigned_companies AS assignedCompanies, u.is_admin AS isAdmin, u.role_id AS roleId, u.is_active AS isActive, u.profile_image_path AS profileImagePath,
            r.role_name AS roleName, r.permissions AS rolePermissions
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [id]
  );
  if (!row) return null;
  const user = {
    id: row.id,
    username: row.username,
    isAdmin: Boolean(row.isAdmin) || String(row.username || '').toLowerCase() === 'admin',
    assignedCompanies: cleanAssigned(parseJsonArray(row.assignedCompanies)),
    roleId: toInt(row.roleId, null),
    roleName: row.roleName || null,
    isActive: Boolean(row.isActive) || String(row.username || '').toLowerCase() === 'admin',
    profileImagePath: row.profileImagePath || '',
    rolePermissions: normalizePermissions(parseJsonObject(row.rolePermissions || '{}', {}))
  };
  user.permissions = buildEffectivePermissions(user);
  return user;
}
async function authenticateUser(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  if (!username || !password) throw new Error('Username and password are required.');
  const user = await get(
    `SELECT id, username, password_hash AS passwordHash, password_salt AS passwordSalt,
            assigned_companies AS assignedCompanies, is_admin AS isAdmin, role_id AS roleId, is_active AS isActive, profile_image_path AS profileImagePath
     FROM users
     WHERE username = ?`,
    [username]
  );
  if (!user) throw new Error('Invalid username or password.');
  if (!Boolean(user.isActive)) throw new Error('User account is disabled.');
  const hash = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) throw new Error('Invalid username or password.');
  const normalized = await getUserAccessProfile(user.id);
  if (!normalized.isAdmin) {
    const companies = await getAllCompanies();
    if (companies.length === 0) {
      throw new Error('No company exists yet. Ask an administrator to create one.');
    }
    const validIds = new Set(companies.map((c) => c.id));
    let assigned = normalized.assignedCompanies.filter((id) => validIds.has(id));
    if (assigned.length === 0) assigned = [companies[0].id];
    if (assigned.length !== normalized.assignedCompanies.length || assigned.some((id, i) => id !== normalized.assignedCompanies[i])) {
      await run('UPDATE users SET assigned_companies = ? WHERE id = ?', [JSON.stringify(assigned), normalized.id]);
    }
    normalized.assignedCompanies = assigned;
  }
  normalized.permissions = buildEffectivePermissions(normalized);
  return normalized;
}

async function changePassword(payload) {
  const username = String(payload.username || '').trim();
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  if (!username || !currentPassword || !newPassword) throw new Error('Username, current password, and new password are required.');
  if (!strongPassword(newPassword)) throw new Error('New password is weak. Use 8+ chars with upper/lower/number/symbol.');
  const user = await get('SELECT id, password_hash AS passwordHash, password_salt AS passwordSalt FROM users WHERE username = ?', [username]);
  if (!user) throw new Error('User not found.');
  const currentHash = hashPassword(currentPassword, user.passwordSalt);
  if (currentHash !== user.passwordHash) throw new Error('Current password is incorrect.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(newPassword, salt);
  await run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [hash, salt, user.id]);
}

function parsePhotoDataUrl(dataUrl) {
  const m = String(dataUrl || '').match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!m) throw new Error('Invalid snapshot image format.');
  const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  return { ext, buf: Buffer.from(m[2], 'base64') };
}

async function recordClockIn(payload) {
  const userId = toInt(payload.userId, -1);
  const companyId = toInt(payload.companyId, -1);
  const photoDataUrl = String(payload.photoDataUrl || '');
  if (userId <= 0 || companyId <= 0) throw new Error('A valid user and company are required for clock-in.');
  const { ext, buf } = parsePhotoDataUrl(photoDataUrl);
  const photoDir = path.join(path.dirname(databasePath), 'clock_in_photos');
  ensureDir(photoDir);
  const stamp = new Date().toISOString();
  const fileName = `clockin-u${userId}-c${companyId}-${stamp.replace(/[:.]/g, '-')}.${ext}`;
  const photoPath = path.join(photoDir, fileName);
  fs.writeFileSync(photoPath, buf);
  const res = await run(
    'INSERT INTO clock_in (user_id, company_id, timestamp, photo_path, notified) VALUES (?, ?, ?, ?, 0)',
    [userId, companyId, stamp, photoPath]
  );
  return get(
    `SELECT ci.id, ci.timestamp, ci.photo_path AS photoPath, u.username, c.name AS companyName
     FROM clock_in ci
     INNER JOIN users u ON u.id = ci.user_id
     INNER JOIN company c ON c.id = ci.company_id
     WHERE ci.id = ?`,
    [res.id]
  );
}

function getRecentClockIns(limit = 20, companyId = null, userId = null) {
  const lim = Math.max(1, Math.min(100, toInt(limit, 20)));
  if (companyId) {
    const cid = toInt(companyId, -1);
    const uid = toInt(userId, null);
    if (uid) {
      return all(
        `SELECT ci.id, ci.timestamp, ci.photo_path AS photoPath, u.username, u.profile_image_path AS profileImagePath, c.name AS companyName, ci.user_id AS userId, ci.company_id AS companyId
         FROM clock_in ci
         INNER JOIN users u ON u.id = ci.user_id
         INNER JOIN company c ON c.id = ci.company_id
         WHERE ci.company_id = ? AND ci.user_id = ?
         ORDER BY ci.timestamp DESC
         LIMIT ?`,
        [cid, uid, lim]
      );
    }
    return all(
      `SELECT ci.id, ci.timestamp, ci.photo_path AS photoPath, u.username, u.profile_image_path AS profileImagePath, c.name AS companyName, ci.user_id AS userId, ci.company_id AS companyId
       FROM clock_in ci
       INNER JOIN users u ON u.id = ci.user_id
       INNER JOIN company c ON c.id = ci.company_id
       WHERE ci.company_id = ?
       ORDER BY ci.timestamp DESC
       LIMIT ?`,
      [cid, lim]
    );
  }
  return all(
    `SELECT ci.id, ci.timestamp, ci.photo_path AS photoPath, u.username, u.profile_image_path AS profileImagePath, c.name AS companyName, ci.user_id AS userId, ci.company_id AS companyId
     FROM clock_in ci
     INNER JOIN users u ON u.id = ci.user_id
     INNER JOIN company c ON c.id = ci.company_id
     ORDER BY ci.timestamp DESC
     LIMIT ?`,
    [lim]
  );
}

function getDatabasePath() {
  return databasePath;
}

async function restoreDatabase(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error('Selected backup file was not found.');
  await closeDatabase();
  fs.copyFileSync(sourcePath, databasePath);
  db = await openDb(databasePath);
  await migrate();
}

function closeDatabase() {
  if (!db) return Promise.resolve();
  const active = db;
  db = null;
  return new Promise((resolve, reject) => active.close((err) => (err ? reject(err) : resolve())));
}

module.exports = {
  initializeDatabase,
  getCompanyById,
  getCompanyEmailSetup,
  getCompanyEmailConfigRaw,
  getAllCompanies,
  getCompaniesForUser,
  getCompanySettings,
  updateCompanySettings,
  createCompany,
  updateCompany,
  updateCompanyEmailSetup,
  deleteCompany,
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  recordSale,
  createInvoice,
  getInvoiceById,
  getInvoices,
  getNextInvoiceNumber,
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  getProfitLossSummary,
  getStaffPerformanceReport,
  getFinancialSummary,
  getStockMovements,
  adjustStock,
  getCustomerInsights,
  getInvoicePayments,
  recordInvoicePayment,
  getRecentActivities,
  getReceipts,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  getUsers,
  getUserAccessProfile,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  setUserRowAccess,
  removeUserRowAccess,
  getUserRowAccess,
  updateUserProfileImage,
  authenticateUser,
  changePassword,
  recordClockIn,
  getRecentClockIns,
  getDatabasePath,
  enqueueEmail,
  getPendingEmailQueue,
  markEmailQueuedSent,
  markEmailQueuedFailed,
  restoreDatabase,
  closeDatabase
};
