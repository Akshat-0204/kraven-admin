import { describe, expect, it } from 'vitest';
import {
  calculateAgencyFinancialSummary,
  calculateProjectFinancialSummary
} from '../finance/finance.calculations.js';

describe('dashboard finance calculations', () => {
  it('keeps derived finance totals consistent', () => {
    const invoices = [
      { amount: 200000, amountPaid: 120000, remainingAmount: 80000, paymentStatus: 'Partially Paid' as const }
    ];
    const expenses = [{ amount: 25000 }];

    expect(calculateProjectFinancialSummary({ invoices, expenses })).toMatchObject({
      revenue: 200000,
      received: 120000,
      pending: 80000,
      expenses: 25000,
      profit: 175000
    });
    expect(calculateAgencyFinancialSummary({ invoices, expenses }).invoiced).toBe(200000);
  });
});
