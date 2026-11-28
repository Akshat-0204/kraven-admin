import { describe, expect, it } from 'vitest';
import { renderInvoiceHtml } from './invoice.pdf.js';

const invoice = {
  invoiceNumber: 'INV-001',
  invoiceDate: new Date('2026-11-23T00:00:00Z'),
  dueDate: new Date('2026-11-26T00:00:00Z'),
  amount: 17000,
  subtotal: 17000,
  taxRate: 0,
  taxAmount: 0,
  amountPaid: 8500,
  remainingAmount: 8500,
  notes: 'Thanks <b>x</b>',
  lineItems: [{ description: 'Website <design>', quantity: 1, unitPrice: 17000 }]
};

describe('renderInvoiceHtml', () => {
  it('follows the invoice layout with escaped content', () => {
    const html = renderInvoiceHtml(invoice as never, 'Acme & Co', { name: 'Asha', email: 'a@acme.test' });
    expect(html).toContain('This invoice, numbered <strong>INV-001</strong>');
    expect(html).toContain('23 November 2026');
    expect(html).toContain('Billed To');
    expect(html).toContain('Attn: Asha');
    expect(html).toContain('Website &lt;design&gt;');
    expect(html).toContain('Acme &amp; Co');
    expect(html).toContain('Amount Received');
    expect(html).toContain('Balance Due');
    expect(html).toContain('Payment Instructions');
    expect(html).toContain('due within 3 days');
    expect(html).toContain('Thanks &lt;b&gt;x&lt;/b&gt;');
  });
});
