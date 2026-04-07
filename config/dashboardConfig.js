const dashboardConfig = {
  general: [
    "wallet_balance",
    "total_sales",
    "expenses",
    "recent_transactions"
  ],
  retail: [
    "wallet_balance",
    "today_sales",
    "top_products",
    "low_stock_alert",
    "recent_sales"
  ],
  hospitality: [
    "wallet_balance",
    "active_bookings",
    "room_occupancy",
    "today_checkins",
    "today_checkouts"
  ],
  medical: [
    "wallet_balance",
    "patients_today",
    "low_drug_stock",
    "expiring_drugs",
    "recent_prescriptions"
  ]
};

module.exports = dashboardConfig;
module.exports.default = dashboardConfig;
