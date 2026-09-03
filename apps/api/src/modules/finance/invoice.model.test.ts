import { describe, expect, it } from 'vitest';
import { InvoiceModel } from './invoice.model.js';

describe('InvoiceModel', () => {
  it('derives remaining amount from amount and amountPaid', async () => {
    const invoice = new InvoiceModel({
      client: '507f1f77bcf86cd799439011',
      invoiceNumber: 'INV-TEST',
      amount: 200000,
      amountPaid: 120000,
      invoiceDate: new Date(),
      dueDate: new Date()
    });

    await invoice.validate();

    expect(invoice.remainingAmount).toBe(80000);
  });
});
