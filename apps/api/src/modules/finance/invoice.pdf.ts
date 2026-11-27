import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { putObject } from '../files/storage.service.js';
import { htmlToPdf } from '../pdf/pdf.renderer.js';
import { getInvoiceById } from './invoice.service.js';
import type { InvoiceHydratedDocument } from './invoice.model.js';

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
const money = (value: number) => inr.format(value);
const longDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const day = (value: Date) => longDate.format(new Date(value));
const DAY_MS = 86_400_000;

export interface InvoiceContact {
  name?: string;
  email?: string;
  phone?: string;
}

export function invoicePdfKey(invoiceId: string) {
  return `invoices/${invoiceId}.pdf`;
}

export function renderInvoiceHtml(
  invoice: Pick<
    InvoiceHydratedDocument,
    'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'amount' | 'lineItems' | 'taxRate' | 'subtotal' | 'taxAmount' | 'amountPaid' | 'remainingAmount' | 'notes'
  >,
  clientName: string,
  contact: InvoiceContact = {}
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
  const agency = esc(env.agency.name);
  const termDays = Math.max(0, Math.round((new Date(invoice.dueDate).getTime() - new Date(invoice.invoiceDate).getTime()) / DAY_MS));
  const contactLines = [
    contact.name ? `Attn: ${esc(contact.name)}` : '',
    contact.phone ? `Phone: ${esc(contact.phone)}` : '',
    contact.email ? `Email: ${esc(contact.email)}` : ''
  ]
    .filter(Boolean)
    .map((line) => `<div class="muted">${line}</div>`)
    .join('');
  const agencyContact = [env.agency.email, env.agency.phone].filter(Boolean).map(esc).join(' &middot; ');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invoice ${esc(invoice.invoiceNumber)}</title><style>
@page{size:A4}
*{box-sizing:border-box}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11pt;line-height:1.45;color:#1a1a2e;margin:0}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a1a2e;padding-bottom:10pt}
h1{margin:0;font-size:28pt;letter-spacing:1px;text-transform:uppercase}
.agency{font-size:14pt;font-weight:bold;text-align:right}
.intro{margin:16pt 0}
.muted{color:#666}
.label{font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#666;margin:18pt 0 4pt}
table{width:100%;border-collapse:collapse;margin-top:8pt;page-break-inside:avoid}
th{background:#f0f0f4;text-align:left;font-size:10pt}
th,td{padding:7pt 8pt;border-bottom:1px solid #ccc}
.r{text-align:right}
.totals{margin-top:12pt;margin-left:auto;width:55%;page-break-inside:avoid}
.totals div{display:flex;justify-content:space-between;padding:4pt 8pt}
.totals .total{border-top:1px solid #1a1a2e;font-weight:bold}
.totals .due{background:#1a1a2e;color:#fff;font-weight:bold;font-size:12pt;padding:7pt 8pt}
.foot{margin-top:28pt;border-top:1px solid #ccc;padding-top:10pt;text-align:center}
</style></head><body>
<div class="head"><h1>Invoice</h1><div class="agency">${agency}</div></div>
<p class="intro">This invoice, numbered <strong>${esc(invoice.invoiceNumber)}</strong>, is issued by ${agency} to <strong>${esc(clientName)}</strong> on ${day(invoice.invoiceDate)}. Payment of the amount below is due by <strong>${day(invoice.dueDate)}</strong>.</p>
<div class="label">Billed To</div>
<div><strong>${esc(clientName)}</strong></div>${contactLines}
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
<div><span>Subtotal</span><span>${money(invoice.subtotal)}</span></div>
<div><span>Tax (${invoice.taxRate}%)</span><span>${money(invoice.taxAmount)}</span></div>
<div class="total"><span>Total</span><span>${money(invoice.amount)}</span></div>
<div><span>Amount Received</span><span>${money(invoice.amountPaid)}</span></div>
<div class="due"><span>Balance Due</span><span>${money(invoice.remainingAmount)}</span></div>
</div>
<div class="label">Payment Instructions</div>
<p>Please transfer the balance due using the payment details shared by ${agency}${env.agency.email ? `, or contact ${esc(env.agency.email)} for assistance` : ''}. Quote invoice ${esc(invoice.invoiceNumber)} with your payment.</p>
<div class="label">Terms</div>
<p>Payment is due within ${termDays} days of the invoice date, in accordance with Article IV of the Master Service Agreement between ${agency} and the Client. Any good-faith dispute over this invoice must be raised in writing within 3 days of receipt.</p>
${invoice.notes ? `<div class="label">Notes</div><p>${esc(invoice.notes)}</p>` : ''}
<div class="foot"><div><strong>${agency}</strong>${agencyContact ? ` &middot; ${agencyContact}` : ''}</div><div class="muted">Thank you for working with ${agency}.</div></div>
</body></html>`;
}

/** Renders the invoice PDF via headless Chromium, stores it in object storage and returns the bytes. */
export async function generateInvoicePdf(invoiceId: string) {
  const invoice = await getInvoiceById(invoiceId);
  const client = await ClientModel.findById(invoice.client).select('companyName contactPerson email phone').lean();
  if (!client) throw new HttpError(404, 'Client not found');
  const pdf = await htmlToPdf(renderInvoiceHtml(invoice, client.companyName, {
      name: client.contactPerson,
      email: client.email,
      phone: client.phone
    }));
  await putObject(invoicePdfKey(String(invoice._id)), pdf, 'application/pdf');
  return { pdf, filename: `${invoice.invoiceNumber.replace(/[^\w.-]+/g, '_')}.pdf` };
}
