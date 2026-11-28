import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { installMemoryStore, type MemoryStore } from '../../test/memoryStore.js';
import { computeInvoiceTotals } from './finance.calculations.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

let store: MemoryStore;
beforeEach(() => {
  store = installMemoryStore();
});
afterEach(() => {
  store.restore();
  vi.restoreAllMocks();
});

describe('invoice totals', () => {
  it('computes subtotal, tax and total', () => {
    expect(computeInvoiceTotals([{ quantity: 2, unitPrice: 100.5 }, { quantity: 1, unitPrice: 50 }], 18)).toEqual({
      subtotal: 251,
      taxAmount: 45.18,
      total: 296.18
    });
  });

  it('creates an invoice from line items with amount = total, and GETs do not write', async () => {
    const client = store.insert('Client', { companyName: 'Acme', contactPerson: 'Ada' });
    const app = createApp();
    const res = await request(app)
      .post('/invoices')
      .send({
        client: String(client._id),
        invoiceNumber: 'INV-9',
        amount: 1,
        lineItems: [{ description: 'Design', quantity: 2, unitPrice: 500 }],
        taxRate: 10,
        invoiceDate: '2026-01-01',
        dueDate: '2026-01-10'
      });
    expect(res.status).toBe(201);
    expect(res.body.invoice).toMatchObject({ subtotal: 1000, taxAmount: 100, amount: 1100, taxRate: 10, paymentStatus: 'Overdue' });

    // Make the stored status stale; a GET must not repair it (no writes on read).
    store.all('Invoice')[0].paymentStatus = 'Pending';
    const saveSpy = vi.spyOn(mongoose.Model.prototype, 'save');
    const id = res.body.invoice.id;
    expect((await request(app).get(`/invoices/${id}`)).status).toBe(200);
    expect((await request(app).get('/invoices')).status).toBe(200);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(store.all('Invoice')[0].paymentStatus).toBe('Pending');
  });
});
