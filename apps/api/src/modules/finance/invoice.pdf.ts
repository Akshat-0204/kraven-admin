import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { putObject } from '../files/storage.service.js';
import { htmlToPdf } from '../pdf/gotenberg.client.js';
import { getInvoiceById } from './invoice.service.js';
import type { InvoiceHydratedDocument } from './invoice.model.js';

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (value: number) => value.toFixed(2);
const day = (value: Date) => new Date(value).toISOString().slice(0, 10);

export function invoicePdfKey(invoiceId: string) {
  return `invoices/${invoiceId}.pdf`;
}

export function renderInvoiceHtml(
  invoice: Pick<
    InvoiceHydratedDocument,
    'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'amount' | 'lineItems' | 'taxRate' | 'subtotal' | 'taxAmount' | 'amountPaid' | 'remainingAmount' | 'notes'
  >,
  clientName: string
) {
  const items = invoice.lineItems.length
    ? invoice.lineItems
    : [{ description: 'Services', quantity: 1, unitPrice: invoice.amount }];
  const rows = items
    .map(
      (item) =>
        `<tr><td>${esc(item.description)}</td><td class="r">${item.quantity}</td><td class="r">${money(item.unitPrice)}</td><td class="r">${money(item.quantity * item.unitPrice)}</td></tr>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111}
h1{margin:0 0 4px;font-size:24px} table{width:100%;border-collapse:collapse;margin-top:24px}
th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left} .r{text-align:right}
.totals{margin-top:16px;margin-left:auto;width:260px} .totals div{display:flex;justify-content:space-between;padding:4px 0}
</style></head><body>
<h1>Invoice ${esc(invoice.invoiceNumber)}</h1>
<div>${esc(env.agency.name)}</div>
<p>Billed to: <strong>${esc(clientName)}</strong><br>Date: ${day(invoice.invoiceDate)}<br>Due: ${day(invoice.dueDate)}</p>
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
<div><span>Subtotal</span><span>${money(invoice.subtotal)}</span></div>
<div><span>Tax (${invoice.taxRate}%)</span><span>${money(invoice.taxAmount)}</span></div>
<div><strong>Total</strong><strong>${money(invoice.amount)}</strong></div>
<div><span>Paid</span><span>${money(invoice.amountPaid)}</span></div>
<div><strong>Balance due</strong><strong>${money(invoice.remainingAmount)}</strong></div>
</div>
${invoice.notes ? `<p>${esc(invoice.notes)}</p>` : ''}
</body></html>`;
}

/** Renders the invoice PDF via Gotenberg, stores it in object storage and returns the bytes. */
export async function generateInvoicePdf(invoiceId: string) {
  const invoice = await getInvoiceById(invoiceId);
  const client = await ClientModel.findById(invoice.client).select('companyName').lean();
  if (!client) throw new HttpError(404, 'Client not found');
  const pdf = await htmlToPdf(renderInvoiceHtml(invoice, client.companyName));
  await putObject(invoicePdfKey(String(invoice._id)), pdf, 'application/pdf');
  return { pdf, filename: `${invoice.invoiceNumber.replace(/[^\w.-]+/g, '_')}.pdf` };
}
