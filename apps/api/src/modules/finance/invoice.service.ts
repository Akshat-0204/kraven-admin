import type { InvoiceFilterInput, InvoiceInput, UpdateInvoiceInput } from '@kraven/validation';
import { invoiceFilterSchema, invoiceSchema, updateInvoiceSchema } from '@kraven/validation';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { computeInvoiceTotals, derivePaymentStatus } from './finance.calculations.js';
import { InvoiceModel, type InvoiceHydratedDocument } from './invoice.model.js';
import { assertObjectId, escapeRegExp } from '../../shared/utils/objectId.js';

export async function listInvoices(filters: InvoiceFilterInput) {
  const parsedFilters = invoiceFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};

  if (parsedFilters.client) query.client = parsedFilters.client;
  if (parsedFilters.project) query.project = parsedFilters.project;
  if (parsedFilters.paymentStatus === 'Overdue') {
    query.dueDate = { $lt: new Date() };
    query.remainingAmount = { $gt: 0 };
  } else if (parsedFilters.paymentStatus) {
    query.paymentStatus = parsedFilters.paymentStatus;
  }
  if (parsedFilters.dateFrom || parsedFilters.dateTo) {
    query.invoiceDate = {
      ...(parsedFilters.dateFrom ? { $gte: parsedFilters.dateFrom } : {}),
      ...(parsedFilters.dateTo ? { $lte: parsedFilters.dateTo } : {})
    };
  }
  if (parsedFilters.search) {
    query.invoiceNumber = new RegExp(escapeRegExp(parsedFilters.search), 'i');
  }

  // Read-only: payment status is persisted by the write paths (create/update/payments).
  return InvoiceModel.find(query).sort({ invoiceDate: -1, createdAt: -1 });
}

export async function getInvoiceById(invoiceId: string) {
  assertObjectId(invoiceId, 'invoice');
  const invoice = await InvoiceModel.findById(invoiceId);

  if (!invoice) {
    throw new HttpError(404, 'Invoice not found');
  }

  return invoice;
}

export async function syncInvoicePaymentStatus(invoice: InvoiceHydratedDocument | null) {
  if (!invoice) {
    throw new HttpError(404, 'Invoice not found');
  }

  const nextRemainingAmount = Math.max(invoice.amount - invoice.amountPaid, 0);
  const nextStatus = derivePaymentStatus(invoice.amount, invoice.amountPaid, invoice.dueDate);

  if (invoice.remainingAmount !== nextRemainingAmount || invoice.paymentStatus !== nextStatus) {
    invoice.remainingAmount = nextRemainingAmount;
    invoice.paymentStatus = nextStatus;
    await invoice.save();
  }

  return invoice;
}

/** With line items, amount is the computed total; without, the given amount is the total (no tax). */
function applyTotals(
  target: { amount: number; subtotal: number; taxAmount: number; taxRate: number },
  lineItems: { quantity: number; unitPrice: number }[]
) {
  if (lineItems.length > 0) {
    const totals = computeInvoiceTotals(lineItems, target.taxRate);
    target.subtotal = totals.subtotal;
    target.taxAmount = totals.taxAmount;
    target.amount = totals.total;
  } else {
    target.subtotal = target.amount;
    target.taxAmount = 0;
    target.taxRate = 0;
  }
}

type CreateInvoiceInput = Omit<InvoiceInput, 'lineItems' | 'taxRate'> & Partial<Pick<InvoiceInput, 'lineItems' | 'taxRate'>>;

export async function createInvoice(input: CreateInvoiceInput) {
  const payload = invoiceSchema.parse(input);
  const totals = { amount: payload.amount, subtotal: 0, taxAmount: 0, taxRate: payload.taxRate };
  applyTotals(totals, payload.lineItems);
  payload.amount = totals.amount;
  const client = await ClientModel.findById(payload.client);

  if (!client) {
    throw new HttpError(404, 'Client not found', { client: 'Selected client no longer exists' });
  }

  if (payload.project) {
    const project = await ProjectModel.findById(payload.project);

    if (!project) {
      throw new HttpError(404, 'Project not found', { project: 'Selected project no longer exists' });
    }
  }

  const remainingAmount = Math.max(payload.amount - payload.amountPaid, 0);
  const invoice = await InvoiceModel.create({
    ...payload,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    taxRate: totals.taxRate,
    remainingAmount,
    paymentStatus: derivePaymentStatus(payload.amount, payload.amountPaid, payload.dueDate)
  });

  await logActivity({
    entityType: 'Invoice',
    entityId: String(invoice._id),
    action: 'created',
    description: `Invoice created - ${invoice.invoiceNumber}`
  });

  return invoice;
}

export async function updateInvoice(invoiceId: string, input: UpdateInvoiceInput) {
  const payload = updateInvoiceSchema.parse(input);
  const invoice = await getInvoiceById(invoiceId);

  const { lineItems, ...rest } = payload;
  Object.assign(invoice, rest);
  if (lineItems) invoice.lineItems = lineItems;
  applyTotals(invoice, invoice.lineItems);
  invoice.remainingAmount = Math.max(invoice.amount - invoice.amountPaid, 0);
  invoice.paymentStatus = derivePaymentStatus(invoice.amount, invoice.amountPaid, invoice.dueDate);
  await invoice.save();

  await logActivity({
    entityType: 'Invoice',
    entityId: String(invoice._id),
    action: 'updated',
    description: `Invoice updated - ${invoice.invoiceNumber}`
  });

  return invoice;
}

export async function deleteInvoice(invoiceId: string) {
  const invoice = await getInvoiceById(invoiceId);
  await InvoiceModel.deleteOne({ _id: invoice._id });

  await logActivity({
    entityType: 'Invoice',
    entityId: String(invoice._id),
    action: 'deleted',
    description: `Invoice deleted - ${invoice.invoiceNumber}`
  });
}
