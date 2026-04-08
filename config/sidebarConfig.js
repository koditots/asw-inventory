const sidebarConfig = {
  retail: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home' },
    { key: 'inventory', name: 'Products', route: '/products', icon: 'box' },
    { key: 'sales', name: 'Sales', route: '/sales', icon: 'cart' },
    { key: 'customers', name: 'Customers', route: '/customers', icon: 'users' },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart' }
  ],
  hospitality: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home' },
    { key: 'rooms', name: 'Rooms', route: '/rooms', icon: 'bed' },
    { key: 'bookings', name: 'Bookings', route: '/bookings', icon: 'calendar' },
    { key: 'guests', name: 'Guests', route: '/guests', icon: 'user' },
    { key: 'kitchen_inventory', name: 'Kitchen', route: '/kitchen', icon: 'food' },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart' }
  ],
  medical: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home' },
    { key: 'drug_inventory', name: 'Drugs', route: '/drugs', icon: 'pill' },
    { key: 'patients', name: 'Patients', route: '/patients', icon: 'heart' },
    { key: 'prescriptions', name: 'Prescriptions', route: '/prescriptions', icon: 'file' },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart' }
  ],
  general: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home' },
    { key: 'transactions', name: 'Transactions', route: '/transactions', icon: 'money' },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart' }
  ]
};

module.exports = sidebarConfig;
module.exports.default = sidebarConfig;
