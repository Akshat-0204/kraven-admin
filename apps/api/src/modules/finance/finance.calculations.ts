import type {
  AgencyFinancialSummary,
  InvoicePaymentStatus,
  InvoiceRecord,
  ProjectFinancialSummary
} from '@kraven/types';

export function derivePaymentStatus(
  amount: number,
  amountPaid: number,
  dueDate: Date,
  today = new Date()
): InvoicePaymentStatus {
  const remainingAmount = Math.max(amount - amountPaid, 0);

  if (remainingAmount <= 0) {
    return 'Paid';
  }

  const endOfDueDate = new Date(dueDate);
  endOfDueDate.setHours(23, 59, 59, 999);

  if (endOfDueDate.getTime() < today.getTime()) {
    return 'Overdue';
  }

  return amountPaid > 0 ? 'Partially Paid' : 'Pending';
}

export function calculateProjectFinancialSummary(input: {
  invoices: Pick<InvoiceRecord, 'amount' | 'amountPaid' | 'remainingAmount' | 'paymentStatus'>[];
  expenses: { amount: number }[];
}): ProjectFinancialSummary {
  const revenue = input.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const received = input.invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const pending = input.invoices.reduce((sum, invoice) => sum + invoice.remainingAmount, 0);
  const overdue = input.invoices
    .filter((invoice) => invoice.paymentStatus === 'Overdue')
    .reduce((sum, invoice) => sum + invoice.remainingAmount, 0);
  const expenses = input.expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    revenue,
    received,
    pending,
    overdue,
    expenses,
    profit: revenue - expenses
  };
}

export function calculateAgencyFinancialSummary(input: {
  invoices: Pick<InvoiceRecord, 'amount' | 'amountPaid' | 'remainingAmount' | 'paymentStatus'>[];
  expenses: { amount: number }[];
}): AgencyFinancialSummary {
  const projectSummary = calculateProjectFinancialSummary(input);

  return {
    ...projectSummary,
    invoiced: projectSummary.revenue
  };
}
