const rolePermissions = {
  admin: ["*"],
  manager: [
    "dashboard",
    "inventory",
    "sales",
    "customers",
    "reports",
    "expenses"
  ],
  staff: [
    "dashboard",
    "pos",
    "sales"
  ]
};

module.exports = rolePermissions;
module.exports.default = rolePermissions;
