const { contextBridge, ipcRenderer } = require('electron');

const inventoryApi = {
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  openDocumentation: () => ipcRenderer.invoke('app:openDocumentation'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  windowAction: (action) => ipcRenderer.invoke('window:action', { action }),

  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installDownloadedUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const wrapped = (_event, payload) => handler(payload || {});
    ipcRenderer.on('updater:status', wrapped);
    return () => ipcRenderer.removeListener('updater:status', wrapped);
  },

  getSession: () => ipcRenderer.invoke('auth:session'),
  getPermissions: () => ipcRenderer.invoke('auth:permissions'),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),
  switchCompany: (companyId) => ipcRenderer.invoke('session:switchCompany', { companyId }),

  getClockInStatus: () => ipcRenderer.invoke('clockin:status'),
  submitClockIn: (photoDataUrl) => ipcRenderer.invoke('clockin:submit', { photoDataUrl }),
  getRecentClockIns: (payload) => ipcRenderer.invoke('clockin:listRecent', payload),

  getMyCompanies: () => ipcRenderer.invoke('companies:getMine'),
  createCompany: (payload) => ipcRenderer.invoke('companies:create', payload),
  updateCompany: (payload) => ipcRenderer.invoke('companies:update', payload),
  deleteCompany: (id) => ipcRenderer.invoke('companies:delete', { id }),
  getActiveCompany: () => ipcRenderer.invoke('company:getActive'),
  saveActiveCompany: (payload) => ipcRenderer.invoke('company:saveActive', payload),
  selectCompanyLogo: () => ipcRenderer.invoke('company:selectLogo'),
  selectCompanySignature: () => ipcRenderer.invoke('company:selectSignature'),

  createUser: (payload) => ipcRenderer.invoke('users:create', payload),
  updateUser: (payload) => ipcRenderer.invoke('users:update', payload),
  resetUserPassword: (payload) => ipcRenderer.invoke('users:resetPassword', payload),
  selectUserProfileImage: (payload) => ipcRenderer.invoke('users:selectProfileImage', payload),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', { id }),
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  changePassword: (payload) => ipcRenderer.invoke('users:changePassword', payload),

  getRoles: () => ipcRenderer.invoke('roles:getAll'),
  createRole: (payload) => ipcRenderer.invoke('roles:create', payload),
  updateRole: (payload) => ipcRenderer.invoke('roles:update', payload),
  deleteRole: (id) => ipcRenderer.invoke('roles:delete', { id }),
  getUserRowAccess: (payload) => ipcRenderer.invoke('rowAccess:getForUser', payload),
  addUserRowAccess: (payload) => ipcRenderer.invoke('rowAccess:add', payload),
  removeUserRowAccess: (payload) => ipcRenderer.invoke('rowAccess:remove', payload),

  createCategory: (payload) => ipcRenderer.invoke('categories:create', payload),
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  updateCategory: (payload) => ipcRenderer.invoke('categories:update', payload),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', { id }),

  createSupplier: (payload) => ipcRenderer.invoke('suppliers:create', payload),
  getSuppliers: () => ipcRenderer.invoke('suppliers:getAll'),
  updateSupplier: (payload) => ipcRenderer.invoke('suppliers:update', payload),
  deleteSupplier: (id) => ipcRenderer.invoke('suppliers:delete', { id }),

  createCustomer: (payload) => ipcRenderer.invoke('customers:create', payload),
  getCustomers: () => ipcRenderer.invoke('customers:getAll'),
  updateCustomer: (payload) => ipcRenderer.invoke('customers:update', payload),
  deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', { id }),

  createProduct: (payload) => ipcRenderer.invoke('products:create', payload),
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  updateProduct: (payload) => ipcRenderer.invoke('products:update', payload),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', { id }),

  recordSale: (payload) => ipcRenderer.invoke('sales:record', payload),
  getReceipts: (payload) => ipcRenderer.invoke('receipts:getAll', payload),

  getNextInvoiceNumber: (payload) => ipcRenderer.invoke('invoices:getNextNumber', payload),
  createInvoice: (payload) => ipcRenderer.invoke('invoices:create', payload),
  getInvoices: (payload) => ipcRenderer.invoke('invoices:getAll', payload),
  getInvoiceById: (id) => ipcRenderer.invoke('invoices:getById', { id }),
  getInvoicePayments: (invoiceId) => ipcRenderer.invoke('invoices:getPayments', { invoiceId }),
  addInvoicePayment: (payload) => ipcRenderer.invoke('invoices:addPayment', payload),
  exportInvoicePdf: (payload) => ipcRenderer.invoke('invoices:exportPdf', payload),
  exportBrandedInvoicePdf: (payload) => ipcRenderer.invoke('invoices:exportPdf', payload),
  exportPreviewInvoicePdf: (payload) => ipcRenderer.invoke('invoices:previewPdf', payload),
  renderInvoiceTemplate: (payload) => ipcRenderer.invoke('invoices:renderTemplate', payload),

  getInvoiceSettings: () => ipcRenderer.invoke('settings:get'),
  updateInvoiceSettings: (payload) => ipcRenderer.invoke('settings:update', payload),

  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
  getRecentActivities: (payload) => ipcRenderer.invoke('dashboard:getActivities', payload),

  getSalesReport: (payload) => ipcRenderer.invoke('reports:getSales', payload),
  getInventoryReport: () => ipcRenderer.invoke('reports:getInventory'),
  getProfitLossReport: (payload) => ipcRenderer.invoke('reports:getProfitLoss', payload),
  getStaffPerformanceReport: (payload) => ipcRenderer.invoke('reports:getStaffPerformance', payload),
  getFinancialSummary: (payload) => ipcRenderer.invoke('finance:getSummary', payload),
  exportSalesReportCsv: (report) => ipcRenderer.invoke('reports:exportCsv', { report }),

  getCustomerInsights: (payload) => ipcRenderer.invoke('customers:getInsights', payload),
  getStockMovements: (payload) => ipcRenderer.invoke('stock:getMovements', payload),
  adjustStock: (payload) => ipcRenderer.invoke('stock:adjust', payload),

  backupDatabase: () => ipcRenderer.invoke('database:backup'),
  restoreDatabase: () => ipcRenderer.invoke('database:restore')
};

contextBridge.exposeInMainWorld('inventoryApi', inventoryApi);
contextBridge.exposeInMainWorld('api', inventoryApi);
