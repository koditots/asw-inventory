const reportConfig = {
  general: [
    "sales_report",
    "expense_report",
    "cashflow_report"
  ],
  retail: [
    "sales_report",
    "product_performance",
    "inventory_report",
    "profit_report"
  ],
  hospitality: [
    "booking_report",
    "occupancy_report",
    "revenue_report"
  ],
  medical: [
    "drug_inventory_report",
    "expiry_report",
    "patient_activity_report"
  ]
};

module.exports = reportConfig;
module.exports.default = reportConfig;
