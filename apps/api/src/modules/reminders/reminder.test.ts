import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMemoryStore, type MemoryStore } from '../../test/memoryStore.js';
import { Types } from 'mongoose';
import { collectReminders, runReminders } from './reminder.service.js';

let store: MemoryStore;
const DAY = 86_400_000;
const now = new Date('2026-06-20T10:00:00Z');
const ago = (days: number) => new Date(now.getTime() - days * DAY);

beforeEach(() => {
  store = installMemoryStore();
});
afterEach(() => {
  store.restore();
  vi.restoreAllMocks();
});

function seed() {
  const client = store.insert('Client', { companyName: 'Acme', contactPerson: 'Ada', email: 'ada@acme.co' });
  const unsigned = store.insert('Document', { title: 'NDA', client: client._id, status: 'Sent', html: 'x' });
  const signed = store.insert('Document', { title: 'Done', client: client._id, status: 'Signed', html: 'x' });
  const mkItem = (extra: Record<string, unknown>) => ({ _id: new Types.ObjectId(), ...extra });
  store.insert('Pack', {
    client: client._id,
    title: 'Onboarding',
    status: 'Sent',
    sentAt: ago(5),
    items: [
      mkItem({ kind: 'document', document: unsigned._id }),
      mkItem({ kind: 'document', document: signed._id }),
      mkItem({ kind: 'payment', label: 'Deposit', amount: 500, paymentStatus: 'Sent' }),
      mkItem({ kind: 'payment', label: 'Paid one', amount: 1, paymentStatus: 'Paid' })
    ]
  });
  store.insert('Pack', { client: client._id, title: 'Fresh', status: 'Sent', sentAt: ago(1), items: [mkItem({ kind: 'payment', label: 'New', paymentStatus: 'Pending' })] });
  store.insert('Invoice', { client: client._id, invoiceNumber: 'INV-1', amount: 100, amountPaid: 0, remainingAmount: 100, invoiceDate: ago(40), dueDate: ago(10) });
  store.insert('Invoice', { client: client._id, invoiceNumber: 'INV-2', amount: 100, amountPaid: 100, remainingAmount: 0, invoiceDate: ago(40), dueDate: ago(10) });
  return client;
}

describe('reminders', () => {
  it('selects unsigned docs, unpaid items in old packs, and overdue invoices only', async () => {
    seed();
    const targets = await collectReminders(now, 3);
    expect(targets).toHaveLength(1);
    const lines = targets[0].lines.join('\n');
    expect(lines).toContain('NDA');
    expect(lines).toContain('Deposit');
    expect(lines).toContain('INV-1');
    expect(lines).not.toMatch(/Done|Paid one|New|INV-2/);
  });

  it('sends one email, then throttles for 3 days', async () => {
    seed();
    expect((await runReminders(now)).sent).toBe(1);
    expect(store.all('EmailLog')).toHaveLength(1);
    expect(store.all('EmailLog')[0].type).toBe('reminder');

    expect((await runReminders(new Date(now.getTime() + 1 * DAY))).sent).toBe(0);
    expect((await runReminders(new Date(now.getTime() + 4 * DAY))).sent).toBe(1);
  });
});
