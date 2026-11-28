import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMemoryStore, type MemoryStore } from '../../test/memoryStore.js';
import { getWaitingOnClient } from './dashboard.service.js';

let store: MemoryStore;
beforeEach(() => {
  store = installMemoryStore();
});
afterEach(() => {
  store.restore();
  vi.restoreAllMocks();
});

describe('waiting on client', () => {
  it('lists unsigned docs and unpaid items from sent packs, and overdue invoices', async () => {
    const now = new Date('2026-06-20T10:00:00Z');
    const client = store.insert('Client', { companyName: 'Acme' });
    const open = store.insert('Document', { title: 'NDA', client: client._id, status: 'Sent', html: 'x' });
    const done = store.insert('Document', { title: 'Done', client: client._id, status: 'Signed', html: 'x' });
    const item = (extra: Record<string, unknown>) => ({ _id: new Types.ObjectId(), ...extra });
    store.insert('Pack', {
      client: client._id,
      title: 'Live',
      status: 'Sent',
      sentAt: now,
      items: [item({ kind: 'document', document: open._id }), item({ kind: 'document', document: done._id }), item({ kind: 'payment', label: 'Deposit', amount: 5, paymentStatus: 'Sent' }), item({ kind: 'payment', label: 'Paid', paymentStatus: 'Paid' })]
    });
    store.insert('Pack', { client: client._id, title: 'Draft', status: 'Draft', items: [item({ kind: 'payment', label: 'Hidden', paymentStatus: 'Pending' })] });
    store.insert('Invoice', { client: client._id, invoiceNumber: 'INV-1', remainingAmount: 50, dueDate: new Date('2026-06-01') });
    store.insert('Invoice', { client: client._id, invoiceNumber: 'INV-2', remainingAmount: 0, dueDate: new Date('2026-06-01') });

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const result = await getWaitingOnClient({ now, startOfToday, deadlineHorizon: now });
    expect(result.unsignedDocuments.map((i) => i.title)).toEqual(['NDA']);
    expect(result.unpaidItems.map((i) => i.title)).toEqual(['Deposit']);
    expect(result.overdueInvoices.map((i) => i.title)).toEqual(['Invoice INV-1']);
    expect(result.unsignedDocuments[0].clientName).toBe('Acme');
  });
});
