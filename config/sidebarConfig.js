const sidebarConfig = {
  general: [
    "dashboard",
    "inventory",
    "invoices",
    "customers",
    "expenses",
    "reports",
    "settings"
  ],
  retail: [
    "dashboard",
    "inventory",
    "pos",
    "sales",
    "customers",
    "expenses",
    "reports",
    "settings"
  ],
  hospitality: [
    "dashboard",
    "rooms",
    "bookings",
    "guests",
    "kitchen_inventory",
    "billing",
    "expenses",
    "reports",
    "settings"
  ],
  medical: [
    "dashboard",
    "drug_inventory",
    "patients",
    "prescriptions",
    "expiry_tracking",
    "expenses",
    "reports",
    "settings"
  ]
};

module.exports = sidebarConfig;
module.exports.default = sidebarConfig;
