const { pathToFileURL } = require('url');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function toFileHref(pathValue) {
  if (!pathValue) return '';
  try {
    return pathToFileURL(String(pathValue)).href;
  } catch {
    return '';
  }
}

function normalizeTypeLabel(type) {
  if (type === 'performa' || type === 'proforma') return 'PERFORMA INVOICE';
  if (type === 'quote') return 'QUOTE';
  return 'INVOICE';
}

function buildInvoiceViewModel({ invoice = {}, company = {}, settings = {} } = {}) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const normalizedItems = items.map((item, i) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const lineTotal = Number(item.lineTotal ?? quantity * unitPrice);
    return {
      index: i + 1,
      name: String(item.name || ''),
      quantity,
      unitPrice,
      lineTotal: Number(lineTotal.toFixed(2))
    };
  });

  const subtotal = Number(invoice.subtotalAmount ?? normalizedItems.reduce((sum, x) => sum + x.lineTotal, 0));
  const taxPercent = Number(invoice.taxPercent || 0);
  const taxAmount = Number(invoice.taxAmount ?? (subtotal * taxPercent) / 100);
  const discountAmount = Number(invoice.discountAmount || 0);
  const totalAmount = Number(invoice.totalAmount ?? Math.max(0, subtotal + taxAmount - discountAmount));

  const brandColor = /^#[0-9a-fA-F]{6}$/.test(String(company.primaryColor || '').trim()) ? String(company.primaryColor).trim() : '#f4c214';

  return {
    title: normalizeTypeLabel(invoice.type),
    number: String(invoice.invoiceNumber || '-'),
    date: invoice.date ? new Date(invoice.date).toLocaleDateString() : '-',
    status: String(invoice.status || 'draft'),
    validityPeriod: String(invoice.validityPeriod || ''),
    notes: String(invoice.notes || ''),
    customerName: String(invoice.customerName || ''),
    customerEmail: String(invoice.customerEmail || ''),
    customerPhone: String(invoice.customerPhone || ''),
    companyName: String(company.name || 'Company Name'),
    companyAddress: String(company.address || ''),
    companyPhone: String(company.phone || ''),
    companyEmail: String(company.email || ''),
    companyBankName: String(company.bankName || ''),
    companyAccountNumber: String(company.accountNumber || ''),
    logoHref: toFileHref(company.logoPath),
    signatureHref: toFileHref(company.signaturePath),
    terms: String(settings.termsConditions || 'All goods remain property of the company until fully paid. Please confirm details before payment.'),
    items: normalizedItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxPercent: Number(taxPercent.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    brandColor
  };
}

function buildInvoiceTemplateHtml(payload = {}, opts = {}) {
  const model = buildInvoiceViewModel(payload);
  const rows = model.items
    .map((item) => `
      <tr>
        <td>${item.index}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${toMoney(item.unitPrice)}</td>
        <td>${item.quantity}</td>
        <td>${toMoney(item.lineTotal)}</td>
      </tr>
    `)
    .join('');

  const bodyHtml = `
    <div class="invoice-page" style="--brand-color:${escapeHtml(model.brandColor)};">
      <header class="top-grid">
        <div>
          <div class="company-name">${escapeHtml(model.companyName)}</div>
          <div class="company-address">${escapeHtml(model.companyAddress)}</div>
        </div>
        <div class="logo-wrap">${model.logoHref ? `<img src="${escapeHtml(model.logoHref)}" alt="logo" class="logo" />` : ''}</div>
      </header>

      <div class="bar-row">
        <div class="bar-left"></div>
        <div class="bar-title">${escapeHtml(model.title)}</div>
        <div class="bar-right"></div>
      </div>

      <section class="meta-grid">
        <div>
          <div class="invoice-to-label">Invoice to:</div>
          <div class="customer-name">${escapeHtml(model.customerName)}</div>
          <div class="customer-sub">${escapeHtml(model.customerEmail)}</div>
          <div class="customer-sub">${escapeHtml(model.customerPhone)}</div>
        </div>
        <div class="meta-right">
          <div><strong>Invoice#</strong><span>${escapeHtml(model.number)}</span></div>
          <div><strong>Date</strong><span>${escapeHtml(model.date)}</span></div>
          <div><strong>Validity</strong><span>${escapeHtml(model.validityPeriod || '-')}</span></div>
          <div><strong>Status</strong><span>${escapeHtml(model.status)}</span></div>
        </div>
      </section>

      <section class="table-wrap">
        <table class="item-table">
          <thead><tr><th>SL.</th><th>Item Description</th><th>Price</th><th>Qty.</th><th>Total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">No items added.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="bottom-grid">
        <div>
          <div class="thanks">Thank you for your business</div>
          <div class="subheading">Terms & Conditions</div>
          <div class="subtext">${escapeHtml(model.terms).replace(/\n/g, '<br/>')}</div>
          <div class="subheading">Payment Info:</div>
          <div class="subtext">Account # : ${escapeHtml(model.companyAccountNumber)}</div>
          <div class="subtext">A/C Name : ${escapeHtml(model.companyName)}</div>
          <div class="subtext">Bank : ${escapeHtml(model.companyBankName)}</div>
          ${model.notes ? `<div class="subheading">Notes</div><div class="subtext">${escapeHtml(model.notes).replace(/\n/g, '<br/>')}</div>` : ''}
        </div>
        <div>
          <div class="line"><span>Sub Total:</span><strong>${toMoney(model.subtotal)}</strong></div>
          <div class="line"><span>Tax:</span><strong>${model.taxPercent.toFixed(2)}% (${toMoney(model.taxAmount)})</strong></div>
          <div class="line"><span>Discount:</span><strong>${toMoney(model.discountAmount)}</strong></div>
          <div class="total-box"><span>Total:</span><strong>${toMoney(model.totalAmount)}</strong></div>
        </div>
      </section>

      <footer class="footer-row">
        <div class="footer-left">${escapeHtml(model.companyPhone)} | ${escapeHtml(model.companyAddress)} | ${escapeHtml(model.companyEmail)}</div>
        <div class="footer-sign">
          ${model.signatureHref ? `<img src="${escapeHtml(model.signatureHref)}" alt="signature" class="signature" />` : ''}
          <div>Authorised Sign</div>
        </div>
      </footer>
    </div>
  `;

  const css = `
    :root { color-scheme: light only; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background:#eef1f5; }
    .preview-wrap { padding: 12px; }
    .invoice-page {
      width: 794px; height: 1123px; background:#f5f6f8; border:1px solid #d1d5db; margin:0 auto;
      padding: 28px 34px 24px; color:#111827; position: relative; overflow: hidden;
    }
    .top-grid { display:grid; grid-template-columns: 1fr 140px; align-items:start; }
    .company-name { font-weight:800; font-size: 26px; line-height:1.04; }
    .company-address { margin-top:4px; font-size:14px; color:#475569; }
    .logo-wrap { display:flex; justify-content:flex-end; min-height:78px; }
    .logo { max-width:130px; max-height:72px; object-fit:contain; }
    .bar-row { margin-top:16px; display:grid; grid-template-columns: 46% 28% 26%; align-items:center; gap:8px; }
    .bar-left,.bar-right { height:14px; background:var(--brand-color); }
    .bar-title { text-align:center; font-size:13px; font-weight:800; }
    .meta-grid { margin-top:18px; display:grid; grid-template-columns: 1fr 240px; gap: 12px; }
    .invoice-to-label { font-size:24px; font-weight:800; }
    .customer-name { font-size:20px; font-weight:700; margin-top:4px; }
    .customer-sub { font-size:12px; color:#4b5563; }
    .meta-right { margin-top:36px; font-size:13px; }
    .meta-right div { display:flex; justify-content:space-between; margin-bottom:4px; gap:12px; }
    .table-wrap { margin-top:18px; border:1px solid #c7ccd3; height: 455px; overflow:hidden; }
    .item-table { width:100%; border-collapse: collapse; table-layout: fixed; }
    .item-table th,.item-table td { padding:9px 8px; font-size:12px; }
    .item-table thead th { background:#2d3140; color:#fff; text-align:left; }
    .item-table tbody tr:nth-child(odd) td { background:#f3f4f6; }
    .item-table tbody tr:nth-child(even) td { background:#e5e7eb; }
    .item-table th:nth-child(1), .item-table td:nth-child(1) { width:8%; text-align:center; }
    .item-table th:nth-child(2), .item-table td:nth-child(2) { width:48%; }
    .item-table th:nth-child(3), .item-table td:nth-child(3) { width:16%; text-align:right; }
    .item-table th:nth-child(4), .item-table td:nth-child(4) { width:10%; text-align:center; }
    .item-table th:nth-child(5), .item-table td:nth-child(5) { width:18%; text-align:right; }
    .bottom-grid { display:grid; grid-template-columns: 1fr 300px; gap:14px; margin-top:16px; }
    .thanks { font-size:13px; font-weight:700; }
    .subheading { margin-top:10px; font-size:13px; font-weight:700; }
    .subtext { font-size:9px; color:#4b5563; line-height:1.25; max-height: 74px; overflow: hidden; }
    .line { display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; gap:6px; }
    .line strong { text-align:right; }
    .total-box { margin-top:10px; background:var(--brand-color); display:flex; justify-content:space-between; padding:8px 10px; font-size:17px; font-weight:800; }
    .footer-row {
      position:absolute; left:34px; right:34px; bottom:18px; border-top:3px solid var(--brand-color);
      padding-top:6px; display:flex; justify-content:space-between; align-items:flex-end; gap:10px;
    }
    .footer-left { font-size:10px; color:#334155; max-width:72%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .footer-sign { text-align:right; font-size:11px; font-weight:700; }
    .signature { display:block; max-width:140px; max-height:42px; margin-left:auto; object-fit:contain; }

    @media print {
      body { background: #fff; }
      .preview-wrap { padding:0; }
      .invoice-page { width:210mm; height:297mm; border:none; margin:0; }
    }
  `;

  if (opts.fragment) {
    return `<style>${css}</style><div class="preview-wrap">${bodyHtml}</div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${css}</style></head><body><div class="preview-wrap">${bodyHtml}</div></body></html>`;
}

module.exports = {
  buildInvoiceViewModel,
  buildInvoiceTemplateHtml
};
