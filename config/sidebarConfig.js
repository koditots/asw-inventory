const sidebarConfig = {
  retail: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home', roles: ['admin', 'manager', 'staff'] },
    { key: 'inventory', name: 'Products', route: '/products', icon: 'box', roles: ['admin', 'manager', 'staff'] },
    { key: 'sales', name: 'Sales', route: '/sales', icon: 'cart', roles: ['admin', 'manager', 'staff'] },
    { key: 'customers', name: 'Customers', route: '/customers', icon: 'users', roles: ['admin', 'manager', 'staff'] },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart', roles: ['admin', 'manager', 'staff'] }
  ],
  hospitality: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home', roles: ['admin', 'manager', 'staff'] },
    { key: 'rooms', name: 'Rooms', route: '/rooms', icon: 'bed', roles: ['admin', 'manager', 'staff'] },
    { key: 'bookings', name: 'Bookings', route: '/bookings', icon: 'calendar', roles: ['admin', 'manager', 'staff'] },
    { key: 'guests', name: 'Guests', route: '/guests', icon: 'user', roles: ['admin', 'manager', 'staff'] },
    { key: 'kitchen_inventory', name: 'Kitchen', route: '/kitchen', icon: 'food', roles: ['admin', 'manager', 'staff'] },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart', roles: ['admin', 'manager', 'staff'] }
  ],
  medical: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home', roles: ['admin', 'manager', 'staff'] },
    { key: 'drug_inventory', name: 'Drugs', route: '/drugs', icon: 'pill', roles: ['admin', 'manager', 'staff'] },
    { key: 'patients', name: 'Patients', route: '/patients', icon: 'heart', roles: ['admin', 'manager', 'staff'] },
    { key: 'prescriptions', name: 'Prescriptions', route: '/prescriptions', icon: 'file', roles: ['admin', 'manager', 'staff'] },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart', roles: ['admin', 'manager', 'staff'] }
  ],
  general: [
    { key: 'dashboard', name: 'Dashboard', route: '/dashboard', icon: 'home', roles: ['admin', 'manager', 'staff'] },
    { key: 'transactions', name: 'Transactions', route: '/transactions', icon: 'money', roles: ['admin', 'manager', 'staff'] },
    { key: 'reports', name: 'Reports', route: '/reports', icon: 'chart', roles: ['admin', 'manager', 'staff'] }
  ]
};

module.exports = sidebarConfig;
module.exports.default = sidebarConfig;
