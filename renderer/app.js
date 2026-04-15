const ipcFallback = (() => {
  try {
    const electron = typeof window.require === 'function' ? window.require('electron') : null;
    return electron?.ipcRenderer || null;
  } catch {
    return null;
  }
})();

const apiFromIpc = ipcFallback ? {
  getAppInfo: () => ipcFallback.invoke('app:getInfo'),
  openDocumentation: () => ipcFallback.invoke('app:openDocumentation'),
  quitApp: () => ipcFallback.invoke('app:quit'),
  windowAction: (action) => ipcFallback.invoke('window:action', { action }),
  checkForUpdates: () => ipcFallback.invoke('updater:check'),
  installDownloadedUpdate: () => ipcFallback.invoke('updater:install'),
  onUpdateStatus: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const wrapped = (_event, payload) => handler(payload || {});
    ipcFallback.on('updater:status', wrapped);
    return () => ipcFallback.removeListener('updater:status', wrapped);
  },
  getSession: () => ipcFallback.invoke('auth:session'),
  getPermissions: () => ipcFallback.invoke('auth:permissions'),
  login: (payload) => ipcFallback.invoke('auth:login', payload),
  logout: () => ipcFallback.invoke('auth:logout'),
  switchCompany: (companyId) => ipcFallback.invoke('session:switchCompany', { companyId }),
  getClockInStatus: () => ipcFallback.invoke('clockin:status'),
  submitClockIn: (photoDataUrl) => ipcFallback.invoke('clockin:submit', { photoDataUrl }),
  getRecentClockIns: (payload) => ipcFallback.invoke('clockin:listRecent', payload),
  getMyCompanies: () => ipcFallback.invoke('companies:getMine'),
  createCompany: (payload) => ipcFallback.invoke('companies:create', payload),
  updateCompany: (payload) => ipcFallback.invoke('companies:update', payload),
  deleteCompany: (id) => ipcFallback.invoke('companies:delete', { id }),
  getActiveCompany: () => ipcFallback.invoke('company:getActive'),
  saveActiveCompany: (payload) => ipcFallback.invoke('company:saveActive', payload),
  confirmCompanyIndustry: (industryType) => ipcFallback.invoke('company:confirmIndustry', { industryType }),
  selectCompanyLogo: () => ipcFallback.invoke('company:selectLogo'),
  selectCompanySignature: () => ipcFallback.invoke('company:selectSignature'),
  createUser: (payload) => ipcFallback.invoke('users:create', payload),
  updateUser: (payload) => ipcFallback.invoke('users:update', payload),
  resetUserPassword: (payload) => ipcFallback.invoke('users:resetPassword', payload),
  selectUserProfileImage: (payload) => ipcFallback.invoke('users:selectProfileImage', payload),
  deleteUser: (id) => ipcFallback.invoke('users:delete', { id }),
  getUsers: () => ipcFallback.invoke('users:getAll'),
  changePassword: (payload) => ipcFallback.invoke('users:changePassword', payload),
  getRoles: () => ipcFallback.invoke('roles:getAll'),
  createRole: (payload) => ipcFallback.invoke('roles:create', payload),
  updateRole: (payload) => ipcFallback.invoke('roles:update', payload),
  deleteRole: (id) => ipcFallback.invoke('roles:delete', { id }),
  getUserRowAccess: (payload) => ipcFallback.invoke('rowAccess:getForUser', payload),
  addUserRowAccess: (payload) => ipcFallback.invoke('rowAccess:add', payload),
  removeUserRowAccess: (payload) => ipcFallback.invoke('rowAccess:remove', payload),
  createCategory: (payload) => ipcFallback.invoke('categories:create', payload),
  getCategories: () => ipcFallback.invoke('categories:getAll'),
  updateCategory: (payload) => ipcFallback.invoke('categories:update', payload),
  deleteCategory: (id) => ipcFallback.invoke('categories:delete', { id }),
  createSupplier: (payload) => ipcFallback.invoke('suppliers:create', payload),
  getSuppliers: () => ipcFallback.invoke('suppliers:getAll'),
  updateSupplier: (payload) => ipcFallback.invoke('suppliers:update', payload),
  deleteSupplier: (id) => ipcFallback.invoke('suppliers:delete', { id }),
  getWallet: () => ipcFallback.invoke('wallet:get'),
  getVendors: (payload) => ipcFallback.invoke('vendors:getAll', payload),
  createVendor: (payload) => ipcFallback.invoke('vendors:create', payload),
  getExpenseCategories: () => ipcFallback.invoke('expenses:categories:getAll'),
  createExpenseCategory: (payload) => ipcFallback.invoke('expenses:categories:create', payload),
  getExpenses: (payload) => ipcFallback.invoke('expenses:getAll', payload),
  createExpense: (payload) => ipcFallback.invoke('expenses:create', payload),
  getIncomeCategories: () => ipcFallback.invoke('income:categories:getAll'),
  createIncomeCategory: (payload) => ipcFallback.invoke('income:categories:create', payload),
  getIncome: (payload) => ipcFallback.invoke('income:getAll', payload),
  createIncome: (payload) => ipcFallback.invoke('income:create', payload),
  getCashflowTransactions: (payload) => ipcFallback.invoke('cashflow:transactions:getAll', payload),
  createCustomer: (payload) => ipcFallback.invoke('customers:create', payload),
  getCustomers: () => ipcFallback.invoke('customers:getAll'),
  updateCustomer: (payload) => ipcFallback.invoke('customers:update', payload),
  deleteCustomer: (id) => ipcFallback.invoke('customers:delete', { id }),
  createProduct: (payload) => ipcFallback.invoke('products:create', payload),
  getProducts: () => ipcFallback.invoke('products:getAll'),
  updateProduct: (payload) => ipcFallback.invoke('products:update', payload),
  deleteProduct: (id) => ipcFallback.invoke('products:delete', { id }),
  recordSale: (payload) => ipcFallback.invoke('sales:record', payload),
  getReceipts: (payload) => ipcFallback.invoke('receipts:getAll', payload),
  getNextInvoiceNumber: (payload) => ipcFallback.invoke('invoices:getNextNumber', payload),
  createInvoice: (payload) => ipcFallback.invoke('invoices:create', payload),
  getInvoices: (payload) => ipcFallback.invoke('invoices:getAll', payload),
  getInvoiceById: (id) => ipcFallback.invoke('invoices:getById', { id }),
  getInvoicePayments: (invoiceId) => ipcFallback.invoke('invoices:getPayments', { invoiceId }),
  addInvoicePayment: (payload) => ipcFallback.invoke('invoices:addPayment', payload),
  exportInvoicePdf: (payload) => ipcFallback.invoke('invoices:exportPdf', payload),
  exportBrandedInvoicePdf: (payload) => ipcFallback.invoke('invoices:exportPdf', payload),
  exportPreviewInvoicePdf: (payload) => ipcFallback.invoke('invoices:previewPdf', payload),
  renderInvoiceTemplate: (payload) => ipcFallback.invoke('invoices:renderTemplate', payload),
  getInvoiceSettings: () => ipcFallback.invoke('settings:get'),
  updateInvoiceSettings: (payload) => ipcFallback.invoke('settings:update', payload),
  getIndustryModuleConfig: () => ipcFallback.invoke('modules:getConfig'),
  getSystemConfiguration: () => ipcFallback.invoke('system:getConfiguration'),
  updateSystemConfiguration: (payload) => ipcFallback.invoke('system:updateConfiguration', payload),
  getEmailSettings: () => ipcFallback.invoke('email:settings:get'),
  saveEmailSettings: (payload) => ipcFallback.invoke('email:settings:update', payload),
  testEmailConnection: (payload) => ipcFallback.invoke('email:testConnection', payload),
  sendEmail: (payload) => ipcFallback.invoke('email:send', payload),
  getDashboardStats: () => ipcFallback.invoke('dashboard:getStats'),
  getRecentActivities: (payload) => ipcFallback.invoke('dashboard:getActivities', payload),
  getSalesReport: (payload) => ipcFallback.invoke('reports:getSales', payload),
  getExpenseReport: (payload) => ipcFallback.invoke('reports:getExpenses', payload),
  getIncomeReport: (payload) => ipcFallback.invoke('reports:getIncome', payload),
  getCashflowReport: (payload) => ipcFallback.invoke('reports:getCashflow', payload),
  getRevenueReport: (payload) => ipcFallback.invoke('reports:getRevenue', payload),
  getCombinedFinancialReport: (payload) => ipcFallback.invoke('reports:getCombinedFinancial', payload),
  getInventoryReport: () => ipcFallback.invoke('reports:getInventory'),
  getProfitLossReport: (payload) => ipcFallback.invoke('reports:getProfitLoss', payload),
  getStaffPerformanceReport: (payload) => ipcFallback.invoke('reports:getStaffPerformance', payload),
  getFinancialSummary: (payload) => ipcFallback.invoke('finance:getSummary', payload),
  exportSalesReportCsv: (report) => ipcFallback.invoke('reports:exportCsv', { report }),
  getCustomerInsights: (payload) => ipcFallback.invoke('customers:getInsights', payload),
  getStockMovements: (payload) => ipcFallback.invoke('stock:getMovements', payload),
  adjustStock: (payload) => ipcFallback.invoke('stock:adjust', payload),
  getRooms: () => ipcFallback.invoke('rooms:getAll'),
  createRoom: (payload) => ipcFallback.invoke('rooms:create', payload),
  getGuests: () => ipcFallback.invoke('guests:getAll'),
  createGuest: (payload) => ipcFallback.invoke('guests:create', payload),
  getBookings: () => ipcFallback.invoke('bookings:getAll'),
  createBooking: (payload) => ipcFallback.invoke('bookings:create', payload),
  updateBookingStatus: (payload) => ipcFallback.invoke('bookings:updateStatus', payload),
  getPatients: () => ipcFallback.invoke('patients:getAll'),
  createPatient: (payload) => ipcFallback.invoke('patients:create', payload),
  getDrugExpiry: (payload) => ipcFallback.invoke('drugExpiry:getAll', payload),
  getInsights: (payload) => ipcFallback.invoke('insights:getAll', payload),
  backupDatabase: () => ipcFallback.invoke('database:backup'),
  restoreDatabase: () => ipcFallback.invoke('database:restore'),
  runAutoBackupNow: () => ipcFallback.invoke('database:autoBackupNow')
} : null;

const api = window.inventoryApi || window.api || apiFromIpc || {};
const $ = (id) => document.getElementById(id);
const nodePath = (() => {
  try {
    return typeof window.require === 'function' ? window.require('path') : null;
  } catch {
    return null;
  }
})();
const nodeFs = (() => {
  try {
    return typeof window.require === 'function' ? window.require('fs') : null;
  } catch {
    return null;
  }
})();
const sidebarConfig = (() => {
  try {
    if (typeof window.require !== 'function') return null;
    const loaded = window.require('../config/sidebarConfig');
    return loaded?.default || loaded;
  } catch {
    return null;
  }
})();
const dashboardConfig = (() => {
  try {
    if (typeof window.require !== 'function') return null;
    const loaded = window.require('../config/dashboardConfig');
    return loaded?.default || loaded;
  } catch {
    return null;
  }
})();
const reportConfig = (() => {
  try {
    if (typeof window.require !== 'function') return null;
    const loaded = window.require('../config/reportConfig');
    return loaded?.default || loaded;
  } catch {
    return null;
  }
})();
const rolePermissions = (() => {
  try {
    if (typeof window.require !== 'function') return null;
    const loaded = window.require('../config/rolePermissions');
    return loaded?.default || loaded;
  } catch {
    return null;
  }
})();

const ENABLE_MULTI_INDUSTRY = false;
const ACTIVE_INDUSTRY = "retail";

const state = {
  session: null,
  companies: [],
  userCompanies: [],
  roles: [],
  products: [],
  categories: [],
  suppliers: [],
  vendors: [],
  expenseCategories: [],
  incomeCategories: [],
  expenses: [],
  incomes: [],
  cashflowTransactions: [],
  wallet: { currentBalance: 0, lastUpdatedAt: '' },
  customers: [],
  users: [],
  report: null,
  company: null,
  invoiceSettings: { defaultTaxRate: 0, termsConditions: '', includeRevenueInBalance: false },
  emailSettings: { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpSecure: false, hasPassword: false },
  stream: null,
  clockIns: [],
  dashboardSalesReport: null,
  currentIndustry: 'general',
  currentUserRole: 'admin',
  moduleConfig: { industry: 'general', visibleSidebarItems: [], enabledFeatures: {}, labelMap: {}, enabledModules: ['core'] },
  systemConfig: { industryType: 'general', syncEnabled: false, enabledModules: ['core'], featureToggles: {} },
  rooms: [],
  guests: [],
  bookings: [],
  patients: [],
  drugExpiry: [],
  insights: [],
  posMode: false,
  invoices: [],
  invoiceDraft: { type: 'invoice', status: 'draft', date: '', invoiceNumber: '', customerId: '', taxPercent: 0, useDefaultTax: true, discountAmount: 0, amountPaid: 0, validityPeriod: '', notes: '', items: [] }
};

const sectionTitle = $('sectionTitle');
const sidebarNav = $('sidebarNav');
const sections = Array.from(document.querySelectorAll('.app-section'));
const proMenu = $('proMenu');
const statusMessageEl = $('statusMessage');
const aboutModal = $('aboutModal');
const aboutMetaText = $('aboutMetaText');
const aboutModalCloseBtn = $('aboutModalCloseBtn');
const formPopupOverlay = $('formPopupOverlay');
const formPopupTitle = $('formPopupTitle');
const formPopupBody = $('formPopupBody');
const formPopupCloseBtn = $('formPopupCloseBtn');
const updateBanner = $('updateBanner');
const updateMessage = $('updateMessage');
const updateProgress = $('updateProgress');
const restartInstallBtn = $('restartInstallBtn');
const currentUser = $('currentUser');
const currentUserAvatar = $('currentUserAvatar');
const myProfileImageBtn = $('myProfileImageBtn');
const companySwitcher = $('companySwitcher');

const loginOverlay = $('loginOverlay');
const loginForm = $('loginForm');
const loginUsername = $('loginUsername');
const loginPassword = $('loginPassword');
const loginMessage = $('loginMessage');
const logoutBtn = $('logoutBtn');

const clockInOverlay = $('clockInOverlay');
const clockInVideo = $('clockInVideo');
const clockInCanvas = $('clockInCanvas');
const clockInBtn = $('clockInBtn');
const clockInMessage = $('clockInMessage');

const totalProductsEl = $('totalProducts');
const totalSalesEl = $('totalSales');
const totalTransactionsEl = $('totalTransactions');
const dailyRevenueEl = $('dailyRevenue');
const weeklyRevenueEl = $('weeklyRevenue');
const monthlyRevenueEl = $('monthlyRevenue');
const walletBalanceEl = $('walletBalance');
const walletStatusText = $('walletStatusText');
const walletInflowEl = $('walletInflow');
const walletOutflowEl = $('walletOutflow');
const dashboardRevenueEl = $('dashboardRevenue');
const dashboardCashReceivedEl = $('dashboardCashReceived');
const dashboardOutstandingRevenueEl = $('dashboardOutstandingRevenue');
const dashboardProjectedBalanceWrap = $('dashboardProjectedBalanceWrap');
const dashboardProjectedBalanceEl = $('dashboardProjectedBalance');
const dashboardSalesChart = $('dashboardSalesChart');
const dashboardChartEmpty = $('dashboardChartEmpty');
const dashboardAdminSection = $('dashboardAdminSection');
const dashboardTopProductsBody = $('dashboardTopProductsBody');
const dashboardCustomerSalesBody = $('dashboardCustomerSalesBody');
const dashboardStaffClockInBody = $('dashboardStaffClockInBody');
const dashboardDebtorsBody = $('dashboardDebtorsBody');
const recentActivitiesList = $('recentActivitiesList');
const lowStockListEl = $('lowStockList');
const clockInGallery = $('clockInGallery');
const clockInDateFilter = $('clockInDateFilter');
const clockInViewerModal = $('clockInViewerModal');
const clockInViewerImage = $('clockInViewerImage');
const clockInViewerMeta = $('clockInViewerMeta');
const clockInViewerCloseBtn = $('clockInViewerCloseBtn');

const searchInput = $('searchInput');
const filterCategory = $('filterCategory');
const filterSupplier = $('filterSupplier');
const productForm = $('productForm');
const productFormTitle = $('productFormTitle');
const productIdInput = $('productId');
const nameInput = $('name');
const categoryIdInput = $('categoryId');
const supplierIdInput = $('supplierId');
const minStockInput = $('minStock');
const priceInput = $('price');
const quantityInput = $('quantity');
const cancelEditBtn = $('cancelEditBtn');
const productsTableBody = $('productsTableBody');
const saleForm = $('saleForm');
const saleProductIdInput = $('saleProductId');
const saleCustomerIdInput = $('saleCustomerId');
const saleQuantityInput = $('saleQuantity');
const saleAmountPaidInput = $('saleAmountPaid');

const categoryForm = $('categoryForm');
const categoryIdField = $('categoryIdField');
const categoryName = $('categoryName');
const categoriesTableBody = $('categoriesTableBody');
const supplierForm = $('supplierForm');
const supplierIdField = $('supplierIdField');
const supplierName = $('supplierName');
const supplierContact = $('supplierContact');
const suppliersTableBody = $('suppliersTableBody');
const customerForm = $('customerForm');
const customerIdField = $('customerIdField');
const customerName = $('customerName');
const customerPhone = $('customerPhone');
const customerEmail = $('customerEmail');
const customersTableBody = $('customersTableBody');

const expenseForm = $('expenseForm');
const expenseVendorId = $('expenseVendorId');
const expenseNewVendorName = $('expenseNewVendorName');
const expenseNewVendorType = $('expenseNewVendorType');
const addVendorQuickBtn = $('addVendorQuickBtn');
const expenseCategoryId = $('expenseCategoryId');
const expenseCategoryName = $('expenseCategoryName');
const addExpenseCategoryBtn = $('addExpenseCategoryBtn');
const expenseAmount = $('expenseAmount');
const expenseDate = $('expenseDate');
const expenseDescription = $('expenseDescription');
const expensesTableBody = $('expensesTableBody');
const vendorsTableBody = $('vendorsTableBody');

const incomeForm = $('incomeForm');
const incomeCategoryId = $('incomeCategoryId');
const incomeCategoryName = $('incomeCategoryName');
const addIncomeCategoryBtn = $('addIncomeCategoryBtn');
const incomeAmount = $('incomeAmount');
const incomeDate = $('incomeDate');
const incomeSourceName = $('incomeSourceName');
const incomeDescription = $('incomeDescription');
const incomeTableBody = $('incomeTableBody');

const cashflowBalance = $('cashflowBalance');
const cashflowIn = $('cashflowIn');
const cashflowOut = $('cashflowOut');
const transactionsTableBody = $('transactionsTableBody');
const invoiceForm = $('invoiceForm');
const invoiceType = $('invoiceType');
const invoiceStatus = $('invoiceStatus');
const invoiceDate = $('invoiceDate');
const invoiceNumber = $('invoiceNumber');
const invoiceRegenerateBtn = $('invoiceRegenerateBtn');
const invoiceCustomerId = $('invoiceCustomerId');
const invoiceProductId = $('invoiceProductId');
const invoiceItemQty = $('invoiceItemQty');
const invoiceTaxPercent = $('invoiceTaxPercent');
const invoiceDiscountAmount = $('invoiceDiscountAmount');
const invoiceAmountPaid = $('invoiceAmountPaid');
const invoiceValidityPeriod = $('invoiceValidityPeriod');
const invoiceNotes = $('invoiceNotes');
const invoiceUseDefaultTax = $('invoiceUseDefaultTax');
const addInvoiceItemBtn = $('addInvoiceItemBtn');
const invoiceItemsBody = $('invoiceItemsBody');
const invoiceGrandTotal = $('invoiceGrandTotal');
const invoiceAmountPaidDisplay = $('invoiceAmountPaidDisplay');
const invoiceBalanceDisplay = $('invoiceBalanceDisplay');
const invoicePaymentStatusDisplay = $('invoicePaymentStatusDisplay');
const saveInvoiceBtn = $('saveInvoiceBtn');
const saveAndPrintInvoiceBtn = $('saveAndPrintInvoiceBtn');
const clearInvoiceDraftBtn = $('clearInvoiceDraftBtn');
const invoicePreview = $('invoicePreview');
const downloadPreviewPdfBtn = $('downloadPreviewPdfBtn');
const invoicesTableBody = $('invoicesTableBody');
const invoicePaymentHistoryBody = $('invoicePaymentHistoryBody');

const reportPeriod = $('reportPeriod');
const reportPaymentStatus = $('reportPaymentStatus');
const generateReportBtn = $('generateReportBtn');
const exportReportBtn = $('exportReportBtn');
const reportRangeLabel = $('reportRangeLabel');
const reportTotalRevenue = $('reportTotalRevenue');
const reportTotalTransactions = $('reportTotalTransactions');
const reportTotalItems = $('reportTotalItems');
const reportTopProductsBody = $('reportTopProductsBody');
const reportCustomerSalesBody = $('reportCustomerSalesBody');
const reportInvoicePaymentsBody = $('reportInvoicePaymentsBody');
const reportTotalExpenses = $('reportTotalExpenses');
const reportTotalExtraIncome = $('reportTotalExtraIncome');
const reportNetCashflow = $('reportNetCashflow');
const reportTotalEarnedRevenue = $('reportTotalEarnedRevenue');
const reportTotalCashReceived = $('reportTotalCashReceived');
const reportTotalOutstandingRevenue = $('reportTotalOutstandingRevenue');
const reportCombinedNetProfit = $('reportCombinedNetProfit');
const reportRevenueByCustomerBody = $('reportRevenueByCustomerBody');
const reportExpenseByCategoryBody = $('reportExpenseByCategoryBody');
const reportExpenseByVendorBody = $('reportExpenseByVendorBody');
const reportIncomeByCategoryBody = $('reportIncomeByCategoryBody');
const reportsSection = $('section-reports');
const dashboardSection = $('section-dashboard');

const companyCreateForm = $('companyCreateForm');
const newCompanyName = $('newCompanyName');
const newCompanyIndustryType = $('newCompanyIndustryType');
const newCompanyInitialBalance = $('newCompanyInitialBalance');
const newCompanyIndustryConfirm = $('newCompanyIndustryConfirm');
const companyForm = $('companyForm');
const companyName = $('companyName');
const companyAddress = $('companyAddress');
const companyPhone = $('companyPhone');
const companyEmail = $('companyEmail');
const companyBankName = $('companyBankName');
const companyAccountNumber = $('companyAccountNumber');
const companyPaymentMethods = $('companyPaymentMethods');
const companyPrimaryColor = $('companyPrimaryColor');
const companyIndustryType = $('companyIndustryType');
const companyLogoPath = $('companyLogoPath');
const companySignaturePath = $('companySignaturePath');
const companyLogoPreview = $('companyLogoPreview');
const companySignaturePreview = $('companySignaturePreview');
const uploadLogoBtn = $('uploadLogoBtn');
const uploadSignatureBtn = $('uploadSignatureBtn');

const userForm = $('userForm');
const userIdField = $('userIdField');
const userUsername = $('userUsername');
const userPassword = $('userPassword');
const userIsAdmin = $('userIsAdmin');
const userBusinessRole = $('userBusinessRole');
const userRoleId = $('userRoleId');
const userIsActive = $('userIsActive');
const userAssignedCompanies = $('userAssignedCompanies');
const usersTableBody = $('usersTableBody');
const userProfilePreview = $('userProfilePreview');
const userUploadProfileBtn = $('userUploadProfileBtn');
const roleForm = $('roleForm');
const roleIdField = $('roleIdField');
const roleName = $('roleName');
const rolePermissionsGrid = $('rolePermissionsGrid');
const roleCancelBtn = $('roleCancelBtn');
const rolesTableBody = $('rolesTableBody');

const backupBtn = $('backupBtn');
const restoreBtn = $('restoreBtn');
const autoBackupNowBtn = $('autoBackupNowBtn');
const systemConfigForm = $('systemConfigForm');
const systemIndustryType = $('systemIndustryType');
const systemEnabledModules = $('systemEnabledModules');
const systemSyncEnabled = $('systemSyncEnabled');
const invoiceSettingsForm = $('invoiceSettingsForm');
const settingsDefaultTaxRate = $('settingsDefaultTaxRate');
const settingsTermsConditions = $('settingsTermsConditions');
const settingsIncludeRevenueBalanceView = $('settingsIncludeRevenueBalanceView');
const emailSettingsForm = $('emailSettingsForm');
const emailSmtpHost = $('emailSmtpHost');
const emailSmtpPort = $('emailSmtpPort');
const emailSmtpUser = $('emailSmtpUser');
const emailSmtpPass = $('emailSmtpPass');
const emailSmtpSecure = $('emailSmtpSecure');
const testEmailConnectionBtn = $('testEmailConnectionBtn');
const sendTestEmailBtn = $('sendTestEmailBtn');
const createUserForm = $('createUserForm');
const newUsername = $('newUsername');
const newPassword = $('newPassword');
const changePasswordForm = $('changePasswordForm');
const currentPassword = $('currentPassword');
const changeNewPassword = $('changeNewPassword');
const confirmNewPassword = $('confirmNewPassword');
const passwordStrength = $('passwordStrength');
const posToggleBtn = $('posToggleBtn');
const posForm = $('posForm');
const posProductId = $('posProductId');
const posQty = $('posQty');
const roomForm = $('roomForm');
const roomNumber = $('roomNumber');
const roomType = $('roomType');
const roomRate = $('roomRate');
const roomsTableBody = $('roomsTableBody');
const guestForm = $('guestForm');
const guestName = $('guestName');
const guestPhone = $('guestPhone');
const guestEmail = $('guestEmail');
const guestNotes = $('guestNotes');
const guestsTableBody = $('guestsTableBody');
const bookingForm = $('bookingForm');
const bookingRoomId = $('bookingRoomId');
const bookingGuestId = $('bookingGuestId');
const bookingCheckInDate = $('bookingCheckInDate');
const bookingCheckOutDate = $('bookingCheckOutDate');
const bookingNotes = $('bookingNotes');
const bookingsTableBody = $('bookingsTableBody');
const patientForm = $('patientForm');
const patientName = $('patientName');
const patientPhone = $('patientPhone');
const patientNotes = $('patientNotes');
const patientsTableBody = $('patientsTableBody');
const drugExpiryTableBody = $('drugExpiryTableBody');

const navSvgs = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="5"/><rect x="13" y="10" width="8" height="11"/><rect x="3" y="13" width="8" height="8"/></svg>',
  products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
  sales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5h16v14H4z"/><path d="M8 15l3-3 2 2 3-4"/></svg>',
  categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
  suppliers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18v12H3z"/><path d="M7 7V4h10v3"/></svg>',
  customers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  expenses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  vendors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 11h1M14 11h1M9 15h1M14 15h1"/></svg>',
  income: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20"/><path d="M7 7c0-2.2 2.2-4 5-4s5 1.8 5 4-2.2 4-5 4-5 1.8-5 4 2.2 4 5 4 5-1.8 5-4"/></svg>',
  cashflow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h6l2-4 4 8 2-4h4"/></svg>',
  invoices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  clockin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5h16v14H4z"/><path d="M8 15l2-2 2 1 4-4"/></svg>',
  company: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 11h6"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c1.2-3 3.3-5 6-5s4.8 2 6 5"/><path d="M14 20c.8-2 2.2-3.3 4-3.8"/></svg>',
  roles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9h.2a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1V9c0 .4.2.7.6.9H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z"/></svg>'
};

const adminExtras = [
  { key: 'users', name: 'Users', route: '/users', icon: 'users' },
  { key: 'settings', name: 'Company Settings', route: '/company-settings', icon: 'settings' },
  { key: 'create_company', name: 'Create Company', route: '/create-company', icon: 'company' }
];

const routeToSection = {
  '/dashboard': 'dashboard',
  '/products': 'products',
  '/inventory': 'products',
  '/sales': 'products',
  '/pos': 'pos',
  '/customers': 'customers',
  '/rooms': 'rooms',
  '/bookings': 'bookings',
  '/guests': 'guests',
  '/kitchen': 'products',
  '/billing': 'invoices',
  '/drugs': 'products',
  '/patients': 'patients',
  '/prescriptions': 'patients',
  '/expiry': 'drugexpiry',
  '/transactions': 'cashflow',
  '/reports': 'reports',
  '/expenses': 'expenses',
  '/users': 'users',
  '/company-settings': 'company',
  '/create-company': 'company',
  '/settings': 'settings',
  '/invoices': 'invoices'
};

const sectionToMenuKey = {
  dashboard: 'dashboard',
  products: 'inventory',
  categories: 'inventory',
  suppliers: 'inventory',
  customers: 'customers',
  pos: 'pos',
  invoices: 'billing',
  expenses: 'expenses',
  vendors: 'expenses',
  income: 'transactions',
  cashflow: 'transactions',
  clockin: 'dashboard',
  reports: 'reports',
  company: 'settings',
  users: 'users',
  roles: 'settings',
  settings: 'settings',
  rooms: 'rooms',
  bookings: 'bookings',
  guests: 'guests',
  patients: 'patients',
  drugexpiry: 'expiry_tracking'
};

const sectionPermissionModule = {
  dashboard: 'dashboard',
  products: 'products',
  categories: 'categories',
  suppliers: 'suppliers',
  customers: 'customers',
  pos: 'sales',
  invoices: 'invoices',
  expenses: 'expenses',
  vendors: 'vendors',
  income: 'income',
  cashflow: 'cashflow',
  clockin: 'dashboard',
  reports: 'reports',
  company: 'company',
  users: 'users',
  roles: 'roles',
  settings: 'settings',
  rooms: 'company',
  bookings: 'company',
  guests: 'customers',
  patients: 'customers',
  drugexpiry: 'products'
};

const iconCache = new Map();

const menuItemMeta = {
  // Label/icon metadata for custom top menu items.
  'new-invoice': { label: 'New Invoice', icon: navSvgs.invoices },
  'new-sale': { label: 'New Sale', icon: navSvgs.products },
  'company-setup': { label: 'Company Setup', icon: navSvgs.company },
  'backup-db': { label: 'Backup Database', icon: navSvgs.settings },
  'exit-app': { label: 'Exit', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>' },
  undo: { label: 'Undo', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 14L4 9l5-5"/><path d="M20 20a8 8 0 00-8-8H4"/></svg>' },
  redo: { label: 'Redo', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 14l5-5-5-5"/><path d="M4 20a8 8 0 018-8h8"/></svg>' },
  cut: { label: 'Cut', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8.12 8.12L20 20"/><path d="M20 4L8.12 15.88"/></svg>' },
  copy: { label: 'Copy', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>' },
  paste: { label: 'Paste', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2h8v4H8z"/><path d="M5 6h14v16H5z"/></svg>' },
  delete: { label: 'Delete', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>' },
  'view-dashboard': { label: 'Dashboard', icon: navSvgs.dashboard },
  'view-products': { label: 'Products', icon: navSvgs.products },
  'view-customers': { label: 'Customers', icon: navSvgs.customers },
  'view-suppliers': { label: 'Suppliers', icon: navSvgs.suppliers },
  'view-reports': { label: 'Reports', icon: navSvgs.reports },
  refresh: { label: 'Refresh', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.13-3.36L23 10"/><path d="M1 14l5.36 4.36A9 9 0 0020.49 15"/></svg>' },
  'window-minimize': { label: 'Minimize', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14"/></svg>' },
  'window-maximize': { label: 'Maximize', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16"/></svg>' },
  'window-fullscreen': { label: 'Fullscreen', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H3v5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="M16 21h5v-5"/></svg>' },
  'window-check-updates': { label: 'Check for Updates', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 3v6h-6"/></svg>' },
  'window-devtools': { label: 'Developer Tools', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18l-6-6 6-6"/><path d="M15 6l6 6-6 6"/></svg>' },
  documentation: { label: 'Documentation', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v18H6.5A2.5 2.5 0 014 17.5V4.5A2.5 2.5 0 016.5 2z"/></svg>' },
  about: { label: 'About ASW Inventory', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' }
};

const currency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
const fileUrl = (p) => encodeURI(`file:///${String(p || '').replace(/\\/g, '/')}`);
const isEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const permissionModules = ['dashboard', 'products', 'sales', 'categories', 'suppliers', 'customers', 'invoices', 'reports', 'company', 'users', 'roles', 'settings', 'expenses', 'vendors', 'income', 'cashflow'];
const permissionActions = ['view', 'create', 'edit', 'delete', 'print'];

function can(moduleName, action = 'view') {
  if (!state.session?.authenticated) return false;
  if (state.session?.user?.isAdmin || String(state.session?.user?.username || '').toLowerCase() === 'admin') return true;
  return Boolean(state.session?.user?.permissions?.[moduleName]?.[action]);
}

function buildRolePermissionsFromForm() {
  const perms = {};
  permissionModules.forEach((moduleName) => {
    perms[moduleName] = {};
    permissionActions.forEach((action) => {
      const box = document.querySelector(`#rolePermissionsGrid input[data-module="${moduleName}"][data-action="${action}"]`);
      perms[moduleName][action] = Boolean(box?.checked);
    });
  });
  return perms;
}

function renderRolePermissionGrid(values = {}) {
  if (!rolePermissionsGrid) return;
  rolePermissionsGrid.innerHTML = '';
  permissionModules.forEach((moduleName) => {
    const row = document.createElement('div');
    row.className = 'role-permission-row';
    row.innerHTML = `<span class="role-permission-module">${moduleName}</span>`;
    permissionActions.forEach((action) => {
      const checked = Boolean(values?.[moduleName]?.[action]);
      row.insertAdjacentHTML(
        'beforeend',
        `<label class="role-permission-check"><input type="checkbox" data-module="${moduleName}" data-action="${action}" ${checked ? 'checked' : ''} />${action}</label>`
      );
    });
    rolePermissionsGrid.appendChild(row);
  });
}

function showStatus(message, tone = 'success') {
  statusMessageEl.textContent = message;
  statusMessageEl.classList.remove('error', 'warning');
  if (tone === 'error') statusMessageEl.classList.add('error');
  if (tone === 'warning') statusMessageEl.classList.add('warning');
}

const formPopupState = {
  active: false,
  card: null,
  placeholder: null
};

function openFormPopup(card, title = 'Form') {
  if (!formPopupOverlay || !formPopupBody || !card) return;
  if (formPopupState.active) closeFormPopup();
  const ph = document.createComment('form-popup-placeholder');
  card.parentNode?.insertBefore(ph, card);
  formPopupBody.appendChild(card);
  formPopupTitle.textContent = title;
  formPopupOverlay.classList.add('active');
  formPopupState.active = true;
  formPopupState.card = card;
  formPopupState.placeholder = ph;
}

function closeFormPopup() {
  if (!formPopupState.active) return;
  const { card, placeholder } = formPopupState;
  if (card && placeholder?.parentNode) {
    placeholder.parentNode.insertBefore(card, placeholder);
    placeholder.remove();
  }
  formPopupOverlay?.classList.remove('active');
  formPopupState.active = false;
  formPopupState.card = null;
  formPopupState.placeholder = null;
}

function formCardOf(formEl) {
  return formEl?.closest('.panel-card') || null;
}

function attachFormPopupLauncher(formEl, label) {
  const card = formCardOf(formEl);
  if (!card) return;
  const titleEl = card.querySelector('.panel-title');
  if (!titleEl || titleEl.querySelector('[data-popup-launcher]')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-outline-secondary ms-2';
  btn.textContent = `Add (${label})`;
  btn.setAttribute('data-popup-launcher', '1');
  btn.addEventListener('click', () => openFormPopup(card, label));
  titleEl.appendChild(btn);
}

function initPopupFormLaunchers() {
  attachFormPopupLauncher(productForm, 'Product Form');
  attachFormPopupLauncher(categoryForm, 'Category Form');
  attachFormPopupLauncher(supplierForm, 'Supplier Form');
  attachFormPopupLauncher(customerForm, 'Customer Form');
  attachFormPopupLauncher(invoiceForm, 'Invoice Form');
  attachFormPopupLauncher(expenseForm, 'Expense Form');
  attachFormPopupLauncher(incomeForm, 'Income Form');
  attachFormPopupLauncher(userForm, 'User Form');
  attachFormPopupLauncher(roleForm, 'Role Form');
}

function renderUpdateState(payload = {}) {
  if (!updateBanner || !updateMessage || !updateProgress || !restartInstallBtn) return;
  const stateValue = String(payload.state || 'idle');
  const message = String(payload.message || '');
  const progressValue = Number(payload.progress);
  const hasProgress = Number.isFinite(progressValue) && progressValue >= 0;
  const hiddenStates = new Set(['idle', 'disabled']);
  const shouldHide = hiddenStates.has(stateValue) && !payload.updateReady;
  updateBanner.hidden = shouldHide;
  updateMessage.textContent = message || 'Updater idle.';
  updateProgress.textContent = hasProgress ? `${progressValue.toFixed(1)}%` : '';
  restartInstallBtn.hidden = !Boolean(payload.updateReady);

  if (stateValue === 'checking') {
    showStatus('Checking for updates...', 'warning');
  } else if (stateValue === 'available') {
    showStatus('Update available. Downloading in background...', 'warning');
  } else if (stateValue === 'downloading') {
    const pctLabel = hasProgress ? `${progressValue.toFixed(1)}%` : '';
    showStatus(`Downloading update... ${pctLabel}`.trim(), 'warning');
  } else if (stateValue === 'not-available' && manualUpdateCheckRequested) {
    showStatus('No update available right now.', 'warning');
    window.alert('No update found. You are on the latest version.');
    manualUpdateCheckRequested = false;
  } else if (stateValue === 'downloaded') {
    showStatus('Update downloaded. Restart to install.');
    const noticeKey = `${message}|${payload.progress}|${payload.updateReady}`;
    if (lastDownloadedNoticeKey !== noticeKey) {
      lastDownloadedNoticeKey = noticeKey;
      const shouldRestart = window.confirm('Update downloaded successfully. Restart now to install it?');
      if (shouldRestart) {
        restartInstallBtn?.click();
      } else {
        window.alert('You can install later using "Restart & Install Update".');
      }
    }
    manualUpdateCheckRequested = false;
  } else if (stateValue === 'error') {
    showStatus(message || 'Update check failed.', 'error');
    if (manualUpdateCheckRequested) {
      window.alert(message || 'Update check failed. Please try again when online.');
    }
    manualUpdateCheckRequested = false;
  }
  lastUpdateState = stateValue;
}

function getAvatarPath(pathValue) {
  if (pathValue) return fileUrl(pathValue);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#e2e8f0"/><circle cx="32" cy="24" r="12" fill="#94a3b8"/><rect x="14" y="40" width="36" height="16" rx="8" fill="#94a3b8"/></svg>');
}

function initialsFor(name) {
  const txt = String(name || '').trim();
  if (!txt) return 'U';
  return txt.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'U';
}

function setImgOrPlaceholder(imgEl, srcPath, label = 'User') {
  const src = getAvatarPath(srcPath);
  if (src) {
    imgEl.src = src;
    imgEl.alt = label;
  } else {
    imgEl.removeAttribute('src');
    imgEl.alt = initialsFor(label);
  }
}

function normalizeIndustry(value) {
  const industry = String(value || '').trim().toLowerCase();
  return ['general', 'retail', 'hospitality', 'medical'].includes(industry) ? industry : 'general';
}

function normalizeUserRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return ['admin', 'manager', 'staff'].includes(role) ? role : 'admin';
}

function getCurrentUserRole() {
  const companyRole = String(state.session?.activeCompanyRole || '').trim().toLowerCase();
  if (companyRole === 'admin' || companyRole === 'staff') return companyRole;
  return normalizeUserRole(state.currentUserRole || state.session?.user?.userRole || (state.session?.user?.isAdmin ? 'admin' : 'manager'));
}

function getCurrentIndustry() {
  if (!ENABLE_MULTI_INDUSTRY) return "retail";
  const sessionIndustry = normalizeIndustry(state.currentIndustry || '');
  if (sessionIndustry !== 'general' || !state.session?.authenticated) return sessionIndustry;
  return normalizeIndustry(state.company?.industryType || state.systemConfig?.industryType || state.moduleConfig?.industry || 'general');
}

function getSectionButtons() {
  return Array.from(sidebarNav?.querySelectorAll('.nav-link') || []);
}

function normalizeMenuItem(rawItem) {
  if (!rawItem) return null;
  if (typeof rawItem === 'string') {
    const legacyRoute = rawItem === 'inventory' ? '/products' : `/${rawItem}`;
    return { key: rawItem, name: rawItem.replace(/_/g, ' '), route: legacyRoute, icon: rawItem, roles: ['admin', 'manager', 'staff'] };
  }
  const route = String(rawItem.route || '').trim().toLowerCase();
  if (!route) return null;
  const roles = Array.isArray(rawItem.roles) && rawItem.roles.length
    ? rawItem.roles.map((x) => normalizeUserRole(x))
    : ['admin', 'manager', 'staff'];
  return {
    key: String(rawItem.key || rawItem.name || route).trim().toLowerCase().replace(/\s+/g, '_'),
    name: String(rawItem.name || 'Menu').trim(),
    route,
    icon: String(rawItem.icon || 'dashboard').trim().toLowerCase(),
    roles
  };
}

function removeDuplicatesByName(menuItems = []) {
  const seen = new Set();
  const unique = [];
  for (const item of menuItems) {
    const nameKey = String(item?.name || '').trim().toLowerCase();
    if (!nameKey || seen.has(nameKey)) continue;
    seen.add(nameKey);
    unique.push(item);
  }
  return unique;
}

function mapMenuKeyForRole(item) {
  const key = String(item?.key || '').trim().toLowerCase();
  if (!key) return '';
  if (key === 'create_company') return 'settings';
  if (key === 'billing') return 'invoices';
  if (key === 'transactions') return 'cashflow';
  return key;
}

function getPermissionModuleForMenuItem(item) {
  const key = mapMenuKeyForRole(item);
  const lookup = {
    dashboard: 'dashboard',
    inventory: 'products',
    sales: 'sales',
    pos: 'sales',
    customers: 'customers',
    rooms: 'company',
    bookings: 'company',
    guests: 'customers',
    kitchen_inventory: 'products',
    billing: 'invoices',
    invoices: 'invoices',
    drug_inventory: 'products',
    patients: 'customers',
    prescriptions: 'customers',
    expiry_tracking: 'products',
    transactions: 'cashflow',
    expenses: 'expenses',
    reports: 'reports',
    users: 'users',
    settings: 'company'
  };
  return lookup[key] || 'dashboard';
}

function getAllowedMenuItems() {
  const cfg = sidebarConfig || {};
  const industry = getCurrentIndustry();
  const selected = Array.isArray(cfg[industry]) ? cfg[industry] : [];
  const fallback = Array.isArray(cfg.general) ? cfg.general : [{ key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home', roles: ['admin', 'manager', 'staff'] }];
  const baseMenus = (selected.length ? selected : fallback).map(normalizeMenuItem).filter(Boolean);
  const role = getCurrentUserRole();
  const roleFiltered = baseMenus.filter((item) => Array.isArray(item.roles) && item.roles.includes(role));
  const withExtras = role === 'admin'
    ? roleFiltered.concat(adminExtras.map(normalizeMenuItem).filter(Boolean))
    : roleFiltered;
  const deduped = removeDuplicatesByName(withExtras);
  if (deduped.length) return deduped;
  return [{ key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home', roles: ['admin', 'manager', 'staff'] }];
}

function getAllowedMenuKeys() {
  return getAllowedMenuItems().map((item) => item.key);
}

function getAllowedSections() {
  const sections = getAllowedMenuItems().map((item) => routeToSection[item.route]).filter(Boolean);
  if (!sections.length) return new Set(['dashboard']);
  return new Set(sections);
}

function isSectionAllowed(sectionName) {
  return getAllowedSections().has(sectionName);
}

function getAllowedDashboardWidgets() {
  const cfg = dashboardConfig || {};
  const industry = getCurrentIndustry();
  const selected = Array.isArray(cfg[industry]) ? cfg[industry] : [];
  const fallback = Array.isArray(cfg.general) ? cfg.general : ['wallet_balance'];
  const industryWidgets = selected.length ? selected : fallback;
  const role = getCurrentUserRole();
  const roleWidgetMap = {
    admin: ['*'],
    manager: ['wallet_balance', 'total_sales', 'today_sales', 'expenses', 'recent_transactions', 'top_products', 'low_stock_alert', 'recent_sales', 'active_bookings', 'room_occupancy', 'today_checkins', 'today_checkouts', 'patients_today', 'low_drug_stock', 'expiring_drugs'],
    staff: ['today_sales', 'recent_sales', 'wallet_balance']
  };
  const allowedByRole = roleWidgetMap[role] || ['wallet_balance'];
  const widgets = industryWidgets.filter((w) => allowedByRole.includes('*') || allowedByRole.includes(w));
  return widgets.length ? widgets : ['wallet_balance'];
}

function getAllowedReports() {
  const cfg = reportConfig || {};
  const industry = getCurrentIndustry();
  const selected = Array.isArray(cfg[industry]) ? cfg[industry] : [];
  const fallback = Array.isArray(cfg.general) ? cfg.general : ['sales_report'];
  const reports = selected.length ? selected : fallback;
  return reports.length ? reports : ['sales_report'];
}

function routeForSection(sectionName) {
  const match = getAllowedMenuItems().find((item) => routeToSection[item.route] === sectionName);
  if (match?.route) return match.route;
  if (sectionName === 'company') return '/company-settings';
  if (sectionName === 'users') return '/users';
  if (sectionName === 'reports') return '/reports';
  return '/dashboard';
}

function sectionRoute(sectionName) {
  return routeForSection(sectionName);
}

function sectionFromRoute(routePath) {
  const route = String(routePath || '').trim().toLowerCase();
  return routeToSection[route] || null;
}

function getIconSvg(iconFile) {
  const file = String(iconFile || '').trim();
  if (!file) return null;
  if (iconCache.has(file)) return iconCache.get(file);
  if (!nodeFs || !nodePath) {
    iconCache.set(file, null);
    return null;
  }
  try {
    const iconPath = nodePath.join(process.cwd(), 'assets', 'icons', file);
    if (!nodeFs.existsSync(iconPath)) {
      iconCache.set(file, null);
      return null;
    }
    const svg = nodeFs.readFileSync(iconPath, 'utf8');
    iconCache.set(file, svg);
    return svg;
  } catch {
    iconCache.set(file, null);
    return null;
  }
}

function applyNavIcons() {
  document.querySelectorAll('.nav-icon[data-icon]').forEach((el) => {
    const iconName = String(el.dataset.icon || '').trim().toLowerCase();
    const fileIcon = getIconSvg(iconName.endsWith('.svg') ? iconName : `${iconName}.svg`);
    const iconFallbackMap = {
      home: 'dashboard',
      box: 'products',
      cart: 'sales',
      users: 'users',
      chart: 'reports',
      bed: 'company',
      calendar: 'company',
      user: 'customers',
      food: 'products',
      pill: 'products',
      file: 'invoices',
      alert: 'reports',
      money: 'expenses',
      settings: 'settings',
      company: 'company'
    };
    const navKey = iconFallbackMap[iconName] || iconName;
    const icon = fileIcon || navSvgs[navKey] || navSvgs.dashboard;
    el.innerHTML = icon;
  });
}

function applyProMenuLabelsAndIcons() {
  if (!proMenu) return;
  proMenu.querySelectorAll('.menu-item[data-menu-action]').forEach((item) => {
    const key = item.dataset.menuAction;
    const meta = menuItemMeta[key];
    if (!meta) return;
    item.innerHTML = `<span class="menu-item-icon">${meta.icon}</span><span>${meta.label}</span>`;
  });
}

function closeProMenu() {
  if (!proMenu) return;
  proMenu.querySelectorAll('.menu-group').forEach((group) => group.classList.remove('open'));
  proMenu.querySelectorAll('.menu-root-btn').forEach((btn) => btn.classList.remove('active'));
}

function openProMenu(rootBtn) {
  if (!proMenu || !rootBtn) return;
  const parent = rootBtn.closest('.menu-group');
  const isOpen = parent?.classList.contains('open');
  closeProMenu();
  if (isOpen || !parent) return;
  parent.classList.add('open');
  rootBtn.classList.add('active');
}

function setActiveMenuAction(action) {
  if (!proMenu) return;
  proMenu.querySelectorAll('.menu-item[data-menu-action]').forEach((item) => {
    item.classList.toggle('active', item.dataset.menuAction === action);
  });
}

function runEditCommand(cmd) {
  try {
    document.execCommand(cmd);
  } catch {
    // Keep behavior silent if browser blocks specific command.
  }
}

async function runBackupDatabase() {
  const r = await api.backupDatabase();
  if (r.cancelled) {
    showStatus('Backup cancelled.', 'warning');
    return;
  }
  showStatus(`Backup saved to ${r.destinationPath}`);
}

async function handleMenuAction(action) {
  if (!action) return;
  setActiveMenuAction(action);
  if (action === 'new-invoice') {
    setActiveSection('invoices');
    await resetInvoiceDraft();
    showStatus('New invoice draft ready.');
    return;
  }
  if (action === 'new-sale') {
    setActiveSection('products');
    saleProductIdInput?.focus();
    showStatus('Ready to record new sale.');
    return;
  }
  if (action === 'company-setup') { setActiveSection('company'); return; }
  if (action === 'backup-db') { await runBackupDatabase(); return; }
  if (action === 'exit-app') { await api.quitApp?.(); return; }
  if (action === 'undo' || action === 'redo' || action === 'cut' || action === 'copy' || action === 'paste' || action === 'delete') {
    runEditCommand(action === 'delete' ? 'delete' : action);
    return;
  }
  if (action === 'view-dashboard') { setActiveSection('dashboard'); return; }
  if (action === 'view-products') { setActiveSection('products'); return; }
  if (action === 'view-customers') { setActiveSection('customers'); return; }
  if (action === 'view-suppliers') { setActiveSection('suppliers'); return; }
  if (action === 'view-reports') { setActiveSection('reports'); return; }
  if (action === 'refresh') { await api.windowAction?.('refresh'); return; }
  if (action === 'window-minimize') { await api.windowAction?.('minimize'); return; }
  if (action === 'window-maximize') { await api.windowAction?.('maximize'); return; }
  if (action === 'window-fullscreen') { await api.windowAction?.('fullscreen'); return; }
  if (action === 'window-check-updates') {
    manualUpdateCheckRequested = true;
    const result = await api.checkForUpdates?.();
    if (result?.reason === 'offline') {
      showStatus('Offline: update check skipped.', 'warning');
      window.alert('You are offline. Connect to the internet and try again.');
      manualUpdateCheckRequested = false;
    } else if (result?.reason === 'dev') {
      showStatus(result?.message || 'Updater is not available in this mode.', 'warning');
      manualUpdateCheckRequested = false;
    }
    else showStatus('Manual update check started.');
    return;
  }
  if (action === 'window-devtools') { await api.windowAction?.('devtools'); return; }
  if (action === 'documentation') { await api.openDocumentation?.(); return; }
  if (action === 'about') {
    const info = await api.getAppInfo?.();
    aboutMetaText.textContent = `${info?.name || 'ASW Inventory'} v${info?.version || ''} | Author: ${info?.author || 'ASW'} | License: ${info?.license || 'ISC'}`;
    aboutModal.classList.add('active');
  }
}

function setActiveSection(name) {
  const allowed = isSectionAllowed(name);
  const requested = allowed ? name : 'dashboard';
  const sectionButtons = getSectionButtons();
  const target = sectionButtons.find((b) => b.dataset.section === requested && b.style.display !== 'none');
  const safeName = target ? requested : (sectionButtons.find((b) => b.style.display !== 'none')?.dataset.section || 'dashboard');
  for (const b of sectionButtons) b.classList.toggle('active', b.dataset.section === safeName);
  for (const s of sections) s.classList.toggle('active', s.id === `section-${safeName}`);
  const active = sectionButtons.find((b) => b.dataset.section === safeName);
  sectionTitle.textContent = active ? active.textContent : 'Dashboard';
  const route = sectionRoute(safeName);
  const nextHash = `#${route}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, '', nextHash);
  }
}

function buildSidebarMenu() {
  const labelMap = state.moduleConfig?.labelMap || {};
  return getAllowedMenuItems().map((item) => ({
    ...item,
    name: labelMap[item.key] || labelMap[item.name] || item.name,
    section: routeToSection[item.route] || 'dashboard'
  }));
}

function renderSectionAccess() {
  const menuItems = buildSidebarMenu();
  if (sidebarNav) {
    sidebarNav.innerHTML = '';
    const safeItems = menuItems.length ? menuItems : [{ key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home', roles: ['admin', 'manager', 'staff'], section: 'dashboard' }];
    safeItems.forEach((item) => {
      sidebarNav.insertAdjacentHTML(
        'beforeend',
        `<button class="nav-link" data-section="${item.section}" data-menu-key="${item.key}" data-route="${item.route}">
          <span class="nav-icon" data-icon="${item.icon}"></span>
          <span>${item.name}</span>
        </button>`
      );
    });
  }
  applyNavIcons();
  const sectionButtons = getSectionButtons();
  const activeVisible = sectionButtons.find((btn) => btn.classList.contains('active') && btn.style.display !== 'none');
  if (activeVisible) setActiveSection(activeVisible.dataset.section);
  else {
    const fallback = sectionButtons.find((btn) => btn.style.display !== 'none');
    if (fallback) setActiveSection(fallback.dataset.section);
  }
}

function updateAuthUi() {
  const authed = Boolean(state.session?.authenticated);
  loginOverlay.classList.toggle('active', !authed);
  currentUser.textContent = authed ? `Signed in: ${state.session.user.username}` : 'Not signed in';
  setImgOrPlaceholder(currentUserAvatar, state.session?.user?.profileImagePath || '', state.session?.user?.username || 'User');
  clockInOverlay.classList.toggle('active', authed && !state.session.clockedIn);
  if (!authed || !state.session?.clockedIn) stopDashboardLiveUpdates();
}

function applyFormAccess() {
  const toggle = (selector, enabled) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.disabled = !enabled;
      if (el instanceof HTMLButtonElement) el.style.display = enabled ? '' : 'none';
    });
  };
  toggle('#productForm input, #productForm select, #productForm button[type="submit"]', can('products', 'create') || can('products', 'edit'));
  toggle('#saleForm input, #saleForm select, #saleForm button[type="submit"]', can('sales', 'create'));
  toggle('#categoryForm input, #categoryForm button[type="submit"]', can('categories', 'create') || can('categories', 'edit'));
  toggle('#supplierForm input, #supplierForm textarea, #supplierForm button[type="submit"]', can('suppliers', 'create') || can('suppliers', 'edit'));
  toggle('#customerForm input, #customerForm button[type="submit"]', can('customers', 'create') || can('customers', 'edit'));
  toggle('#invoiceForm input, #invoiceForm select, #invoiceForm button', can('invoices', 'create'));
  toggle('#saveInvoiceBtn, #saveAndPrintInvoiceBtn', can('invoices', 'create'));
  toggle('#downloadPreviewPdfBtn', can('invoices', 'print'));
  toggle('#expenseForm input, #expenseForm select, #expenseForm button', can('expenses', 'create') || can('expenses', 'edit'));
  toggle('#incomeForm input, #incomeForm select, #incomeForm button', can('income', 'create') || can('income', 'edit'));
  if (addExpenseCategoryBtn) addExpenseCategoryBtn.style.display = (can('expenses', 'edit') && Boolean(state.session?.user?.isAdmin)) ? '' : 'none';
  if (addIncomeCategoryBtn) addIncomeCategoryBtn.style.display = (can('income', 'edit') && Boolean(state.session?.user?.isAdmin)) ? '' : 'none';
  toggle('#generateReportBtn', can('reports', 'view'));
  toggle('#exportReportBtn', can('reports', 'print'));
  toggle('#userForm input, #userForm select, #userForm button[type="submit"]', can('users', 'create') || can('users', 'edit'));
  toggle('#createUserForm input, #createUserForm button[type="submit"]', can('users', 'create'));
  toggle('#roleForm input, #roleForm button[type="submit"]', can('roles', 'create') || can('roles', 'edit'));
  toggle('#posForm input, #posForm select, #posForm button', can('sales', 'create'));
  toggle('#roomForm input, #roomForm button', can('company', 'edit'));
  toggle('#guestForm input, #guestForm textarea, #guestForm button', can('customers', 'create'));
  toggle('#bookingForm input, #bookingForm select, #bookingForm textarea, #bookingForm button', can('company', 'create'));
  toggle('#patientForm input, #patientForm button', can('customers', 'create'));
  if (systemConfigForm) systemConfigForm.style.display = state.session?.user?.isAdmin ? '' : 'none';
}

function renderCompanySwitcher() {
  companySwitcher.innerHTML = '';
  const links = Array.isArray(state.userCompanies) && state.userCompanies.length
    ? state.userCompanies
    : (state.companies || []).map((company) => ({ companyId: company.id, role: 'admin', company }));
  for (const link of links) {
    const company = link.company || {};
    const role = String(link.role || '').trim().toLowerCase();
    const roleLabel = role ? ` (${role})` : '';
    companySwitcher.insertAdjacentHTML('beforeend', `<option value="${company.id}">${company.name}${roleLabel}</option>`);
  }
  companySwitcher.value = String(state.session?.activeCompanyId || '');
}

function renderLookups() {
  const saved = {
    c: categoryIdInput.value,
    s: supplierIdInput.value,
    fc: filterCategory.value,
    fs: filterSupplier.value,
    sp: saleProductIdInput.value,
    sc: saleCustomerIdInput.value,
    ic: invoiceCustomerId.value,
    ip: invoiceProductId.value,
    ev: expenseVendorId?.value || '',
    ec: expenseCategoryId?.value || '',
    inc: incomeCategoryId?.value || ''
  };
  categoryIdInput.innerHTML = '<option value="">Uncategorized</option>';
  filterCategory.innerHTML = '<option value="">All Categories</option>';
  for (const c of state.categories) {
    categoryIdInput.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
    filterCategory.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  }
  supplierIdInput.innerHTML = '<option value="">No Supplier</option>';
  filterSupplier.innerHTML = '<option value="">All Suppliers</option>';
  for (const s of state.suppliers) {
    supplierIdInput.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.name}</option>`);
    filterSupplier.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.name}</option>`);
  }
  saleProductIdInput.innerHTML = '<option value="">Select Product</option>';
  for (const p of state.products) saleProductIdInput.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name} (${p.quantity} in stock)</option>`);
  invoiceProductId.innerHTML = '<option value="">Select Product</option>';
  for (const p of state.products) invoiceProductId.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name} (${currency(p.price)})</option>`);
  saleCustomerIdInput.innerHTML = '<option value="">Walk-in Customer</option>';
  for (const c of state.customers) saleCustomerIdInput.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  invoiceCustomerId.innerHTML = '<option value="">Select Customer</option>';
  for (const c of state.customers) invoiceCustomerId.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  if (expenseVendorId) {
    expenseVendorId.innerHTML = '<option value="">Select Vendor</option>';
    for (const v of state.vendors) expenseVendorId.insertAdjacentHTML('beforeend', `<option value="${v.id}">${v.name} (${v.type})</option>`);
  }
  if (expenseCategoryId) {
    expenseCategoryId.innerHTML = '<option value="">Select Category</option>';
    for (const c of state.expenseCategories) expenseCategoryId.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  }
  if (incomeCategoryId) {
    incomeCategoryId.innerHTML = '<option value="">Select Category</option>';
    for (const c of state.incomeCategories) incomeCategoryId.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  }
  categoryIdInput.value = saved.c;
  supplierIdInput.value = saved.s;
  filterCategory.value = saved.fc;
  filterSupplier.value = saved.fs;
  saleProductIdInput.value = saved.sp;
  saleCustomerIdInput.value = saved.sc;
  const preferredInvoiceCustomer = saved.ic || state.invoiceDraft.customerId || '';
  if (preferredInvoiceCustomer) invoiceCustomerId.value = preferredInvoiceCustomer;
  if (!invoiceCustomerId.value && state.customers.length) {
    invoiceCustomerId.value = String(state.customers[0].id);
    state.invoiceDraft.customerId = invoiceCustomerId.value;
  }
  invoiceProductId.value = saved.ip;
  if (expenseVendorId) expenseVendorId.value = saved.ev;
  if (expenseCategoryId) expenseCategoryId.value = saved.ec;
  if (incomeCategoryId) incomeCategoryId.value = saved.inc;
}

function renderProducts() {
  const q = searchInput.value.trim().toLowerCase();
  const cf = filterCategory.value;
  const sf = filterSupplier.value;
  const rows = state.products.filter((p) => {
    const qOk = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || String(p.supplierName || '').toLowerCase().includes(q);
    const cOk = !cf || String(p.categoryId || '') === cf;
    const sOk = !sf || String(p.supplierId || '') === sf;
    return qOk && cOk && sOk;
  });
  productsTableBody.innerHTML = '';
  if (!rows.length) return (productsTableBody.innerHTML = '<tr><td colspan="6">No products found.</td></tr>');
  for (const p of rows) productsTableBody.insertAdjacentHTML('beforeend', `<tr><td><div class="product-name-cell"><span class="product-name-main">${p.name}</span><span class="product-name-sub">ID #${p.id} | Min stock: ${p.minStock}</span></div></td><td>${p.category}</td><td>${p.supplierName || 'N/A'}</td><td>${currency(p.price)}</td><td><span class="${p.quantity <= p.minStock ? 'stock-pill low' : 'stock-pill'}">${p.quantity}</span></td><td>${can('products', 'edit') ? `<button class="btn btn-sm btn-outline-secondary" data-action="edit-product" data-id="${p.id}">Edit</button>` : ''} ${can('products', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-product" data-id="${p.id}">Delete</button>` : ''} ${can('sales', 'create') ? `<button class="btn btn-sm btn-outline-success" data-action="sell-product" data-id="${p.id}">Sell</button>` : ''}</td></tr>`);
}
function renderBasicTable(target, rows, colspan, emptyText) {
  target.innerHTML = '';
  if (!rows.length) target.innerHTML = `<tr><td colspan="${colspan}">${emptyText}</td></tr>`;
}

function renderCategories() {
  renderBasicTable(categoriesTableBody, state.categories, 3, 'No categories available.');
  for (const c of state.categories) categoriesTableBody.insertAdjacentHTML('beforeend', `<tr><td>${c.id}</td><td>${c.name}</td><td>${can('categories', 'edit') ? `<button class="btn btn-sm btn-outline-secondary" data-action="edit-category" data-id="${c.id}">Edit</button>` : ''} ${can('categories', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-category" data-id="${c.id}">Delete</button>` : ''}</td></tr>`);
}
function renderSuppliers() {
  renderBasicTable(suppliersTableBody, state.suppliers, 4, 'No suppliers available.');
  for (const s of state.suppliers) suppliersTableBody.insertAdjacentHTML('beforeend', `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.contactInfo || 'N/A'}</td><td>${can('suppliers', 'edit') ? `<button class="btn btn-sm btn-outline-secondary" data-action="edit-supplier" data-id="${s.id}">Edit</button>` : ''} ${can('suppliers', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-supplier" data-id="${s.id}">Delete</button>` : ''}</td></tr>`);
}
function renderCustomers() {
  renderBasicTable(customersTableBody, state.customers, 7, 'No customers available.');
  for (const c of state.customers) {
    const outstanding = Number(c.outstandingBalance || 0);
    const isDebtor = outstanding > 0;
    const statusClass = isDebtor ? 'stock-pill low' : 'stock-pill';
    const statusText = isDebtor ? 'Debtor' : 'Cleared';
    customersTableBody.insertAdjacentHTML('beforeend', `<tr><td>${c.id}</td><td>${c.name}</td><td>${c.phone || 'N/A'}</td><td>${c.email || 'N/A'}</td><td>${currency(outstanding)}</td><td><span class="${statusClass}">${statusText}</span></td><td>${can('customers', 'edit') ? `<button class="btn btn-sm btn-outline-secondary" data-action="edit-customer" data-id="${c.id}">Edit</button>` : ''} ${can('customers', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-customer" data-id="${c.id}">Delete</button>` : ''}</td></tr>`);
  }
}

function renderVendors() {
  if (!vendorsTableBody) return;
  renderBasicTable(vendorsTableBody, state.vendors, 6, 'No vendors available.');
  for (const v of state.vendors) {
    vendorsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${v.name}</td><td>${v.type}</td><td>${v.phone || 'N/A'}</td><td>${v.email || 'N/A'}</td><td>${v.address || 'N/A'}</td><td>${v.createdByName || 'N/A'}</td></tr>`);
  }
}

function renderExpenses() {
  if (!expensesTableBody) return;
  renderBasicTable(expensesTableBody, state.expenses, 6, 'No expenses recorded yet.');
  for (const e of state.expenses) {
    expensesTableBody.insertAdjacentHTML('beforeend', `<tr><td>${new Date(e.createdAt).toLocaleString()}</td><td>${e.vendorName}</td><td>${e.categoryName}</td><td>${e.description || '-'}</td><td>${currency(e.amount)}</td><td>${e.createdByName || 'N/A'}</td></tr>`);
  }
}

function renderIncome() {
  if (!incomeTableBody) return;
  renderBasicTable(incomeTableBody, state.incomes, 6, 'No additional inflows recorded yet.');
  for (const i of state.incomes) {
    incomeTableBody.insertAdjacentHTML('beforeend', `<tr><td>${new Date(i.createdAt).toLocaleString()}</td><td>${i.categoryName}</td><td>${i.sourceName}</td><td>${i.description || '-'}</td><td>${currency(i.amount)}</td><td>${i.createdByName || 'N/A'}</td></tr>`);
  }
}

function renderCashflow() {
  if (!transactionsTableBody) return;
  if (cashflowBalance) cashflowBalance.textContent = currency(state.wallet?.currentBalance || 0);
  const inflow = state.cashflowTransactions.filter((t) => t.direction === 'in').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const outflow = state.cashflowTransactions.filter((t) => t.direction === 'out').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  if (cashflowIn) cashflowIn.textContent = currency(inflow);
  if (cashflowOut) cashflowOut.textContent = currency(outflow);
  renderBasicTable(transactionsTableBody, state.cashflowTransactions, 6, 'No cashflow transactions yet.');
  for (const t of state.cashflowTransactions) {
    transactionsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td>${t.type}</td><td>${t.direction}</td><td>${currency(t.amount)}</td><td>${currency(t.balanceAfter)}</td><td>${t.createdByName || 'N/A'}</td></tr>`);
  }
}

const invoiceTypeLabel = (type) => (type === 'performa' || type === 'proforma' ? 'Performa Invoice' : type === 'quote' ? 'Quote' : 'Invoice');
const paymentStatusLabel = (status) => (status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid');
const paymentStatusClass = (status) => (status === 'paid' ? 'stock-pill' : 'stock-pill low');

function getInvoiceBreakdown() {
  const subtotal = Number((state.invoiceDraft.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0).toFixed(2));
  const taxPercent = Math.max(0, Number(state.invoiceDraft.useDefaultTax ? state.invoiceSettings.defaultTaxRate : state.invoiceDraft.taxPercent || 0));
  const discountAmount = Math.max(0, Number(state.invoiceDraft.discountAmount || 0));
  const taxAmount = Number(((subtotal * taxPercent) / 100).toFixed(2));
  const total = Number(Math.max(0, subtotal + taxAmount - discountAmount).toFixed(2));
  const amountPaid = Math.max(0, Number(state.invoiceDraft.amountPaid || 0));
  const cappedPaid = Number(Math.min(total, amountPaid).toFixed(2));
  const balance = Number((total - cappedPaid).toFixed(2));
  const paymentStatus = cappedPaid <= 0 ? 'unpaid' : (cappedPaid + 0.0001 < total ? 'partial' : 'paid');
  return { subtotal, taxPercent, taxAmount, discountAmount, total, amountPaid: cappedPaid, balance, paymentStatus };
}

function buildInvoicePayloadForTemplate() {
  const customer = state.customers.find((c) => String(c.id) === String(invoiceCustomerId.value || state.invoiceDraft.customerId || ''));
  const summary = getInvoiceBreakdown();
  return {
    invoice: {
      type: invoiceType.value,
      status: invoiceStatus.value,
      invoiceNumber: invoiceNumber.value || '',
      date: invoiceDate.value || '',
      validityPeriod: String(invoiceValidityPeriod.value || '').trim(),
      notes: String(invoiceNotes.value || '').trim(),
      customerName: customer?.name || '',
      customerEmail: customer?.email || '',
      customerPhone: customer?.phone || '',
      items: (state.invoiceDraft.items || []).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || 0)
      })),
      subtotalAmount: summary.subtotal,
      taxPercent: summary.taxPercent,
      taxAmount: summary.taxAmount,
      discountAmount: summary.discountAmount,
      totalAmount: summary.total,
      amountPaid: summary.amountPaid,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus
    },
    company: state.company || {},
    settings: state.invoiceSettings || {}
  };
}

function renderInvoiceSettings() {
  if (invoiceSettingsForm) {
    const wrapper = invoiceSettingsForm.closest('.panel-card');
    if (wrapper) wrapper.style.display = can('settings', 'edit') ? '' : 'none';
  }
  if (emailSettingsForm) {
    const wrapper = emailSettingsForm.closest('.panel-card');
    if (wrapper) wrapper.style.display = can('settings', 'edit') ? '' : 'none';
  }
  settingsDefaultTaxRate.value = String(Number(state.invoiceSettings.defaultTaxRate || 0));
  settingsTermsConditions.value = state.invoiceSettings.termsConditions || '';
  if (settingsIncludeRevenueBalanceView) settingsIncludeRevenueBalanceView.checked = Boolean(state.invoiceSettings.includeRevenueInBalance);
  if (emailSmtpHost) emailSmtpHost.value = state.emailSettings.smtpHost || '';
  if (emailSmtpPort) emailSmtpPort.value = String(Number(state.emailSettings.smtpPort || 587));
  if (emailSmtpUser) emailSmtpUser.value = state.emailSettings.smtpUser || '';
  if (emailSmtpPass) emailSmtpPass.value = '';
  if (emailSmtpSecure) emailSmtpSecure.checked = Boolean(state.emailSettings.smtpSecure);
  if (emailSmtpPass && state.emailSettings.hasPassword) {
    emailSmtpPass.placeholder = 'Saved (leave blank to keep existing password)';
  }
}

async function refreshInvoiceNumber() {
  if (!state.session?.authenticated || !state.session?.clockedIn) {
    state.invoiceDraft.invoiceNumber = '';
    invoiceNumber.value = '';
    return;
  }
  const next = await api.getNextInvoiceNumber({ type: invoiceType.value || 'invoice' });
  state.invoiceDraft.invoiceNumber = next;
  invoiceNumber.value = next;
}

function renderInvoiceItems() {
  invoiceItemsBody.innerHTML = '';
  if (!state.invoiceDraft.items.length) {
    invoiceItemsBody.innerHTML = '<tr><td colspan="5">No items added.</td></tr>';
  } else {
    state.invoiceDraft.items.forEach((item, idx) => {
      invoiceItemsBody.insertAdjacentHTML('beforeend',
        `<tr data-index="${idx}">
          <td>${item.name}</td>
          <td><input class="form-control form-control-sm invoice-qty" type="number" min="1" step="1" value="${item.quantity}" /></td>
          <td><input class="form-control form-control-sm invoice-price" type="number" min="0" step="0.01" value="${item.unitPrice}" /></td>
          <td>${currency(item.lineTotal)}</td>
          <td><button class="btn btn-sm btn-outline-danger" data-action="remove-item" data-index="${idx}">Remove</button></td>
        </tr>`);
    });
  }
  const summary = getInvoiceBreakdown();
  invoiceGrandTotal.textContent = currency(summary.total);
  if (invoiceAmountPaidDisplay) invoiceAmountPaidDisplay.textContent = currency(summary.amountPaid);
  if (invoiceBalanceDisplay) invoiceBalanceDisplay.textContent = currency(summary.balance);
  if (invoicePaymentStatusDisplay) invoicePaymentStatusDisplay.textContent = paymentStatusLabel(summary.paymentStatus);
}

function renderInvoiceTemplateFallback(payload) {
  const p = payload || {};
  const invoice = p.invoice || {};
  const company = p.company || {};
  const settings = p.settings || {};
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const rows = items.map((it, i) => `<tr><td>${i + 1}</td><td>${it.name || ''}</td><td>${currency(it.unitPrice)}</td><td>${it.quantity}</td><td>${currency(it.lineTotal)}</td></tr>`).join('');
  const brand = /^#[0-9a-fA-F]{6}$/.test(String(company.primaryColor || '').trim()) ? company.primaryColor : '#f4c214';
  const title = (invoice.type === 'performa' || invoice.type === 'proforma') ? 'PERFORMA INVOICE' : (invoice.type === 'quote' ? 'QUOTE' : 'INVOICE');
  return `
    <div style="--brand-color:${brand};background:#f5f6f8;border:1px solid #d1d5db;padding:12px;border-radius:6px;box-shadow:0 20px 40px -28px rgba(15,23,42,.48);">
      <div style="font-weight:800;font-size:12px;">${company.name || 'Company Name'}</div>
      <div style="color:#475569;font-size:8px;">${company.address || ''}</div>
      <div style="display:grid;grid-template-columns:46% 28% 26%;gap:8px;align-items:center;margin-top:10px;">
        <div style="height:10px;background:${brand};"></div><div style="text-align:center;font-weight:800;font-size:9px;">${title}</div><div style="height:10px;background:${brand};"></div>
      </div>
      <div style="margin-top:8px;font-size:8px;"><strong>Invoice#:</strong> ${invoice.invoiceNumber || '-'} &nbsp; <strong>Date:</strong> ${invoice.date || '-'} &nbsp; <strong>Validity:</strong> ${invoice.validityPeriod || '-'}</div>
      <div style="margin-top:6px;font-size:8px;"><strong>Customer:</strong> ${invoice.customerName || ''}</div>
      <table class="table table-sm mt-2"><thead><tr><th>SL.</th><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No items</td></tr>'}</tbody></table>
      <div style="text-align:right;font-size:9px;"><strong>Total: ${currency(invoice.totalAmount || 0)}</strong></div>
      <div style="text-align:right;font-size:8px;">Paid: ${currency(invoice.amountPaid || 0)} | Balance: ${currency(invoice.balance || 0)} | Status: ${paymentStatusLabel(invoice.paymentStatus)}</div>
      ${invoice.notes ? `<div style="margin-top:6px;font-size:8px;"><strong>Notes:</strong> ${String(invoice.notes || '').replace(/</g, '&lt;')}</div>` : ''}
      <div style="margin-top:8px;font-size:8px;"><strong>Terms:</strong> ${String(settings.termsConditions || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</div>
    </div>
  `;
}

function renderInvoicePreview() {
  const payload = buildInvoicePayloadForTemplate();
  if (typeof api.renderInvoiceTemplate !== 'function') {
    invoicePreview.innerHTML = renderInvoiceTemplateFallback(payload);
    return;
  }
  Promise.resolve(api.renderInvoiceTemplate(payload))
    .then((html) => {
      invoicePreview.innerHTML = typeof html === 'string' && html.trim() ? html : renderInvoiceTemplateFallback(payload);
    })
    .catch(() => {
      invoicePreview.innerHTML = renderInvoiceTemplateFallback(payload);
    });
}

function renderInvoices() {
  invoicesTableBody.innerHTML = '';
  if (!state.invoices.length) {
    invoicesTableBody.innerHTML = '<tr><td colspan="12">No documents created yet.</td></tr>';
    return;
  }
  state.invoices.forEach((inv) => {
    const paymentStatus = String(inv.paymentStatus || 'unpaid');
    invoicesTableBody.insertAdjacentHTML('beforeend', `<tr>
      <td>${inv.invoiceNumber}</td>
      <td>${invoiceTypeLabel(inv.type)}</td>
      <td>${inv.customerName}</td>
      <td>${new Date(inv.date).toLocaleDateString()}</td>
      <td>${inv.status}</td>
      <td>${currency(inv.totalAmount)}</td>
      <td>${currency(inv.amountPaid || 0)}</td>
      <td>${currency(inv.balance || 0)}</td>
      <td><span class="${paymentStatusClass(paymentStatus)}">${paymentStatusLabel(paymentStatus)}</span></td>
      <td>${inv.createdByUsername || 'N/A'}</td>
      <td>${inv.lastPaymentByUsername || 'N/A'}</td>
      <td>
        ${can('invoices', 'view') ? `<button class="btn btn-sm btn-outline-secondary me-1" data-action="view-invoice" data-id="${inv.id}">View</button>` : ''}
        ${can('invoices', 'edit') ? `<button class="btn btn-sm btn-outline-success me-1" data-action="add-payment" data-id="${inv.id}">Add Payment</button>` : ''}
        ${can('invoices', 'print') ? `<button class="btn btn-sm btn-outline-primary" data-action="export-invoice" data-id="${inv.id}">Export PDF</button>` : ''}
      </td>
    </tr>`);
  });
}

function loadInvoiceIntoDraft(inv) {
  if (!inv) return;
  state.invoiceDraft.type = inv.type || 'invoice';
  state.invoiceDraft.status = inv.status || 'draft';
  state.invoiceDraft.date = inv.date ? String(inv.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  state.invoiceDraft.invoiceNumber = inv.invoiceNumber || '';
  state.invoiceDraft.customerId = String(inv.customerId || '');
  state.invoiceDraft.taxPercent = Number(inv.taxPercent || 0);
  state.invoiceDraft.useDefaultTax = false;
  state.invoiceDraft.discountAmount = Number(inv.discountAmount || 0);
  state.invoiceDraft.amountPaid = Number(inv.amountPaid || 0);
  state.invoiceDraft.validityPeriod = String(inv.validityPeriod || '');
  state.invoiceDraft.notes = String(inv.notes || '');
  state.invoiceDraft.items = (Array.isArray(inv.items) ? inv.items : []).map((item) => ({
    productId: Number(item.productId || 0),
    name: String(item.name || 'Item'),
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    lineTotal: Number(item.lineTotal ?? (Number(item.quantity || 0) * Number(item.unitPrice || 0)))
  }));

  invoiceType.value = state.invoiceDraft.type;
  invoiceStatus.value = state.invoiceDraft.status;
  invoiceDate.value = state.invoiceDraft.date;
  invoiceNumber.value = state.invoiceDraft.invoiceNumber;
  invoiceCustomerId.value = state.invoiceDraft.customerId;
  invoiceUseDefaultTax.checked = false;
  invoiceTaxPercent.disabled = false;
  invoiceTaxPercent.value = String(state.invoiceDraft.taxPercent);
  invoiceDiscountAmount.value = String(state.invoiceDraft.discountAmount);
  invoiceAmountPaid.value = String(state.invoiceDraft.amountPaid);
  invoiceValidityPeriod.value = state.invoiceDraft.validityPeriod;
  invoiceNotes.value = state.invoiceDraft.notes;
  renderInvoiceItems();
  renderInvoicePreview();
}

function renderInvoicePaymentHistory(payments = [], totalAmount = 0) {
  if (!invoicePaymentHistoryBody) return;
  const rows = Array.isArray(payments) ? [...payments].sort((a, b) => new Date(a.createdAt || a.paymentDate).getTime() - new Date(b.createdAt || b.paymentDate).getTime()) : [];
  if (!rows.length) {
    invoicePaymentHistoryBody.innerHTML = '<tr><td colspan="6">No payment history for selected invoice.</td></tr>';
    return;
  }
  let runningPaid = 0;
  invoicePaymentHistoryBody.innerHTML = '';
  rows.forEach((p) => {
    runningPaid += Number(p.amount || 0);
    const remaining = Math.max(0, Number(totalAmount || 0) - runningPaid);
    invoicePaymentHistoryBody.insertAdjacentHTML('beforeend', `<tr>
      <td>${new Date(p.createdAt || p.paymentDate || '').toLocaleString()}</td>
      <td>${currency(p.amount || 0)}</td>
      <td>${currency(totalAmount || 0)}</td>
      <td>${currency(remaining)}</td>
      <td>${p.recordedByName || p.recordedBy || 'N/A'}</td>
      <td>${p.note || '-'}</td>
    </tr>`);
  });
}

async function addInvoicePaymentFlow(invoiceId) {
  const id = Number(invoiceId || 0);
  if (!id) return;
  const amountText = window.prompt('Enter payment amount:');
  if (amountText === null) return;
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Payment amount must be greater than 0.');
  const note = String(window.prompt('Payment note (optional):') || '').trim();
  await api.addInvoicePayment({ invoiceId: id, amount, note });
  const updated = await api.getInvoiceById(id);
  const history = await api.getInvoicePayments(id);
  loadInvoiceIntoDraft(updated);
  renderInvoicePaymentHistory(history, Number(updated.totalAmount || 0));
  await refreshData();
  showStatus(`Payment added to ${updated.invoiceNumber}.`);
}

function renderUsers() {
  const visible = can('users', 'view');
  $('section-users').style.display = visible ? '' : 'none';
  usersTableBody.innerHTML = '';
  userAssignedCompanies.innerHTML = '';
  for (const c of state.companies) userAssignedCompanies.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  userRoleId.innerHTML = '<option value="">No specific role (full default)</option>';
  for (const r of state.roles) userRoleId.insertAdjacentHTML('beforeend', `<option value="${r.id}">${r.roleName}</option>`);
  if (userBusinessRole) userBusinessRole.value = 'staff';
  userProfilePreview.removeAttribute('src');
  if (!visible) return;
  if (!state.users.length) return (usersTableBody.innerHTML = '<tr><td colspan="5">No users available.</td></tr>');
  for (const u of state.users) {
    const names = state.companies.filter((c) => u.assignedCompanies.includes(c.id)).map((c) => c.name).join(', ') || 'None';
    const roleLabel = u.isAdmin ? 'Admin' : `${String(u.userRole || 'staff').charAt(0).toUpperCase()}${String(u.userRole || 'staff').slice(1)}`;
    usersTableBody.insertAdjacentHTML('beforeend', `<tr><td>${u.id}</td><td><div class="d-flex align-items-center gap-2"><img class="user-profile-preview" src="${getAvatarPath(u.profileImagePath)}" alt="${u.username}" /><span>${u.username}</span></div></td><td>${roleLabel}${u.isActive ? '' : ' (Disabled)'}</td><td>${names}</td><td>${can('users', 'edit') ? `<button class="btn btn-sm btn-outline-secondary" data-action="edit-user" data-id="${u.id}">Edit</button>` : ''} ${can('users', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-user" data-id="${u.id}">Delete</button>` : ''} ${can('users', 'edit') ? `<button class="btn btn-sm btn-outline-warning" data-action="reset-password" data-id="${u.id}">Reset Password</button>` : ''}</td></tr>`);
  }
}

function renderRoles() {
  const visible = can('roles', 'view');
  $('section-roles').style.display = visible ? '' : 'none';
  rolesTableBody.innerHTML = '';
  if (!visible) return;
  if (!state.roles.length) {
    rolesTableBody.innerHTML = '<tr><td colspan="4">No roles created yet.</td></tr>';
    return;
  }
  state.roles.forEach((role) => {
    const enabledPerms = permissionModules.flatMap((m) => permissionActions.filter((a) => role.permissions?.[m]?.[a]).map((a) => `${m}.${a}`));
    rolesTableBody.insertAdjacentHTML('beforeend', `<tr><td>${role.id}</td><td>${role.roleName}</td><td>${enabledPerms.slice(0, 6).join(', ')}${enabledPerms.length > 6 ? ' ...' : ''}</td><td>${can('roles', 'edit') ? `<button class="btn btn-sm btn-outline-secondary" data-action="edit-role" data-id="${role.id}">Edit</button>` : ''} ${can('roles', 'delete') ? `<button class="btn btn-sm btn-outline-danger" data-action="delete-role" data-id="${role.id}">Delete</button>` : ''}</td></tr>`);
  });
}

function drawDashboardSalesChart(periods = {}) {
  if (!dashboardSalesChart) return;
  const canvas = dashboardSalesChart;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const labels = ['Daily', 'Weekly', 'Monthly'];
  const values = [
    Number(periods.daily?.revenue || 0),
    Number(periods.weekly?.revenue || 0),
    Number(periods.monthly?.revenue || 0)
  ];
  const maxValue = Math.max(...values, 0);
  const hasData = maxValue > 0;
  const pad = { left: 56, right: 22, top: 20, bottom: 38 };
  const plotW = canvas.width - pad.left - pad.right;
  const plotH = canvas.height - pad.top - pad.bottom;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8fbff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d9e2ef';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();
  const ticks = 4;
  const scaleMax = hasData ? maxValue * 1.1 : 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Segoe UI';
  for (let i = 0; i <= ticks; i += 1) {
    const y = pad.top + ((plotH / ticks) * i);
    ctx.strokeStyle = '#edf1f7';
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    const labelValue = ((scaleMax * (ticks - i)) / ticks).toFixed(0);
    ctx.fillText(currency(Number(labelValue)), 6, y + 4);
  }
  const barW = Math.min(80, Math.floor(plotW / labels.length) - 24);
  labels.forEach((label, idx) => {
    const x = pad.left + ((plotW / labels.length) * idx) + ((plotW / labels.length - barW) / 2);
    const h = hasData ? Math.max(3, (values[idx] / scaleMax) * plotH) : 3;
    const y = pad.top + plotH - h;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--company-primary').trim() || '#0f6f33';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(label, x + Math.max(0, (barW - 28) / 2), canvas.height - 14);
    ctx.fillText(currency(values[idx]), x - 6, y - 6);
  });
  if (dashboardChartEmpty) dashboardChartEmpty.textContent = hasData ? '' : 'No sales data yet for chart.';
}

const dashboardMetricIcons = {
  totalProducts: navSvgs.products,
  totalSales: navSvgs.invoices,
  totalTransactions: navSvgs.cashflow,
  dailyRevenue: navSvgs.income,
  weeklyRevenue: navSvgs.income,
  monthlyRevenue: navSvgs.income,
  walletBalance: navSvgs.company,
  walletInflow: navSvgs.cashflow,
  walletOutflow: navSvgs.expenses,
  dashboardRevenue: navSvgs.reports,
  dashboardCashReceived: navSvgs.income,
  dashboardOutstandingRevenue: navSvgs.customers,
  dashboardProjectedBalance: navSvgs.reports
};

function ensureDashboardMetricIcons() {
  Object.entries(dashboardMetricIcons).forEach(([statId, iconSvg]) => {
    const statEl = $(statId);
    if (!statEl) return;
    const card = statEl.closest('.metric-card');
    if (!card) return;
    if (card.querySelector('.metric-card-icon')) return;
    const iconEl = document.createElement('div');
    iconEl.className = 'metric-card-icon';
    iconEl.innerHTML = iconSvg;
    card.insertBefore(iconEl, card.firstChild);
  });
}

function renderDashboard(stats, salesReport = null) {
  ensureDashboardMetricIcons();
  totalProductsEl.textContent = String(stats.totalProducts || 0);
  totalSalesEl.textContent = currency(stats.totalSales || 0);
  totalTransactionsEl.textContent = String(stats.totalTransactions || 0);
  if (dailyRevenueEl) dailyRevenueEl.textContent = currency(stats.periods?.daily?.revenue || 0);
  if (weeklyRevenueEl) weeklyRevenueEl.textContent = currency(stats.periods?.weekly?.revenue || 0);
  if (monthlyRevenueEl) monthlyRevenueEl.textContent = currency(stats.periods?.monthly?.revenue || 0);
  if (walletBalanceEl) walletBalanceEl.textContent = currency(stats.walletBalance || 0);
  if (walletInflowEl) walletInflowEl.textContent = currency(stats.totalInflow || 0);
  if (walletOutflowEl) walletOutflowEl.textContent = currency(stats.totalOutflow || 0);
  if (dashboardRevenueEl) dashboardRevenueEl.textContent = currency(stats.totalRevenue || 0);
  if (dashboardCashReceivedEl) dashboardCashReceivedEl.textContent = currency(stats.totalCashReceived || 0);
  if (dashboardOutstandingRevenueEl) dashboardOutstandingRevenueEl.textContent = currency(stats.outstandingRevenue || 0);
  if (dashboardProjectedBalanceWrap) dashboardProjectedBalanceWrap.style.display = stats.includeRevenueInBalance ? '' : 'none';
  if (dashboardProjectedBalanceEl) dashboardProjectedBalanceEl.textContent = currency(stats.projectedBalance || 0);
  if (walletStatusText) {
    const bal = Number(stats.walletBalance || 0);
    walletStatusText.textContent = bal >= 0 ? 'Positive' : 'Negative (Debt Warning)';
    walletStatusText.style.color = bal >= 0 ? '#1f7d42' : '#b42318';
  }
  drawDashboardSalesChart(stats.periods || {});
  lowStockListEl.innerHTML = '';
  if (!stats.lowStock?.length) lowStockListEl.innerHTML = '<li style="background:#effcf3;color:#2d7d3c;">No low stock alerts.</li>';
  else for (const l of stats.lowStock) lowStockListEl.insertAdjacentHTML('beforeend', `<li>${l.name} - ${l.quantity} available (min ${l.minStock})</li>`);
  const isAdmin = Boolean(state.session?.user?.isAdmin);
  if (dashboardAdminSection) dashboardAdminSection.style.display = isAdmin ? '' : 'none';
  if (isAdmin) {
    if (dashboardTopProductsBody) {
      dashboardTopProductsBody.innerHTML = '';
      const topProducts = Array.isArray(stats.topSellingProducts) ? stats.topSellingProducts : [];
      if (!topProducts.length) dashboardTopProductsBody.innerHTML = '<tr><td colspan="3">No sales records yet.</td></tr>';
      else topProducts.forEach((row) => dashboardTopProductsBody.insertAdjacentHTML('beforeend', `<tr><td>${row.name}</td><td>${row.unitsSold}</td><td>${currency(row.revenue)}</td></tr>`));
    }
    if (dashboardCustomerSalesBody) {
      dashboardCustomerSalesBody.innerHTML = '';
      const customerSales = Array.isArray(salesReport?.customerSales) ? salesReport.customerSales : [];
      if (!customerSales.length) dashboardCustomerSalesBody.innerHTML = '<tr><td colspan="3">No customer sales yet.</td></tr>';
      else customerSales.slice(0, 8).forEach((row) => dashboardCustomerSalesBody.insertAdjacentHTML('beforeend', `<tr><td>${row.customerName}</td><td>${row.transactions}</td><td>${currency(row.revenue)}</td></tr>`));
    }
    if (dashboardStaffClockInBody) {
      dashboardStaffClockInBody.innerHTML = '';
      const clockSummary = Array.isArray(stats.staffClockInSummary) ? stats.staffClockInSummary : [];
      if (!clockSummary.length) dashboardStaffClockInBody.innerHTML = '<tr><td colspan="2">No clock-in data yet.</td></tr>';
      else clockSummary.forEach((row) => dashboardStaffClockInBody.insertAdjacentHTML('beforeend', `<tr><td>${row.username}</td><td>${row.clockIns}</td></tr>`));
    }
    if (dashboardDebtorsBody) {
      dashboardDebtorsBody.innerHTML = '';
      const debtors = Array.isArray(stats.debtors) ? stats.debtors : [];
      if (!debtors.length) dashboardDebtorsBody.innerHTML = '<tr><td colspan="8">No outstanding debtor invoices.</td></tr>';
      else debtors.forEach((row) => dashboardDebtorsBody.insertAdjacentHTML('beforeend', `<tr>
        <td>${row.customerName || '-'}</td>
        <td>${row.invoiceNumber || '-'}</td>
        <td>${currency(row.totalAmount || 0)}</td>
        <td>${currency(row.amountPaid || 0)}</td>
        <td>${currency(row.balance || 0)}</td>
        <td>${row.lastPaymentAt ? new Date(row.lastPaymentAt).toLocaleString() : 'N/A'}</td>
        <td><span class="${paymentStatusClass(row.paymentStatus)}">${paymentStatusLabel(row.paymentStatus)}</span></td>
        <td>
          ${can('invoices', 'view') ? `<button class="btn btn-sm btn-outline-secondary me-1" data-action="view-invoice" data-id="${row.invoiceId}">Open</button>` : ''}
          ${can('invoices', 'edit') ? `<button class="btn btn-sm btn-outline-success" data-action="add-payment" data-id="${row.invoiceId}">Add Payment</button>` : ''}
        </td>
      </tr>`));
    }
  }
  if (recentActivitiesList) {
    const activities = Array.isArray(stats.recentActivities) ? stats.recentActivities : [];
    if (!activities.length) {
      recentActivitiesList.innerHTML = '<div class="text-muted">No recent activities yet.</div>';
    } else {
      recentActivitiesList.innerHTML = activities.slice(0, 10).map((entry) => {
        const meta = entry.metadata && typeof entry.metadata === 'object' ? Object.keys(entry.metadata).slice(0, 2).map((k) => `${k}: ${entry.metadata[k]}`).join(' | ') : '';
        return `<div class="mb-1"><strong>${entry.username || 'User'}</strong> ${entry.action} ${entry.module}${entry.entityId ? ` #${entry.entityId}` : ''} <span class="text-muted">(${new Date(entry.createdAt).toLocaleString()})</span>${meta ? `<div class="small text-muted">${meta}</div>` : ''}</div>`;
      }).join('');
    }
  }
}

function toggleBlockByAnchor(anchorEl, visible) {
  if (!anchorEl) return;
  const block = anchorEl.closest('.col-lg-4, .col-lg-6, .col-lg-3, .col-12, .panel-card, article') || anchorEl;
  block.style.display = visible ? '' : 'none';
}

function getDashboardDynamicContainer() {
  if (!dashboardSection) return null;
  let container = document.getElementById('dashboardDynamicWidgets');
  if (container) return container;
  container = document.createElement('div');
  container.id = 'dashboardDynamicWidgets';
  container.className = 'row g-3 mt-2';
  dashboardSection.appendChild(container);
  return container;
}

function renderDynamicDashboardWidgets() {
  const container = getDashboardDynamicContainer();
  if (!container) return;
  const widgets = getAllowedDashboardWidgets();
  const has = (key) => widgets.includes(key);
  container.innerHTML = '';
  const addCard = (title, value) => {
    container.insertAdjacentHTML('beforeend', `<div class="col-lg-4"><article class="metric-card"><p>${title}</p><h3>${value}</h3></article></div>`);
  };
  if (has('active_bookings')) addCard('Active Bookings', String((state.bookings || []).filter((b) => ['booked', 'checked_in'].includes(String(b.status || '').toLowerCase())).length));
  if (has('room_occupancy')) {
    const occupied = (state.rooms || []).filter((r) => String(r.status || '').toLowerCase() === 'occupied').length;
    const total = Math.max(1, (state.rooms || []).length);
    addCard('Room Occupancy', `${Math.round((occupied / total) * 100)}%`);
  }
  if (has('today_checkins')) {
    const today = new Date().toISOString().slice(0, 10);
    addCard('Today Check-ins', String((state.bookings || []).filter((b) => String(b.checkInDate || '').slice(0, 10) === today).length));
  }
  if (has('today_checkouts')) {
    const today = new Date().toISOString().slice(0, 10);
    addCard('Today Check-outs', String((state.bookings || []).filter((b) => String(b.checkOutDate || '').slice(0, 10) === today).length));
  }
  if (has('patients_today')) {
    const today = new Date().toISOString().slice(0, 10);
    addCard('Patients Today', String((state.patients || []).filter((p) => String(p.createdAt || '').slice(0, 10) === today).length));
  }
  if (has('expiring_drugs')) addCard('Expiring Drugs', String((state.drugExpiry || []).length));
  if (has('low_drug_stock')) {
    const lowDrug = (state.products || []).filter((p) => Number(p.quantity || 0) <= Number(p.minStock || 0)).length;
    addCard('Low Drug Stock', String(lowDrug));
  }
  if (has('recent_prescriptions')) addCard('Recent Prescriptions', 'Coming Soon');
}

function applyDashboardWidgetVisibility() {
  const widgets = getAllowedDashboardWidgets();
  const has = (key) => widgets.includes(key);
  toggleBlockByAnchor(walletBalanceEl, has('wallet_balance'));
  toggleBlockByAnchor(totalSalesEl, has('total_sales') || has('today_sales'));
  toggleBlockByAnchor(totalTransactionsEl, has('recent_transactions') || has('recent_sales'));
  toggleBlockByAnchor(lowStockListEl, has('low_stock_alert') || has('low_drug_stock'));
  toggleBlockByAnchor(dashboardTopProductsBody, has('top_products'));
  toggleBlockByAnchor(dashboardSalesChart, has('recent_sales') || has('today_sales') || has('total_sales'));
  toggleBlockByAnchor(recentActivitiesList, has('recent_transactions'));
  toggleBlockByAnchor(walletOutflowEl, has('expenses'));
  renderDynamicDashboardWidgets();
}

function getReportGroups() {
  return {
    sales_report: [
      reportTotalRevenue?.closest('.col-lg-4'),
      reportTotalTransactions?.closest('.col-lg-4'),
      reportTotalItems?.closest('.col-lg-4'),
      reportTopProductsBody?.closest('.col-lg-6'),
      reportCustomerSalesBody?.closest('.col-lg-6'),
      reportInvoicePaymentsBody?.closest('.panel-card')
    ],
    expense_report: [
      reportTotalExpenses?.closest('.col-lg-4'),
      reportExpenseByCategoryBody?.closest('.col-lg-6'),
      reportExpenseByVendorBody?.closest('.col-lg-6')
    ],
    cashflow_report: [
      reportNetCashflow?.closest('.col-lg-4'),
      reportTotalExtraIncome?.closest('.col-lg-4')
    ],
    product_performance: [reportTopProductsBody?.closest('.col-lg-6')],
    inventory_report: [reportTopProductsBody?.closest('.col-lg-6')],
    profit_report: [reportCombinedNetProfit?.closest('.col-lg-3')],
    booking_report: [],
    occupancy_report: [],
    revenue_report: [reportTotalEarnedRevenue?.closest('.col-lg-3'), reportTotalCashReceived?.closest('.col-lg-3'), reportTotalOutstandingRevenue?.closest('.col-lg-3'), reportRevenueByCustomerBody?.closest('.panel-card')],
    drug_inventory_report: [reportTopProductsBody?.closest('.col-lg-6')],
    expiry_report: [reportRevenueByCustomerBody?.closest('.panel-card')],
    patient_activity_report: []
  };
}

function applyReportVisibility() {
  if (!reportsSection) return;
  const allowed = new Set(getAllowedReports());
  const groups = getReportGroups();
  Object.entries(groups).forEach(([key, nodes]) => {
    const visible = allowed.has(key);
    (nodes || []).forEach((node) => {
      if (node) node.style.display = visible ? '' : 'none';
    });
  });
  let notice = document.getElementById('industryReportNotice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'industryReportNotice';
    notice.className = 'alert alert-info mt-2';
    reportsSection.prepend(notice);
  }
  const role = getCurrentUserRole();
  notice.textContent = `Industry: ${getCurrentIndustry()} | Role: ${role} | Enabled reports: ${Array.from(allowed).join(', ')}`;
}

function renderClockInGallery(events = []) {
  if (!clockInGallery) return;
  const selectedDate = String(clockInDateFilter?.value || '');
  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const filtered = selectedDate
    ? sorted.filter((ev) => new Date(ev.timestamp).toISOString().slice(0, 10) === selectedDate)
    : sorted;
  clockInGallery.classList.add('clockin-gallery');
  clockInGallery.innerHTML = '';
  if (!filtered.length) {
    clockInGallery.innerHTML = '<div class="text-muted">No clock-in images found.</div>';
    return;
  }
  const grouped = filtered.reduce((acc, ev) => {
    const key = new Date(ev.timestamp).toISOString().slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});
  Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1)).forEach((dateKey) => {
    const rows = grouped[dateKey];
    const cards = rows.map((ev) => `<div class="clockin-card" data-photo="${ev.photoPath}" data-user="${ev.username}" data-company="${ev.companyName}" data-timestamp="${ev.timestamp}"><img src="${fileUrl(ev.photoPath)}" alt="Clock-in photo" /><div class="meta"><div class="d-flex align-items-center gap-2"><img class="user-profile-preview" src="${getAvatarPath(ev.profileImagePath)}" alt="${ev.username}" /><strong>${ev.username}</strong></div><div>${new Date(ev.timestamp).toLocaleString()}</div></div></div>`).join('');
    clockInGallery.insertAdjacentHTML('beforeend', `<section class="clockin-day-group"><h6 class="clockin-day-title">${new Date(`${dateKey}T00:00:00`).toDateString()}</h6><div class="clockin-grid">${cards}</div></section>`);
  });
}

function renderCompany() {
  const c = state.company || {};
  document.documentElement.style.setProperty('--company-primary', c.primaryColor || '#0f6f33');
  companyName.value = c.name || '';
  companyAddress.value = c.address || '';
  companyPhone.value = c.phone || '';
  companyEmail.value = c.email || '';
  companyBankName.value = c.bankName || '';
  companyAccountNumber.value = c.accountNumber || '';
  companyPrimaryColor.value = c.primaryColor || '#f4c214';
  if (companyIndustryType) {
    companyIndustryType.value = c.industryType || 'general';
    companyIndustryType.disabled = true;
  }
  companyPaymentMethods.value = Array.isArray(c.paymentMethods) ? c.paymentMethods.join(', ') : '';
  companyLogoPath.value = c.logoPath || '';
  companySignaturePath.value = c.signaturePath || '';
  if (c.logoPath) companyLogoPreview.src = fileUrl(c.logoPath); else companyLogoPreview.removeAttribute('src');
  if (c.signaturePath) companySignaturePreview.src = fileUrl(c.signaturePath); else companySignaturePreview.removeAttribute('src');
}

async function handleLegacyIndustryConfirmation() {
  const c = state.company || {};
  if (!c?.industryNeedsConfirmation || !state.session?.user?.isAdmin) return;
  const selected = window.prompt('Please confirm your business industry (retail, hospitality, medical, general):', c.industryType || 'general');
  if (!selected) return;
  const normalized = normalizeIndustry(selected);
  try {
    const confirmed = await api.confirmCompanyIndustry(normalized);
    state.company = confirmed || state.company;
    state.currentIndustry = normalizeIndustry(state.company?.industryType || normalized);
    await safeRefresh();
    showStatus('Industry confirmed and locked permanently.');
  } catch (err) {
    showStatus(err.message || 'Unable to confirm industry.', 'error');
  }
}

function renderSystemConfiguration() {
  if (!systemConfigForm) return;
  const config = state.systemConfig || {};
  systemIndustryType.value = config.industryType || state.company?.industryType || 'general';
  systemEnabledModules.value = (config.enabledModules || ['core']).join(',');
  systemSyncEnabled.checked = Boolean(config.syncEnabled);
  systemConfigForm.style.display = state.session?.user?.isAdmin ? '' : 'none';
}

function renderRooms() {
  if (!roomsTableBody) return;
  roomsTableBody.innerHTML = '';
  if (!state.rooms.length) {
    roomsTableBody.innerHTML = '<tr><td colspan="4">No rooms found.</td></tr>';
    return;
  }
  state.rooms.forEach((row) => roomsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${row.roomNumber}</td><td>${row.roomType || '-'}</td><td>${currency(row.rate)}</td><td>${row.status}</td></tr>`));
}

function renderGuests() {
  if (!guestsTableBody) return;
  guestsTableBody.innerHTML = '';
  if (!state.guests.length) {
    guestsTableBody.innerHTML = '<tr><td colspan="4">No guests found.</td></tr>';
    return;
  }
  state.guests.forEach((row) => guestsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${row.name}</td><td>${row.phone || '-'}</td><td>${row.email || '-'}</td><td>${row.notes || '-'}</td></tr>`));
}

function renderBookings() {
  if (!bookingsTableBody) return;
  bookingsTableBody.innerHTML = '';
  if (!state.bookings.length) {
    bookingsTableBody.innerHTML = '<tr><td colspan="6">No bookings found.</td></tr>';
  } else {
    state.bookings.forEach((row) => bookingsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${row.roomNumber}</td><td>${row.guestName}</td><td>${String(row.checkInDate || '').slice(0, 10)}</td><td>${String(row.checkOutDate || '').slice(0, 10)}</td><td>${row.status}</td><td><button class="btn btn-sm btn-outline-success" data-action="booking-checkin" data-id="${row.id}">Check-in</button> <button class="btn btn-sm btn-outline-primary" data-action="booking-checkout" data-id="${row.id}">Check-out</button></td></tr>`));
  }
  if (bookingRoomId) {
    bookingRoomId.innerHTML = '<option value="">Select Room</option>';
    state.rooms.forEach((r) => bookingRoomId.insertAdjacentHTML('beforeend', `<option value="${r.id}">${r.roomNumber} (${r.status})</option>`));
  }
  if (bookingGuestId) {
    bookingGuestId.innerHTML = '<option value="">Select Guest</option>';
    state.guests.forEach((g) => bookingGuestId.insertAdjacentHTML('beforeend', `<option value="${g.id}">${g.name}</option>`));
  }
}

function renderPatients() {
  if (!patientsTableBody) return;
  patientsTableBody.innerHTML = '';
  if (!state.patients.length) {
    patientsTableBody.innerHTML = '<tr><td colspan="3">No patients found.</td></tr>';
    return;
  }
  state.patients.forEach((row) => patientsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${row.name}</td><td>${row.phone || '-'}</td><td>${row.notes || '-'}</td></tr>`));
}

function renderDrugExpiry() {
  if (!drugExpiryTableBody) return;
  drugExpiryTableBody.innerHTML = '';
  if (!state.drugExpiry.length) {
    drugExpiryTableBody.innerHTML = '<tr><td colspan="4">No near-expiry drugs detected.</td></tr>';
    return;
  }
  state.drugExpiry.forEach((row) => drugExpiryTableBody.insertAdjacentHTML('beforeend', `<tr><td>${row.productName}</td><td>${row.batchNo || '-'}</td><td>${String(row.expiryDate || '').slice(0, 10)}</td><td>${row.qty}</td></tr>`));
}

function renderPosLookups() {
  if (!posProductId) return;
  const keep = posProductId.value;
  posProductId.innerHTML = '<option value="">Select Product</option>';
  state.products.forEach((p) => posProductId.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name} (${p.quantity})</option>`));
  posProductId.value = keep;
}

function renderReport(report, expenseReport = null, incomeReport = null, cashflowReport = null, revenueReport = null, combinedReport = null) {
  state.report = report;
  exportReportBtn.disabled = false;
  reportRangeLabel.textContent = `${new Date(report.startDate).toLocaleString()} - ${new Date(report.endDate).toLocaleString()}`;
  reportTotalRevenue.textContent = currency(report.summary.totalRevenue);
  reportTotalTransactions.textContent = String(report.summary.totalTransactions);
  reportTotalItems.textContent = String(report.summary.totalItemsSold);
  reportTopProductsBody.innerHTML = report.topProducts.length ? '' : '<tr><td colspan="3">No sales in selected period.</td></tr>';
  for (const r of report.topProducts) reportTopProductsBody.insertAdjacentHTML('beforeend', `<tr><td>${r.name}</td><td>${r.unitsSold}</td><td>${currency(r.revenue)}</td></tr>`);
  reportCustomerSalesBody.innerHTML = report.customerSales.length ? '' : '<tr><td colspan="3">No customer sales in selected period.</td></tr>';
  for (const r of report.customerSales) reportCustomerSalesBody.insertAdjacentHTML('beforeend', `<tr><td>${r.customerName}</td><td>${r.transactions}</td><td>${currency(r.revenue)}</td></tr>`);
  if (reportInvoicePaymentsBody) {
    const rows = Array.isArray(report.invoicePayments) ? report.invoicePayments : [];
    reportInvoicePaymentsBody.innerHTML = rows.length ? '' : '<tr><td colspan="9">No invoice payment data in selected period.</td></tr>';
    rows.forEach((r) => reportInvoicePaymentsBody.insertAdjacentHTML('beforeend', `<tr>
      <td>${r.invoiceNumber || '-'}</td>
      <td>${r.customerName || '-'}</td>
      <td>${currency(r.totalAmount || 0)}</td>
      <td>${currency(r.amountPaid || 0)}</td>
      <td>${currency(r.balance || 0)}</td>
      <td><span class="${paymentStatusClass(r.paymentStatus)}">${paymentStatusLabel(r.paymentStatus)}</span></td>
      <td>${r.initiatedBy || 'N/A'}</td>
      <td>${r.lastPaymentByName || 'N/A'}</td>
      <td>${r.lastPaymentAt ? new Date(r.lastPaymentAt).toLocaleString() : 'N/A'}</td>
    </tr>`));
  }
  if (reportTotalExpenses) reportTotalExpenses.textContent = currency(expenseReport?.totalExpenses || 0);
  if (reportTotalExtraIncome) reportTotalExtraIncome.textContent = currency(incomeReport?.totalIncome || 0);
  if (reportNetCashflow) reportNetCashflow.textContent = currency(cashflowReport?.net || 0);
  if (reportTotalEarnedRevenue) reportTotalEarnedRevenue.textContent = currency(revenueReport?.totalRevenue || 0);
  if (reportTotalCashReceived) reportTotalCashReceived.textContent = currency(revenueReport?.totalCashReceived || 0);
  if (reportTotalOutstandingRevenue) reportTotalOutstandingRevenue.textContent = currency(revenueReport?.outstandingRevenue || 0);
  if (reportCombinedNetProfit) reportCombinedNetProfit.textContent = currency(combinedReport?.netProfit || 0);
  if (reportRevenueByCustomerBody) {
    const rows = Array.isArray(revenueReport?.byCustomer) ? revenueReport.byCustomer : [];
    reportRevenueByCustomerBody.innerHTML = rows.length ? '' : '<tr><td colspan="5">No revenue by customer data.</td></tr>';
    rows.forEach((r) => reportRevenueByCustomerBody.insertAdjacentHTML('beforeend', `<tr><td>${r.customerName}</td><td>${r.invoices}</td><td>${currency(r.totalRevenue || 0)}</td><td>${currency(r.totalCashReceived || 0)}</td><td>${currency(r.outstandingRevenue || 0)}</td></tr>`));
  }
  if (reportExpenseByCategoryBody) {
    const rows = Array.isArray(expenseReport?.byCategory) ? expenseReport.byCategory : [];
    reportExpenseByCategoryBody.innerHTML = rows.length ? '' : '<tr><td colspan="2">No expense category data.</td></tr>';
    rows.forEach((r) => reportExpenseByCategoryBody.insertAdjacentHTML('beforeend', `<tr><td>${r.categoryName}</td><td>${currency(r.total || 0)}</td></tr>`));
  }
  if (reportExpenseByVendorBody) {
    const rows = Array.isArray(expenseReport?.byVendor) ? expenseReport.byVendor : [];
    reportExpenseByVendorBody.innerHTML = rows.length ? '' : '<tr><td colspan="2">No vendor expense data.</td></tr>';
    rows.forEach((r) => reportExpenseByVendorBody.insertAdjacentHTML('beforeend', `<tr><td>${r.vendorName}</td><td>${currency(r.total || 0)}</td></tr>`));
  }
  if (reportIncomeByCategoryBody) {
    const rows = Array.isArray(incomeReport?.byCategory) ? incomeReport.byCategory : [];
    reportIncomeByCategoryBody.innerHTML = rows.length ? '' : '<tr><td colspan="2">No income category data.</td></tr>';
    rows.forEach((r) => reportIncomeByCategoryBody.insertAdjacentHTML('beforeend', `<tr><td>${r.categoryName}</td><td>${currency(r.total || 0)}</td></tr>`));
  }
}

async function startCamera() {
  if (state.stream) return;
  state.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
  clockInVideo.srcObject = state.stream;
}

function stopCamera() {
  if (!state.stream) return;
  state.stream.getTracks().forEach((t) => t.stop());
  state.stream = null;
  clockInVideo.srcObject = null;
}

async function refreshSession() {
  state.session = await api.getSession();
  state.companies = state.session?.companies || [];
  state.userCompanies = state.session?.userCompanies || [];
  if (state.session?.activeCompanyId) {
    window.localStorage.setItem('asw.activeCompanyId', String(state.session.activeCompanyId));
  }
  state.currentUserRole = normalizeUserRole(state.session?.user?.userRole || (state.session?.user?.isAdmin ? 'admin' : 'manager'));
  const activeCompany = state.companies.find((c) => Number(c.id) === Number(state.session?.activeCompanyId));
  state.currentIndustry = normalizeIndustry(activeCompany?.industryType || state.currentIndustry || 'general');
  if (state.session?.authenticated && typeof api.getIndustryModuleConfig === 'function') {
    try {
      state.moduleConfig = await api.getIndustryModuleConfig();
    } catch {
      // Keep previous module config when unavailable.
    }
  }
  updateAuthUi();
  renderSectionAccess();
  renderCompanySwitcher();
}

async function refreshData() {
  const moduleConfig = await (api.getIndustryModuleConfig?.() || Promise.resolve({ industry: 'general', visibleSidebarItems: [], enabledFeatures: {}, labelMap: {}, enabledModules: ['core'] }));
  let systemConfig = { industryType: moduleConfig.industry || 'general', syncEnabled: false, enabledModules: ['core'], featureToggles: {} };
  try {
    if (typeof api.getSystemConfiguration === 'function') {
      const cfg = await api.getSystemConfiguration();
      if (cfg) systemConfig = { industryType: cfg.industryType || moduleConfig.industry || 'general', syncEnabled: Boolean(cfg.syncEnabled), enabledModules: cfg.enabledModules || ['core'], featureToggles: cfg.featureToggles || {} };
    }
  } catch {
    // Non-admin users can continue without editable system configuration.
  }
  state.moduleConfig = moduleConfig || state.moduleConfig;
  state.systemConfig = systemConfig || state.systemConfig;
  state.currentIndustry = normalizeIndustry(systemConfig?.industryType || moduleConfig?.industry || state.currentIndustry);

  const allowedWidgets = new Set(getAllowedDashboardWidgets());
  const hospitalityEnabled = Boolean(state.moduleConfig?.enabledFeatures?.hospitality) || ['active_bookings', 'room_occupancy', 'today_checkins', 'today_checkouts'].some((x) => allowedWidgets.has(x));
  const medicalEnabled = Boolean(state.moduleConfig?.enabledFeatures?.medical) || ['patients_today', 'low_drug_stock', 'expiring_drugs', 'recent_prescriptions'].some((x) => allowedWidgets.has(x));

  const [categories, suppliers, customers, products, vendors, expenseCategories, incomeCategories, expenses, incomes, wallet, transactions, stats, company, invoices, clockIns, dashboardSalesReport, rooms, guests, bookings, patients, drugExpiry, insights] = await Promise.all([
    can('categories', 'view') ? api.getCategories() : Promise.resolve([]),
    can('suppliers', 'view') ? api.getSuppliers() : Promise.resolve([]),
    can('customers', 'view') ? api.getCustomers() : Promise.resolve([]),
    can('products', 'view') ? api.getProducts() : Promise.resolve([]),
    can('vendors', 'view') ? api.getVendors({}) : Promise.resolve([]),
    can('expenses', 'view') ? api.getExpenseCategories() : Promise.resolve([]),
    can('income', 'view') ? api.getIncomeCategories() : Promise.resolve([]),
    can('expenses', 'view') ? api.getExpenses({ limit: 200 }) : Promise.resolve([]),
    can('income', 'view') ? api.getIncome({ limit: 200 }) : Promise.resolve([]),
    can('cashflow', 'view') ? api.getWallet() : Promise.resolve({ currentBalance: 0, lastUpdatedAt: '' }),
    can('cashflow', 'view') ? api.getCashflowTransactions({ limit: 300 }) : Promise.resolve([]),
    can('dashboard', 'view') ? api.getDashboardStats() : Promise.resolve({ totalProducts: 0, totalSales: 0, totalTransactions: 0, lowStock: [], recentClockIns: [], periods: {}, topSellingProducts: [], staffClockInSummary: [], debtors: [], totalInflow: 0, totalOutflow: 0, walletBalance: 0, totalRevenue: 0, totalCashReceived: 0, outstandingRevenue: 0, includeRevenueInBalance: false, projectedBalance: 0, recentActivities: [] }),
    can('company', 'view') ? api.getActiveCompany() : Promise.resolve({}),
    can('invoices', 'view') ? api.getInvoices({ limit: 100 }) : Promise.resolve([]),
    can('dashboard', 'view') ? api.getRecentClockIns({ limit: 300, allCompanies: Boolean(state.session?.user?.isAdmin) }) : Promise.resolve([]),
    (can('dashboard', 'view') && state.session?.user?.isAdmin && can('reports', 'view'))
      ? api.getSalesReport({ period: 'monthly' })
      : Promise.resolve(null),
    hospitalityEnabled ? api.getRooms() : Promise.resolve([]),
    hospitalityEnabled ? api.getGuests() : Promise.resolve([]),
    hospitalityEnabled ? api.getBookings() : Promise.resolve([]),
    medicalEnabled ? api.getPatients() : Promise.resolve([]),
    medicalEnabled ? api.getDrugExpiry({ daysAhead: 30 }) : Promise.resolve([]),
    can('reports', 'view') ? api.getInsights({ limit: 100 }) : Promise.resolve([])
  ]);
  const invoiceSettings = can('settings', 'view') ? await api.getInvoiceSettings() : { defaultTaxRate: 0, termsConditions: '' };
  const emailSettings = can('settings', 'edit')
    ? await api.getEmailSettings()
    : { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpSecure: false, hasPassword: false };
  state.categories = categories; state.suppliers = suppliers; state.customers = customers; state.products = products; state.vendors = vendors; state.expenseCategories = expenseCategories; state.incomeCategories = incomeCategories; state.expenses = expenses; state.incomes = incomes; state.wallet = wallet || { currentBalance: 0, lastUpdatedAt: '' }; state.cashflowTransactions = transactions || []; state.company = company; state.invoices = invoices; state.clockIns = clockIns; state.dashboardSalesReport = dashboardSalesReport; state.invoiceSettings = invoiceSettings || { defaultTaxRate: 0, termsConditions: '', includeRevenueInBalance: false }; state.emailSettings = emailSettings || { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpSecure: false, hasPassword: false };
  state.currentIndustry = normalizeIndustry(state.company?.industryType || state.systemConfig?.industryType || state.currentIndustry);
  state.rooms = rooms || [];
  state.guests = guests || [];
  state.bookings = bookings || [];
  state.patients = patients || [];
  state.drugExpiry = drugExpiry || [];
  state.insights = insights || [];
  state.roles = can('roles', 'view') ? await api.getRoles() : [];
  state.users = can('users', 'view') ? await api.getUsers() : [];
  await handleLegacyIndustryConfirmation();
  if (!state.invoiceDraft.invoiceNumber) await refreshInvoiceNumber();
  if (state.invoiceDraft.useDefaultTax) invoiceTaxPercent.value = String(Number(state.invoiceSettings.defaultTaxRate || 0));
  renderLookups(); renderPosLookups(); renderProducts(); renderCategories(); renderSuppliers(); renderCustomers(); renderVendors(); renderExpenses(); renderIncome(); renderCashflow(); renderInvoices(); renderUsers(); renderRoles(); renderDashboard(stats, state.dashboardSalesReport); applyDashboardWidgetVisibility(); renderClockInGallery(state.clockIns); renderCompany(); renderSystemConfiguration(); renderRooms(); renderGuests(); renderBookings(); renderPatients(); renderDrugExpiry(); renderInvoiceSettings(); renderInvoiceItems(); renderInvoicePreview(); applyReportVisibility(); if (invoicePaymentHistoryBody && !invoicePaymentHistoryBody.children.length) renderInvoicePaymentHistory([], 0); initPopupFormLaunchers(); renderSectionAccess(); applyFormAccess();
}

async function safeRefresh() {
  await refreshSession();
  if (state.session?.authenticated && state.session.clockedIn) await refreshData();
}

let dashboardLiveTimer = null;
let detachUpdateStatusListener = null;
let manualUpdateCheckRequested = false;
let lastUpdateState = 'idle';
let lastDownloadedNoticeKey = '';

function stopDashboardLiveUpdates() {
  if (dashboardLiveTimer) {
    clearInterval(dashboardLiveTimer);
    dashboardLiveTimer = null;
  }
}

function startDashboardLiveUpdates() {
  stopDashboardLiveUpdates();
  dashboardLiveTimer = setInterval(async () => {
    try {
      if (!state.session?.authenticated || !state.session?.clockedIn || !can('dashboard', 'view')) return;
      const [stats, clockIns, salesReport] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentClockIns({ limit: 300, allCompanies: Boolean(state.session?.user?.isAdmin) }),
        (state.session?.user?.isAdmin && can('reports', 'view')) ? api.getSalesReport({ period: 'monthly' }) : Promise.resolve(null)
      ]);
      state.clockIns = clockIns;
      state.dashboardSalesReport = salesReport;
      renderDashboard(stats, salesReport);
      renderClockInGallery(state.clockIns);
    } catch {
      // Keep UI stable even when periodic refresh fails temporarily.
    }
  }, 15000);
}

function resetSimpleForms() {
  productForm.reset(); productIdInput.value = ''; minStockInput.value = '5'; productFormTitle.textContent = 'Add Product'; cancelEditBtn.hidden = true;
  categoryForm.reset(); categoryIdField.value = '';
  supplierForm.reset(); supplierIdField.value = '';
  customerForm.reset(); customerIdField.value = '';
  expenseForm?.reset();
  incomeForm?.reset();
  userForm.reset(); userIdField.value = ''; if (userBusinessRole) userBusinessRole.value = 'staff'; userRoleId.value = ''; userIsActive.value = '1';
  roleForm.reset(); roleIdField.value = ''; roleCancelBtn.hidden = true; renderRolePermissionGrid();
}

async function resetInvoiceDraft() {
  state.invoiceDraft = {
    type: 'invoice',
    status: 'draft',
    date: new Date().toISOString().slice(0, 10),
    invoiceNumber: '',
    customerId: '',
    taxPercent: Number(state.invoiceSettings.defaultTaxRate || 0),
    useDefaultTax: true,
    discountAmount: 0,
    amountPaid: 0,
    validityPeriod: '',
    notes: '',
    items: []
  };
  invoiceForm.reset();
  invoiceType.value = state.invoiceDraft.type;
  invoiceStatus.value = state.invoiceDraft.status;
  invoiceDate.value = state.invoiceDraft.date;
  invoiceCustomerId.value = '';
  invoiceItemQty.value = '1';
  invoiceUseDefaultTax.checked = true;
  invoiceTaxPercent.value = String(Number(state.invoiceSettings.defaultTaxRate || 0));
  invoiceTaxPercent.disabled = true;
  invoiceDiscountAmount.value = '0';
  invoiceAmountPaid.value = '0';
  invoiceValidityPeriod.value = '';
  invoiceNotes.value = '';
  await refreshInvoiceNumber();
  renderInvoiceItems();
  renderInvoicePreview();
  renderInvoicePaymentHistory([], 0);
}
function applyRouteFromHash() {
  if (!ENABLE_MULTI_INDUSTRY) {
    const hash = String(window.location.hash || '').replace(/^#/, '');
    const normalized = hash.startsWith('/') ? hash : (hash ? `/${hash}` : '/dashboard');
    const protectedRoutes = ['/rooms', '/bookings', '/guests', '/kitchen', '/drugs', '/patients', '/prescriptions', '/expiry'];
    if (protectedRoutes.includes(normalized)) {
      window.location.hash = '#/dashboard';
      return;
    }
  }
  const hash = String(window.location.hash || '').replace(/^#/, '');
  const normalized = hash.startsWith('/') ? hash : (hash ? `/${hash}` : '/dashboard');
  const mappedSection = sectionFromRoute(normalized);
  if (!mappedSection || !isSectionAllowed(mappedSection)) {
    setActiveSection('dashboard');
    return;
  }
  setActiveSection(mappedSection);
}

sidebarNav?.addEventListener('click', (e) => {
  const button = e.target.closest('.nav-link[data-section]');
  if (!button) return;
  setActiveSection(button.dataset.section);
});
window.addEventListener('hashchange', () => {
  applyRouteFromHash();
});
proMenu?.addEventListener('click', async (e) => {
  const rootBtn = e.target.closest('.menu-root-btn');
  if (rootBtn) {
    openProMenu(rootBtn);
    return;
  }
  const menuItem = e.target.closest('.menu-item[data-menu-action]');
  if (!menuItem) return;
  try {
    await handleMenuAction(menuItem.dataset.menuAction);
  } catch (err) {
    showStatus(err.message || 'Menu action failed.', 'error');
  } finally {
    closeProMenu();
  }
});
document.addEventListener('click', (e) => {
  if (!proMenu || proMenu.contains(e.target)) return;
  closeProMenu();
});
aboutModalCloseBtn?.addEventListener('click', () => aboutModal.classList.remove('active'));
aboutModal?.addEventListener('click', (e) => {
  if (e.target === aboutModal) aboutModal.classList.remove('active');
});
formPopupCloseBtn?.addEventListener('click', () => closeFormPopup());
formPopupOverlay?.addEventListener('click', (e) => {
  if (e.target === formPopupOverlay) closeFormPopup();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && formPopupState.active) closeFormPopup();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const preferredCompanyId = Number(window.localStorage.getItem('asw.activeCompanyId') || 0);
    await api.login({ username: loginUsername.value.trim(), password: loginPassword.value, preferredCompanyId });
    loginForm.reset(); loginMessage.textContent = '';
    await refreshSession();
    if (state.session.clockedIn) { await refreshData(); startDashboardLiveUpdates(); showStatus(`Welcome back, ${state.session.user.username}.`); }
    else { await startCamera(); showStatus('Clock-in required to continue.', 'warning'); }
  } catch (err) { loginMessage.textContent = err.message || 'Unable to login.'; }
});

logoutBtn.addEventListener('click', async () => { await api.logout(); stopDashboardLiveUpdates(); stopCamera(); await refreshSession(); showStatus('Logged out successfully.', 'warning'); });

companySwitcher.addEventListener('change', async () => {
  try {
    await api.switchCompany(Number(companySwitcher.value));
    window.localStorage.setItem('asw.activeCompanyId', String(companySwitcher.value));
    await refreshSession();
    if (state.session.clockedIn) { await refreshData(); startDashboardLiveUpdates(); showStatus('Active company switched.'); }
    else { await startCamera(); showStatus('Please clock in for the selected company.', 'warning'); }
  } catch (err) { showStatus(err.message || 'Unable to switch company.', 'error'); }
});

clockInBtn.addEventListener('click', async () => {
  try {
    if (!state.stream) await startCamera();
    const w = clockInVideo.videoWidth || 640, h = clockInVideo.videoHeight || 360;
    clockInCanvas.width = w; clockInCanvas.height = h;
    clockInCanvas.getContext('2d').drawImage(clockInVideo, 0, 0, w, h);
    await api.submitClockIn(clockInCanvas.toDataURL('image/jpeg', 0.85));
    clockInMessage.textContent = '';
    stopCamera();
    await refreshSession();
    await refreshData();
    startDashboardLiveUpdates();
    showStatus('Clock-in successful.');
  } catch (err) { clockInMessage.textContent = err.message || 'Clock-in failed.'; }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = { id: productIdInput.value ? Number(productIdInput.value) : undefined, name: nameInput.value.trim(), categoryId: categoryIdInput.value ? Number(categoryIdInput.value) : null, supplierId: supplierIdInput.value ? Number(supplierIdInput.value) : null, minStock: Number(minStockInput.value), price: Number(priceInput.value), quantity: Number(quantityInput.value) };
    if (payload.id) await api.updateProduct(payload); else await api.createProduct(payload);
    closeFormPopup(); resetSimpleForms(); await refreshData(); showStatus('Product saved.');
  } catch (err) { showStatus(err.message || 'Product save failed.', 'error'); }
});

productsTableBody.addEventListener('click', async (e) => {
  const t = e.target; if (!(t instanceof HTMLButtonElement)) return;
  const id = Number(t.dataset.id); const row = state.products.find((p) => p.id === id); if (!row) return;
  try {
    if (t.dataset.action === 'edit-product') {
      productIdInput.value = String(row.id); nameInput.value = row.name; categoryIdInput.value = row.categoryId ? String(row.categoryId) : ''; supplierIdInput.value = row.supplierId ? String(row.supplierId) : ''; minStockInput.value = String(row.minStock); priceInput.value = String(row.price); quantityInput.value = String(row.quantity); productFormTitle.textContent = `Edit Product #${row.id}`; cancelEditBtn.hidden = false; setActiveSection('products');
      openFormPopup(formCardOf(productForm), 'Product Form');
    } else if (t.dataset.action === 'delete-product') {
      if (!window.confirm(`Delete "${row.name}"?`)) return;
      await api.deleteProduct(row.id); await refreshData(); showStatus('Product deleted.');
    } else if (t.dataset.action === 'sell-product') {
      saleProductIdInput.value = String(row.id); saleQuantityInput.focus();
    }
  } catch (err) { showStatus(err.message || 'Product action failed.', 'error'); }
});

saleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const amountPaidRaw = String(saleAmountPaidInput?.value || '').trim();
    await api.recordSale({
      productId: Number(saleProductIdInput.value),
      customerId: saleCustomerIdInput.value ? Number(saleCustomerIdInput.value) : null,
      quantity: Number(saleQuantityInput.value),
      amountPaid: amountPaidRaw ? Number(amountPaidRaw) : undefined
    });
    saleForm.reset(); await refreshData(); showStatus('Sale recorded.');
  } catch (err) { showStatus(err.message || 'Sale failed.', 'error'); }
});

posToggleBtn?.addEventListener('click', () => {
  state.posMode = !state.posMode;
  posToggleBtn.textContent = state.posMode ? 'Disable POS Mode' : 'Enable POS Mode';
  showStatus(state.posMode ? 'POS mode enabled.' : 'POS mode disabled.');
});
posForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const productId = Number(posProductId.value || 0);
    const quantity = Number(posQty.value || 1);
    if (!productId || quantity <= 0) throw new Error('Select product and quantity.');
    await api.recordSale({ productId, quantity, amountPaid: null });
    posQty.value = '1';
    await refreshData();
    showStatus('Fast checkout completed.');
  } catch (err) { showStatus(err.message || 'POS checkout failed.', 'error'); }
});
roomForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createRoom({ roomNumber: roomNumber.value.trim(), roomType: roomType.value.trim(), rate: Number(roomRate.value || 0) });
    roomForm.reset();
    await refreshData();
    showStatus('Room added.');
  } catch (err) { showStatus(err.message || 'Room save failed.', 'error'); }
});
guestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createGuest({ name: guestName.value.trim(), phone: guestPhone.value.trim(), email: guestEmail.value.trim(), notes: guestNotes.value.trim() });
    guestForm.reset();
    await refreshData();
    showStatus('Guest added.');
  } catch (err) { showStatus(err.message || 'Guest save failed.', 'error'); }
});
bookingForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createBooking({
      roomId: Number(bookingRoomId.value || 0),
      guestId: Number(bookingGuestId.value || 0),
      checkInDate: bookingCheckInDate.value,
      checkOutDate: bookingCheckOutDate.value,
      notes: bookingNotes.value.trim()
    });
    bookingForm.reset();
    await refreshData();
    showStatus('Booking created.');
  } catch (err) { showStatus(err.message || 'Booking failed.', 'error'); }
});
bookingsTableBody?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action][data-id]');
  if (!btn) return;
  const id = Number(btn.dataset.id || 0);
  if (!id) return;
  try {
    if (btn.dataset.action === 'booking-checkin') await api.updateBookingStatus({ id, status: 'checked_in' });
    if (btn.dataset.action === 'booking-checkout') await api.updateBookingStatus({ id, status: 'checked_out' });
    await refreshData();
    showStatus('Booking status updated.');
  } catch (err) { showStatus(err.message || 'Booking status update failed.', 'error'); }
});
patientForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createPatient({ name: patientName.value.trim(), phone: patientPhone.value.trim(), notes: patientNotes.value.trim() });
    patientForm.reset();
    await refreshData();
    showStatus('Patient record added.');
  } catch (err) { showStatus(err.message || 'Patient save failed.', 'error'); }
});

categoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try { if (categoryIdField.value) await api.updateCategory({ id: Number(categoryIdField.value), name: categoryName.value.trim() }); else await api.createCategory({ name: categoryName.value.trim() }); closeFormPopup(); resetSimpleForms(); await refreshData(); showStatus('Category saved.'); } catch (err) { showStatus(err.message || 'Category failed.', 'error'); }
});
categoriesTableBody.addEventListener('click', async (e) => {
  const t = e.target; if (!(t instanceof HTMLButtonElement)) return; const row = state.categories.find((c) => c.id === Number(t.dataset.id)); if (!row) return;
  try { if (t.dataset.action === 'edit-category') { categoryIdField.value = String(row.id); categoryName.value = row.name; openFormPopup(formCardOf(categoryForm), 'Category Form'); } else if (t.dataset.action === 'delete-category') { if (!window.confirm(`Delete category "${row.name}"?`)) return; await api.deleteCategory(row.id); await refreshData(); showStatus('Category deleted.'); } } catch (err) { showStatus(err.message || 'Category action failed.', 'error'); }
});

supplierForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try { const p = { id: supplierIdField.value ? Number(supplierIdField.value) : undefined, name: supplierName.value.trim(), contactInfo: supplierContact.value.trim() }; if (p.id) await api.updateSupplier(p); else await api.createSupplier(p); closeFormPopup(); resetSimpleForms(); await refreshData(); showStatus('Supplier saved.'); } catch (err) { showStatus(err.message || 'Supplier failed.', 'error'); }
});
suppliersTableBody.addEventListener('click', async (e) => {
  const t = e.target; if (!(t instanceof HTMLButtonElement)) return; const row = state.suppliers.find((s) => s.id === Number(t.dataset.id)); if (!row) return;
  try { if (t.dataset.action === 'edit-supplier') { supplierIdField.value = String(row.id); supplierName.value = row.name; supplierContact.value = row.contactInfo || ''; openFormPopup(formCardOf(supplierForm), 'Supplier Form'); } else if (t.dataset.action === 'delete-supplier') { if (!window.confirm(`Delete supplier "${row.name}"?`)) return; await api.deleteSupplier(row.id); await refreshData(); showStatus('Supplier deleted.'); } } catch (err) { showStatus(err.message || 'Supplier action failed.', 'error'); }
});

customerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try { const p = { id: customerIdField.value ? Number(customerIdField.value) : undefined, name: customerName.value.trim(), phone: customerPhone.value.trim(), email: customerEmail.value.trim() }; if (p.id) await api.updateCustomer(p); else await api.createCustomer(p); closeFormPopup(); resetSimpleForms(); await refreshData(); showStatus('Customer saved.'); } catch (err) { showStatus(err.message || 'Customer failed.', 'error'); }
});
customersTableBody.addEventListener('click', async (e) => {
  const t = e.target; if (!(t instanceof HTMLButtonElement)) return; const row = state.customers.find((c) => c.id === Number(t.dataset.id)); if (!row) return;
  try { if (t.dataset.action === 'edit-customer') { customerIdField.value = String(row.id); customerName.value = row.name; customerPhone.value = row.phone || ''; customerEmail.value = row.email || ''; openFormPopup(formCardOf(customerForm), 'Customer Form'); } else if (t.dataset.action === 'delete-customer') { if (!window.confirm(`Delete customer "${row.name}"?`)) return; await api.deleteCustomer(row.id); await refreshData(); showStatus('Customer deleted.'); } } catch (err) { showStatus(err.message || 'Customer action failed.', 'error'); }
});

addVendorQuickBtn?.addEventListener('click', async () => {
  try {
    const name = String(expenseNewVendorName?.value || '').trim();
    if (!name) throw new Error('Enter vendor name first.');
    const created = await api.createVendor({ name, type: expenseNewVendorType?.value || 'supplier' });
    expenseNewVendorName.value = '';
    await refreshData();
    if (expenseVendorId) expenseVendorId.value = String(created.id);
    showStatus('Vendor created.');
  } catch (err) {
    showStatus(err.message || 'Unable to create vendor.', 'error');
  }
});

addExpenseCategoryBtn?.addEventListener('click', async () => {
  try {
    const name = String(expenseCategoryName?.value || '').trim();
    if (!name) throw new Error('Enter expense category name first.');
    const created = await api.createExpenseCategory({ name });
    expenseCategoryName.value = '';
    await refreshData();
    if (expenseCategoryId) expenseCategoryId.value = String(created.id);
    showStatus('Expense category created.');
  } catch (err) {
    showStatus(err.message || 'Unable to create expense category.', 'error');
  }
});

expenseForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = {
      vendorId: Number(expenseVendorId?.value || 0),
      categoryId: Number(expenseCategoryId?.value || 0),
      amount: Number(expenseAmount?.value || 0),
      description: String(expenseDescription?.value || '').trim(),
      createdAt: expenseDate?.value ? new Date(expenseDate.value).toISOString() : new Date().toISOString()
    };
    await api.createExpense(payload);
    expenseForm.reset();
    if (expenseDate) expenseDate.value = '';
    await refreshData();
    showStatus('Expense recorded.');
  } catch (err) {
    showStatus(err.message || 'Expense failed.', 'error');
  }
});

addIncomeCategoryBtn?.addEventListener('click', async () => {
  try {
    const name = String(incomeCategoryName?.value || '').trim();
    if (!name) throw new Error('Enter income category name first.');
    const created = await api.createIncomeCategory({ name });
    incomeCategoryName.value = '';
    await refreshData();
    if (incomeCategoryId) incomeCategoryId.value = String(created.id);
    showStatus('Income category created.');
  } catch (err) {
    showStatus(err.message || 'Unable to create income category.', 'error');
  }
});

incomeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = {
      categoryId: Number(incomeCategoryId?.value || 0),
      sourceName: String(incomeSourceName?.value || '').trim(),
      amount: Number(incomeAmount?.value || 0),
      description: String(incomeDescription?.value || '').trim(),
      createdAt: incomeDate?.value ? new Date(incomeDate.value).toISOString() : new Date().toISOString()
    };
    await api.createIncome(payload);
    incomeForm.reset();
    if (incomeDate) incomeDate.value = '';
    await refreshData();
    showStatus('Additional inflow recorded.');
  } catch (err) {
    showStatus(err.message || 'Income failed.', 'error');
  }
});

invoiceType.addEventListener('change', async () => {
  try {
    state.invoiceDraft.type = invoiceType.value;
    await refreshInvoiceNumber();
    renderInvoicePreview();
  } catch (err) { showStatus(err.message || 'Unable to regenerate document number.', 'error'); }
});
invoiceStatus.addEventListener('change', () => { state.invoiceDraft.status = invoiceStatus.value; renderInvoicePreview(); });
invoiceDate.addEventListener('change', () => { state.invoiceDraft.date = invoiceDate.value; renderInvoicePreview(); });
invoiceCustomerId.addEventListener('change', () => { state.invoiceDraft.customerId = invoiceCustomerId.value; renderInvoicePreview(); });
invoiceUseDefaultTax.addEventListener('change', () => {
  state.invoiceDraft.useDefaultTax = Boolean(invoiceUseDefaultTax.checked);
  if (state.invoiceDraft.useDefaultTax) {
    invoiceTaxPercent.value = String(Number(state.invoiceSettings.defaultTaxRate || 0));
    state.invoiceDraft.taxPercent = Number(state.invoiceSettings.defaultTaxRate || 0);
    invoiceTaxPercent.disabled = true;
  } else {
    invoiceTaxPercent.disabled = false;
  }
  renderInvoiceItems();
  renderInvoicePreview();
});
invoiceTaxPercent.addEventListener('input', () => {
  state.invoiceDraft.taxPercent = Math.max(0, Number(invoiceTaxPercent.value || 0));
  renderInvoiceItems();
  renderInvoicePreview();
});
invoiceDiscountAmount.addEventListener('input', () => { state.invoiceDraft.discountAmount = Math.max(0, Number(invoiceDiscountAmount.value || 0)); renderInvoiceItems(); renderInvoicePreview(); });
invoiceAmountPaid.addEventListener('input', () => { state.invoiceDraft.amountPaid = Math.max(0, Number(invoiceAmountPaid.value || 0)); renderInvoiceItems(); renderInvoicePreview(); });
invoiceValidityPeriod.addEventListener('input', () => { state.invoiceDraft.validityPeriod = String(invoiceValidityPeriod.value || '').trim(); renderInvoicePreview(); });
invoiceNotes.addEventListener('input', () => { state.invoiceDraft.notes = String(invoiceNotes.value || '').trim(); renderInvoicePreview(); });
invoiceNumber.addEventListener('input', () => { state.invoiceDraft.invoiceNumber = invoiceNumber.value.trim(); renderInvoicePreview(); });
invoiceRegenerateBtn.addEventListener('click', async () => {
  try { await refreshInvoiceNumber(); renderInvoicePreview(); } catch (err) { showStatus(err.message || 'Unable to generate number.', 'error'); }
});
addInvoiceItemBtn.addEventListener('click', () => {
  try {
    const productId = Number(invoiceProductId.value);
    const quantity = Number(invoiceItemQty.value || 1);
    if (!productId || quantity <= 0) throw new Error('Select a product and valid quantity.');
    const product = state.products.find((p) => p.id === productId);
    if (!product) throw new Error('Selected product was not found.');
    const existing = state.invoiceDraft.items.find((x) => x.productId === productId);
    if (existing) {
      existing.quantity += quantity;
      existing.lineTotal = Number((existing.quantity * existing.unitPrice).toFixed(2));
    } else {
      state.invoiceDraft.items.push({
        productId,
        name: product.name,
        quantity,
        unitPrice: Number(Number(product.price).toFixed(2)),
        lineTotal: Number((Number(product.price) * quantity).toFixed(2))
      });
    }
    renderInvoiceItems();
    renderInvoicePreview();
  } catch (err) { showStatus(err.message || 'Unable to add item.', 'error'); }
});
invoiceItemsBody.addEventListener('input', (e) => {
  const row = e.target.closest('tr');
  if (!row) return;
  const idx = Number(row.dataset.index);
  const item = state.invoiceDraft.items[idx];
  if (!item) return;
  if (e.target.classList.contains('invoice-qty')) item.quantity = Math.max(1, Number(e.target.value || 1));
  if (e.target.classList.contains('invoice-price')) item.unitPrice = Math.max(0, Number(e.target.value || 0));
  item.lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
  renderInvoiceItems();
  renderInvoicePreview();
});
invoiceItemsBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action="remove-item"]');
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  state.invoiceDraft.items.splice(idx, 1);
  renderInvoiceItems();
  renderInvoicePreview();
});
saveInvoiceBtn.addEventListener('click', async () => {
  try {
    const chosenCustomerId = Number(invoiceCustomerId.value || 0);
    if (!chosenCustomerId && !state.customers.length) {
      showStatus('No customers yet. A Walk-in Customer will be created automatically.', 'warning');
    }
    const payload = {
      type: invoiceType.value,
      status: invoiceStatus.value,
      date: invoiceDate.value,
      invoiceNumber: invoiceNumber.value.trim(),
      customerId: chosenCustomerId,
      taxPercent: state.invoiceDraft.useDefaultTax ? '' : Math.max(0, Number(invoiceTaxPercent.value || 0)),
      discountAmount: Math.max(0, Number(invoiceDiscountAmount.value || 0)),
      amountPaid: Math.max(0, Number(invoiceAmountPaid.value || 0)),
      validityPeriod: String(invoiceValidityPeriod.value || '').trim(),
      notes: String(invoiceNotes.value || '').trim(),
      items: state.invoiceDraft.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))
    };
    const saved = await api.createInvoice(payload);
    await refreshData();
    await resetInvoiceDraft();
    showStatus(`${invoiceTypeLabel(saved.type)} saved: ${saved.invoiceNumber}`);
  } catch (err) { showStatus(err.message || 'Failed to save document.', 'error'); }
});
saveAndPrintInvoiceBtn.addEventListener('click', async () => {
  try {
    const chosenCustomerId = Number(invoiceCustomerId.value || 0);
    if (!chosenCustomerId && !state.customers.length) {
      showStatus('No customers yet. A Walk-in Customer will be created automatically.', 'warning');
    }
    const payload = {
      type: invoiceType.value,
      status: invoiceStatus.value,
      date: invoiceDate.value,
      invoiceNumber: invoiceNumber.value.trim(),
      customerId: chosenCustomerId,
      taxPercent: state.invoiceDraft.useDefaultTax ? '' : Math.max(0, Number(invoiceTaxPercent.value || 0)),
      discountAmount: Math.max(0, Number(invoiceDiscountAmount.value || 0)),
      amountPaid: Math.max(0, Number(invoiceAmountPaid.value || 0)),
      validityPeriod: String(invoiceValidityPeriod.value || '').trim(),
      notes: String(invoiceNotes.value || '').trim(),
      items: state.invoiceDraft.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))
    };
    const saved = await api.createInvoice(payload);
    const exported = await api.exportInvoicePdf({ id: saved.id, openAfterSave: true });
    await refreshData();
    await resetInvoiceDraft();
    if (exported.cancelled) showStatus('Saved. PDF export cancelled.', 'warning');
    else showStatus(`Saved and exported: ${exported.filePath}`);
  } catch (err) { showStatus(err.message || 'Failed to save/export document.', 'error'); }
});
clearInvoiceDraftBtn.addEventListener('click', async () => {
  try { await resetInvoiceDraft(); showStatus('Draft cleared.', 'warning'); } catch (err) { showStatus(err.message || 'Unable to clear draft.', 'error'); }
});
downloadPreviewPdfBtn.addEventListener('click', async () => {
  try {
    const customerId = Number(invoiceCustomerId.value || 0);
    if (!customerId) throw new Error('Select a customer first.');
    const items = (state.invoiceDraft.items || []).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0)
    }));
    if (!items.length) throw new Error('Add at least one item.');
    const payload = {
      type: invoiceType.value,
      status: invoiceStatus.value,
      invoiceNumber: invoiceNumber.value.trim(),
      date: invoiceDate.value,
      customerId,
      taxPercent: state.invoiceDraft.useDefaultTax ? Number(state.invoiceSettings.defaultTaxRate || 0) : Math.max(0, Number(invoiceTaxPercent.value || 0)),
      discountAmount: Math.max(0, Number(invoiceDiscountAmount.value || 0)),
      amountPaid: Math.max(0, Number(invoiceAmountPaid.value || 0)),
      validityPeriod: String(invoiceValidityPeriod.value || '').trim(),
      notes: String(invoiceNotes.value || '').trim(),
      termsConditions: settingsTermsConditions?.value || state.invoiceSettings.termsConditions || '',
      items,
      openAfterSave: true
    };
    const result = await api.exportPreviewInvoicePdf(payload);
    if (result.cancelled) return showStatus('Preview PDF export cancelled.', 'warning');
    showStatus(`Preview PDF exported: ${result.filePath}`);
  } catch (err) { showStatus(err.message || 'Preview PDF export failed.', 'error'); }
});
invoicesTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  try {
    if (btn.dataset.action === 'view-invoice') {
      const inv = await api.getInvoiceById(Number(btn.dataset.id));
      const history = await api.getInvoicePayments(Number(btn.dataset.id));
      loadInvoiceIntoDraft(inv);
      renderInvoicePaymentHistory(history, Number(inv.totalAmount || 0));
      showStatus(`${invoiceTypeLabel(inv.type)} loaded into preview.`);
      return;
    }
    if (btn.dataset.action === 'add-payment') {
      await addInvoicePaymentFlow(Number(btn.dataset.id));
      return;
    }
    if (btn.dataset.action === 'export-invoice') {
      const result = await api.exportInvoicePdf({ id: Number(btn.dataset.id), openAfterSave: true });
      if (result.cancelled) return showStatus('Export cancelled.', 'warning');
      showStatus(`PDF exported: ${result.filePath}`);
    }
  } catch (err) { showStatus(err.message || 'Invoice action failed.', 'error'); }
});

dashboardDebtorsBody?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  try {
    if (btn.dataset.action === 'view-invoice') {
      const inv = await api.getInvoiceById(Number(btn.dataset.id));
      const history = await api.getInvoicePayments(Number(btn.dataset.id));
      loadInvoiceIntoDraft(inv);
      renderInvoicePaymentHistory(history, Number(inv.totalAmount || 0));
      setActiveSection('invoices');
      showStatus(`${invoiceTypeLabel(inv.type)} loaded into preview.`);
      return;
    }
    if (btn.dataset.action === 'add-payment') {
      await addInvoicePaymentFlow(Number(btn.dataset.id));
      return;
    }
  } catch (err) {
    showStatus(err.message || 'Debtor action failed.', 'error');
  }
});

roleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = {
      id: roleIdField.value ? Number(roleIdField.value) : undefined,
      roleName: roleName.value.trim(),
      permissions: buildRolePermissionsFromForm()
    };
    if (!payload.roleName) throw new Error('Role name is required.');
    if (payload.id) await api.updateRole(payload); else await api.createRole(payload);
    closeFormPopup();
    roleForm.reset(); roleIdField.value = ''; roleCancelBtn.hidden = true; renderRolePermissionGrid();
    await safeRefresh();
    showStatus('Role saved.');
  } catch (err) { showStatus(err.message || 'Role save failed.', 'error'); }
});

roleCancelBtn.addEventListener('click', () => {
  roleForm.reset(); roleIdField.value = ''; roleCancelBtn.hidden = true; renderRolePermissionGrid();
});

rolesTableBody.addEventListener('click', async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLButtonElement)) return;
  const role = state.roles.find((r) => r.id === Number(t.dataset.id));
  if (!role) return;
  try {
    if (t.dataset.action === 'edit-role') {
      roleIdField.value = String(role.id);
      roleName.value = role.roleName;
      renderRolePermissionGrid(role.permissions || {});
      roleCancelBtn.hidden = false;
      setActiveSection('roles');
      openFormPopup(formCardOf(roleForm), 'Role Form');
    } else if (t.dataset.action === 'delete-role') {
      if (!window.confirm(`Delete role "${role.roleName}"?`)) return;
      await api.deleteRole(role.id);
      await safeRefresh();
      showStatus('Role deleted.');
    }
  } catch (err) { showStatus(err.message || 'Role action failed.', 'error'); }
});

[searchInput, filterCategory, filterSupplier].forEach((el) => { el.addEventListener('input', renderProducts); el.addEventListener('change', renderProducts); });
clockInDateFilter?.addEventListener('change', () => renderClockInGallery(state.clockIns));
restartInstallBtn?.addEventListener('click', async () => {
  try {
    const result = await api.installDownloadedUpdate?.();
    if (!result?.ok) {
      showStatus('Update is not ready for install yet.', 'warning');
      return;
    }
    showStatus('Restarting to install update...', 'warning');
  } catch (err) {
    showStatus(err.message || 'Unable to install update.', 'error');
  }
});

generateReportBtn.addEventListener('click', async () => {
  try {
    const period = reportPeriod.value;
    const [salesReport, expenseReport, incomeReport, cashflowReport, revenueReport, combinedReport] = await Promise.all([
      api.getSalesReport({ period, paymentStatus: reportPaymentStatus?.value || 'all' }),
      api.getExpenseReport({ period }),
      api.getIncomeReport({ period }),
      api.getCashflowReport({ period }),
      api.getRevenueReport({ period }),
      api.getCombinedFinancialReport({ period })
    ]);
    renderReport(salesReport, expenseReport, incomeReport, cashflowReport, revenueReport, combinedReport);
    showStatus('Report generated.');
  } catch (err) {
    showStatus(err.message || 'Report failed.', 'error');
  }
});
exportReportBtn.addEventListener('click', async () => { try { if (!state.report) throw new Error('Generate report first.'); const res = await api.exportSalesReportCsv(state.report); if (res.cancelled) return showStatus('CSV export cancelled.', 'warning'); showStatus(`Report exported: ${res.filePath}`); } catch (err) { showStatus(err.message || 'CSV export failed.', 'error'); } });

companyCreateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const name = newCompanyName.value.trim();
    const industryType = ENABLE_MULTI_INDUSTRY ? String(newCompanyIndustryType?.value || '').trim() : 'retail';
    const initialBalanceValue = String(newCompanyInitialBalance?.value || '').trim();
    const initialBalance = initialBalanceValue ? Number(initialBalanceValue) : 0;
    const industryConfirmed = Boolean(newCompanyIndustryConfirm?.checked);
    if (!name) throw new Error('Company name is required.');
    if (!industryType) throw new Error('Industry selection is required.');
    if (!Number.isFinite(initialBalance) || initialBalance < 0) throw new Error('Initial balance must be zero or greater.');
    if (!ENABLE_MULTI_INDUSTRY && !industryConfirmed) throw new Error('Please confirm the setup.');
    if (ENABLE_MULTI_INDUSTRY && !industryConfirmed) throw new Error('Please confirm that industry cannot be changed after setup.');
    const created = await api.createCompany({ name, industryType, initialBalance, industryConfirmed });
    if (created?.id) {
      await api.switchCompany(Number(created.id));
    }
    newCompanyName.value = '';
    if (newCompanyIndustryType) newCompanyIndustryType.value = '';
    if (newCompanyInitialBalance) newCompanyInitialBalance.value = '';
    if (newCompanyIndustryConfirm) newCompanyIndustryConfirm.checked = false;
    await safeRefresh();
    showStatus('Company created.');
  } catch (err) { showStatus(err.message || 'Unable to create company.', 'error'); }
});
companyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = {
      name: companyName.value.trim(),
      address: companyAddress.value.trim(),
      phone: companyPhone.value.trim(),
      email: companyEmail.value.trim(),
      logoPath: companyLogoPath.value.trim(),
      signaturePath: companySignaturePath.value.trim(),
      bankName: companyBankName.value.trim(),
      accountNumber: companyAccountNumber.value.trim(),
      primaryColor: companyPrimaryColor.value,
      paymentMethods: companyPaymentMethods.value.split(',').map((x) => x.trim()).filter(Boolean)
    };
    if (!payload.name) throw new Error('Company name is required.');
    if (!isEmail(payload.email)) throw new Error('Please enter a valid company email.');
    if (payload.accountNumber && !/^\d+$/.test(payload.accountNumber)) throw new Error('Account number must contain digits only.');
    if (!/^#[0-9a-fA-F]{6}$/.test(payload.primaryColor || '')) throw new Error('Primary color must be a valid hex value.');
    state.company = await api.saveActiveCompany(payload);
    renderCompany();
    showStatus('Company setup saved.');
  } catch (err) { showStatus(err.message || 'Unable to save company.', 'error'); }
});
uploadLogoBtn.addEventListener('click', async () => { try { const r = await api.selectCompanyLogo(); if (r.cancelled) return showStatus('Logo upload cancelled.', 'warning'); companyLogoPath.value = r.path; companyLogoPreview.src = fileUrl(r.path); showStatus('Logo selected. Save company to persist.'); } catch (err) { showStatus(err.message || 'Logo upload failed.', 'error'); } });
uploadSignatureBtn.addEventListener('click', async () => { try { const r = await api.selectCompanySignature(); if (r.cancelled) return showStatus('Signature upload cancelled.', 'warning'); companySignaturePath.value = r.path; companySignaturePreview.src = fileUrl(r.path); showStatus('Signature selected. Save company to persist.'); } catch (err) { showStatus(err.message || 'Signature upload failed.', 'error'); } });
companyPrimaryColor.addEventListener('input', () => {
  state.company = { ...(state.company || {}), primaryColor: companyPrimaryColor.value };
  renderInvoicePreview();
});
invoiceSettingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const defaultTaxRate = Number(settingsDefaultTaxRate.value || 0);
    if (!Number.isFinite(defaultTaxRate) || defaultTaxRate < 0 || defaultTaxRate > 100) throw new Error('Default tax rate must be between 0 and 100.');
    const termsConditions = String(settingsTermsConditions.value || '').trim();
    const includeRevenueInBalance = Boolean(settingsIncludeRevenueBalanceView?.checked);
    state.invoiceSettings = await api.updateInvoiceSettings({ defaultTaxRate, termsConditions, includeRevenueInBalance });
    if (state.invoiceDraft.useDefaultTax) {
      invoiceTaxPercent.value = String(Number(state.invoiceSettings.defaultTaxRate || 0));
      state.invoiceDraft.taxPercent = Number(state.invoiceSettings.defaultTaxRate || 0);
    }
    renderInvoiceSettings();
    renderInvoiceItems();
    renderInvoicePreview();
    showStatus('Invoice settings saved.');
  } catch (err) { showStatus(err.message || 'Unable to save invoice settings.', 'error'); }
});

function buildEmailSettingsPayload() {
  const smtpHost = String(emailSmtpHost?.value || '').trim();
  const smtpPort = Number(emailSmtpPort?.value || 0);
  const smtpUser = String(emailSmtpUser?.value || '').trim();
  const smtpPass = String(emailSmtpPass?.value || '').trim();
  const smtpSecure = Boolean(emailSmtpSecure?.checked);
  if (!smtpHost) throw new Error('SMTP host is required.');
  if (!Number.isFinite(smtpPort) || smtpPort <= 0 || smtpPort > 65535) throw new Error('SMTP port must be between 1 and 65535.');
  if (!isEmail(smtpUser)) throw new Error('A valid SMTP email address is required.');
  return { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure };
}

testEmailConnectionBtn?.addEventListener('click', async () => {
  try {
    const payload = buildEmailSettingsPayload();
    if (!payload.smtpPass && state.emailSettings?.hasPassword) delete payload.smtpPass;
    await api.testEmailConnection(payload);
    showStatus('SMTP connection test succeeded.');
  } catch (err) {
    showStatus(err.message || 'SMTP connection test failed.', 'error');
  }
});

sendTestEmailBtn?.addEventListener('click', async () => {
  try {
    const to = String(emailSmtpUser?.value || '').trim();
    if (!isEmail(to)) throw new Error('Set a valid SMTP email address first.');
    const res = await api.sendEmail({
      purpose: 'system',
      to,
      subject: 'ASW Inventory SMTP Test Email',
      text: 'SMTP setup is working correctly.',
      html: '<p><strong>ASW Inventory</strong>: SMTP setup is working correctly.</p>',
      queueIfOffline: true
    });
    if (res?.queued) showStatus('Test email queued (will send when online).', 'warning');
    else showStatus('Test email sent successfully.');
  } catch (err) {
    showStatus(err.message || 'Failed to send test email.', 'error');
  }
});

emailSettingsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = buildEmailSettingsPayload();
    if (!payload.smtpPass && state.emailSettings?.hasPassword) delete payload.smtpPass;
    state.emailSettings = await api.saveEmailSettings(payload);
    renderInvoiceSettings();
    showStatus('Company email setup saved.');
  } catch (err) {
    showStatus(err.message || 'Unable to save company email setup.', 'error');
  }
});

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const assigned = Array.from(userAssignedCompanies.selectedOptions).map((o) => Number(o.value));
    const payload = {
      id: userIdField.value ? Number(userIdField.value) : undefined,
      username: userUsername.value.trim(),
      password: userPassword.value,
      isAdmin: userIsAdmin.value === '1',
      userRole: userBusinessRole?.value || (userIsAdmin.value === '1' ? 'admin' : 'staff'),
      roleId: userRoleId.value ? Number(userRoleId.value) : null,
      isActive: userIsActive.value === '1',
      assignedCompanies: assigned
    };
    if (!payload.username) throw new Error('Username is required.');
    if (!payload.id && !payload.password) throw new Error('Password is required for new users.');
    if (payload.id) await api.updateUser(payload); else await api.createUser(payload);
    closeFormPopup(); resetSimpleForms(); await safeRefresh(); showStatus('User saved.');
  } catch (err) { showStatus(err.message || 'User save failed.', 'error'); }
});
usersTableBody.addEventListener('click', async (e) => {
  const t = e.target; if (!(t instanceof HTMLButtonElement)) return; const row = state.users.find((u) => u.id === Number(t.dataset.id)); if (!row) return;
  try {
    if (t.dataset.action === 'edit-user') {
      userIdField.value = String(row.id); userUsername.value = row.username; userPassword.value = ''; userIsAdmin.value = row.isAdmin ? '1' : '0'; if (userBusinessRole) userBusinessRole.value = row.userRole || (row.isAdmin ? 'admin' : 'staff'); userRoleId.value = row.roleId ? String(row.roleId) : ''; userIsActive.value = row.isActive ? '1' : '0'; setImgOrPlaceholder(userProfilePreview, row.profileImagePath, row.username);
      Array.from(userAssignedCompanies.options).forEach((o) => (o.selected = row.assignedCompanies.includes(Number(o.value))));
      openFormPopup(formCardOf(userForm), 'User Form');
    } else if (t.dataset.action === 'reset-password') {
      const newPassword = window.prompt(`Enter a new password for "${row.username}"`);
      if (!newPassword) return;
      await api.resetUserPassword({ id: row.id, newPassword });
      showStatus('User password reset.');
    } else if (t.dataset.action === 'delete-user') {
      if (!window.confirm(`Delete user "${row.username}"?`)) return;
      await api.deleteUser(row.id); await safeRefresh(); showStatus('User deleted.');
    }
  } catch (err) { showStatus(err.message || 'User action failed.', 'error'); }
});
userUploadProfileBtn.addEventListener('click', async () => {
  try {
    const targetId = userIdField.value ? Number(userIdField.value) : null;
    if (!targetId) throw new Error('Open a user record first (click Edit) to upload profile image.');
    const result = await api.selectUserProfileImage({ id: targetId });
    if (result.cancelled) return showStatus('Profile image upload cancelled.', 'warning');
    setImgOrPlaceholder(userProfilePreview, result.path, userUsername.value || 'User');
    const row = state.users.find((u) => u.id === targetId);
    if (row) row.profileImagePath = result.path;
    renderUsers();
    showStatus('Profile image uploaded.');
  } catch (err) { showStatus(err.message || 'Profile image upload failed.', 'error'); }
});
myProfileImageBtn.addEventListener('click', async () => {
  try {
    if (!state.session?.user?.id) throw new Error('Login required.');
    const result = await api.selectUserProfileImage({ id: state.session.user.id });
    if (result.cancelled) return showStatus('Profile image upload cancelled.', 'warning');
    state.session.user.profileImagePath = result.path;
    updateAuthUi();
    await safeRefresh();
    showStatus('Your profile image has been updated.');
  } catch (err) { showStatus(err.message || 'Profile image upload failed.', 'error'); }
});

function openClockInViewerFromCard(card) {
  const photo = card.dataset.photo || '';
  const user = card.dataset.user || '';
  const company = card.dataset.company || '';
  const timestamp = card.dataset.timestamp || '';
  if (!photo) return;
  clockInViewerImage.src = fileUrl(photo);
  clockInViewerMeta.textContent = `${user} • ${company} • ${new Date(timestamp).toLocaleString()}`;
  clockInViewerModal.classList.add('active');
}

[clockInGallery].forEach((el) => {
  el?.addEventListener('click', (e) => {
    const card = e.target.closest('.clockin-card');
    if (!card) return;
    openClockInViewerFromCard(card);
  });
});
clockInViewerCloseBtn.addEventListener('click', () => clockInViewerModal.classList.remove('active'));
clockInViewerModal.addEventListener('click', (e) => {
  if (e.target === clockInViewerModal) clockInViewerModal.classList.remove('active');
});

backupBtn.addEventListener('click', async () => { try { await runBackupDatabase(); } catch (err) { showStatus(err.message || 'Backup failed.', 'error'); } });
restoreBtn.addEventListener('click', async () => { try { if (!window.confirm('Restore backup and overwrite local data?')) return; const r = await api.restoreDatabase(); if (r.cancelled) return showStatus('Restore cancelled.', 'warning'); await safeRefresh(); showStatus(`Database restored from ${r.restoredFrom}`); } catch (err) { showStatus(err.message || 'Restore failed.', 'error'); } });
autoBackupNowBtn?.addEventListener('click', async () => { try { await api.runAutoBackupNow(); showStatus('Auto backup run completed.'); } catch (err) { showStatus(err.message || 'Auto backup failed.', 'error'); } });
systemConfigForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const enabledModules = systemEnabledModules.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const updated = await api.updateSystemConfiguration({
      industryType: state.company?.industryType || 'general',
      enabledModules: enabledModules.length ? enabledModules : ['core'],
      syncEnabled: Boolean(systemSyncEnabled.checked)
    });
    state.company = updated?.company || state.company;
    state.moduleConfig = updated?.moduleConfig || state.moduleConfig;
    state.systemConfig = {
      ...(state.systemConfig || {}),
      industryType: state.company?.industryType || 'general',
      syncEnabled: Boolean(systemSyncEnabled.checked),
      enabledModules: enabledModules.length ? enabledModules : ['core']
    };
    await safeRefresh();
    setActiveSection('dashboard');
    showStatus('System configuration saved.');
  } catch (err) { showStatus(err.message || 'Unable to save system configuration.', 'error'); }
});
createUserForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await api.createUser({ username: newUsername.value.trim(), password: newPassword.value, isAdmin: false, userRole: 'staff', assignedCompanies: [Number(companySwitcher.value)] }); createUserForm.reset(); await safeRefresh(); showStatus('Quick user created.'); } catch (err) { showStatus(err.message || 'Quick user create failed.', 'error'); } });

changeNewPassword.addEventListener('input', () => { const v = changeNewPassword.value; let s = 0; if (v.length >= 8) s++; if (/[A-Z]/.test(v)) s++; if (/[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++; if (!v) { passwordStrength.textContent = 'Strength: enter password'; passwordStrength.classList.remove('weak', 'strong'); } else if (s >= 4) { passwordStrength.textContent = 'Strength: strong'; passwordStrength.classList.add('strong'); passwordStrength.classList.remove('weak'); } else { passwordStrength.textContent = 'Strength: weak (use upper/lower/number/symbol, 8+ chars)'; passwordStrength.classList.add('weak'); passwordStrength.classList.remove('strong'); } });
changePasswordForm.addEventListener('submit', async (e) => { e.preventDefault(); try { if (!state.session?.user?.username) throw new Error('Login required.'); if (changeNewPassword.value !== confirmNewPassword.value) throw new Error('New password and confirmation do not match.'); await api.changePassword({ username: state.session.user.username, currentPassword: currentPassword.value, newPassword: changeNewPassword.value }); changePasswordForm.reset(); passwordStrength.textContent = 'Strength: enter password'; passwordStrength.classList.remove('weak', 'strong'); showStatus('Password changed successfully.'); } catch (err) { showStatus(err.message || 'Password change failed.', 'error'); } });

(async function init() {
  try {
    if (typeof api.onUpdateStatus === 'function') {
      detachUpdateStatusListener = api.onUpdateStatus((payload) => {
        renderUpdateState(payload);
      });
    } else {
      renderUpdateState({ state: 'disabled', message: 'Update service unavailable in this build.' });
    }
    applyProMenuLabelsAndIcons();
    applyNavIcons();
    resetSimpleForms();
    await resetInvoiceDraft();
    if (!ENABLE_MULTI_INDUSTRY) {
      const industryWrapper = document.getElementById('industrySelectWrapper');
      if (industryWrapper) industryWrapper.style.display = 'none';
      const confirmLabel = document.querySelector('label[for="newCompanyIndustryConfirm"]');
      if (confirmLabel) confirmLabel.textContent = 'I confirm to create this company.';
    }
    await refreshSession();
    if (state.session?.authenticated) {
      if (state.session.clockedIn) { await refreshData(); applyRouteFromHash(); startDashboardLiveUpdates(); showStatus('ASW Inventory ready.'); }
      else { await startCamera(); showStatus('Please clock in to continue.', 'warning'); }
    } else showStatus('Please login to continue.', 'warning');
  } catch (err) {
    loginOverlay.classList.add('active');
    showStatus(err.message || 'Unable to initialize app.', 'error');
  }
})();

window.addEventListener('beforeunload', () => {
  if (typeof detachUpdateStatusListener === 'function') {
    detachUpdateStatusListener();
    detachUpdateStatusListener = null;
  }
  stopDashboardLiveUpdates();
  stopCamera();
});
