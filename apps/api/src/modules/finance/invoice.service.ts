import type { InvoiceFilterInput, InvoiceInput, UpdateInvoiceInput } from '@kraven/validation';
import { invoiceFilterSchema, invoiceSchema, updateInvoiceSchema } from '@kraven/validation';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { derivePaymentStatus } from './finance.calculations.js';
import { InvoiceModel, type InvoiceHydratedDocument } from './invoice.model.js';

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
    query.invoiceNumber = new RegExp(parsedFilters.search, 'i');
  }

  const invoices = await InvoiceModel.find(query).sort({ invoiceDate: -1, createdAt: -1 });
  return Promise.all(invoices.map(syncInvoicePaymentStatus));
}

export async function getInvoiceById(invoiceId: string) {
  const invoice = await InvoiceModel.findById(invoiceId);

  if (!invoice) {
    throw new HttpError(404, 'Invoice not found');
  }

  return syncInvoicePaymentStatus(invoice);
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

export async function createInvoice(input: InvoiceInput) {
  const payload = invoiceSchema.parse(input);
  const client = await ClientModel.findById(payload.client);

  if (!client) {
    throw new HttpError(404, 'Client not found');
  }

  if (payload.project) {
    const project = await ProjectModel.findById(payload.project);

    if (!project) {
      throw new HttpError(404, 'Project not found');
    }
  }

  const remainingAmount = Math.max(payload.amount - payload.amountPaid, 0);
  const invoice = await InvoiceModel.create({
    ...payload,
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

  Object.assign(invoice, payload);
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
