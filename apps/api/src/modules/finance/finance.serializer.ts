import type { ExpenseRecord, InvoiceRecord, PaymentRecord } from '@kraven/types';
import type { ExpenseDocument } from './expense.model.js';
import type { InvoiceDocument } from './invoice.model.js';
import type { PaymentDocument } from './payment.model.js';

function dateToString(value?: Date) {
  return value ? value.toISOString() : undefined;
}

export function serializeInvoice(invoice: InvoiceDocument & { _id: unknown }): InvoiceRecord {
  return {
    id: String(invoice._id),
    client: String(invoice.client),
    project: invoice.project ? String(invoice.project) : undefined,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.amount,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paymentStatus: invoice.paymentStatus,
    amountPaid: invoice.amountPaid,
    remainingAmount: invoice.remainingAmount,
    paymentDate: dateToString(invoice.paymentDate),
    paymentMethod: invoice.paymentMethod,
    transactionReferenceId: invoice.transactionReferenceId,
    notes: invoice.notes,
    payeeProfile: invoice.payeeProfile ? String(invoice.payeeProfile) : undefined,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString()
  };
}

export function serializePayment(payment: PaymentDocument & { _id: unknown }): PaymentRecord {
  return {
    id: String(payment._id),
    invoice: String(payment.invoice),
    amount: payment.amount,
    paymentDate: payment.paymentDate.toISOString(),
    paymentMethod: payment.paymentMethod,
    transactionReferenceId: payment.transactionReferenceId,
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString()
  };
}

export function serializeExpense(expense: ExpenseDocument & { _id: unknown }): ExpenseRecord {
  const receipt = expense.receipt as
    | { fileId: unknown; filename: string; contentType?: string; uploadedAt?: Date }
    | undefined;

  return {
    id: String(expense._id),
    name: expense.name,
    amount: expense.amount,
    category: expense.category,
    date: expense.date.toISOString(),
    vendor: expense.vendor,
    associatedProject: expense.associatedProject ? String(expense.associatedProject) : undefined,
    receipt: receipt
      ? {
          fileId: String(receipt.fileId),
          filename: receipt.filename,
          contentType: receipt.contentType,
          uploadedAt: dateToString(receipt.uploadedAt) ?? ''
        }
      : undefined,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString()
  };
}
