import type {
  AgencyFinancialSummary,
  ExpenseRecord,
  FileMetadataRecord,
  InvoiceRecord,
  PaymentRecord,
  ProjectFinancialSummary
} from '@kraven/types';
import type {
  ExpenseFilterInput,
  ExpenseInput,
  InvoiceFilterInput,
  InvoiceInput,
  PaymentFilterInput,
  PaymentInput,
  UpdateExpenseInput,
  UpdateInvoiceInput
} from '@kraven/validation';
import { requestForm, requestJson } from '../../lib/api';

function toQueryString(filters: Record<string, unknown>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const financeQueryKeys = {
  overview: ['finance', 'overview'] as const,
  project: (projectId: string) => ['finance', 'project', projectId] as const,
  invoices: (filters: InvoiceFilterInput) => ['finance', 'invoices', filters] as const,
  payments: (filters: PaymentFilterInput) => ['finance', 'payments', filters] as const,
  expenses: (filters: ExpenseFilterInput) => ['finance', 'expenses', filters] as const
};

export async function getFinanceOverview() {
  return requestJson<{ summary: AgencyFinancialSummary }>('/finance/overview');
}

export async function getProjectFinancials(projectId: string) {
  return requestJson<{ summary: ProjectFinancialSummary }>(`/finance/projects/${projectId}`);
}

export async function listInvoices(filters: InvoiceFilterInput = {}) {
  return requestJson<{ invoices: InvoiceRecord[] }>(`/invoices${toQueryString(filters)}`);
}

export async function createInvoice(input: InvoiceInput) {
  return requestJson<{ invoice: InvoiceRecord }>('/invoices', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput) {
  return requestJson<{ invoice: InvoiceRecord }>(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function deleteInvoice(id: string) {
  return requestJson<void>(`/invoices/${id}`, { method: 'DELETE' });
}

export async function listPayments(filters: PaymentFilterInput = {}) {
  return requestJson<{ payments: PaymentRecord[] }>(`/payments${toQueryString(filters)}`);
}

export async function recordPayment(input: PaymentInput) {
  return requestJson<{ payment: PaymentRecord; invoice: InvoiceRecord }>('/payments', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function deletePayment(id: string) {
  return requestJson<void>(`/payments/${id}`, { method: 'DELETE' });
}

export async function listExpenses(filters: ExpenseFilterInput = {}) {
  return requestJson<{ expenses: ExpenseRecord[] }>(`/expenses${toQueryString(filters)}`);
}

export async function createExpense(input: ExpenseInput) {
  return requestJson<{ expense: ExpenseRecord }>('/expenses', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  return requestJson<{ expense: ExpenseRecord }>(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function deleteExpense(id: string) {
  return requestJson<void>(`/expenses/${id}`, { method: 'DELETE' });
}

export async function uploadExpenseReceipt(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('associatedEntityType', 'Expense');

  return requestForm<{ file: FileMetadataRecord }>('/files', formData);
}
