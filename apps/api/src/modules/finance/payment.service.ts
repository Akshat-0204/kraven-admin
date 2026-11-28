import type { PaymentFilterInput, PaymentInput } from '@kraven/validation';
import { paymentFilterSchema, paymentSchema } from '@kraven/validation';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { derivePaymentStatus } from './finance.calculations.js';
import { InvoiceModel } from './invoice.model.js';
import { PaymentModel } from './payment.model.js';
import { assertObjectId, escapeRegExp } from '../../shared/utils/objectId.js';

export async function listPayments(filters: PaymentFilterInput) {
  const parsedFilters = paymentFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};

  if (parsedFilters.invoice) query.invoice = parsedFilters.invoice;
  if (parsedFilters.dateFrom || parsedFilters.dateTo) {
    query.paymentDate = {
      ...(parsedFilters.dateFrom ? { $gte: parsedFilters.dateFrom } : {}),
      ...(parsedFilters.dateTo ? { $lte: parsedFilters.dateTo } : {})
    };
  }

  return PaymentModel.find(query).sort({ paymentDate: -1, createdAt: -1 });
}

export async function getPaymentById(paymentId: string) {
  assertObjectId(paymentId, 'payment');
  const payment = await PaymentModel.findById(paymentId);

  if (!payment) {
    throw new HttpError(404, 'Payment not found');
  }

  return payment;
}

export async function recordPayment(input: PaymentInput) {
  const payload = paymentSchema.parse(input);
  const invoice = await InvoiceModel.findById(payload.invoice);

  if (!invoice) {
    throw new HttpError(404, 'Invoice not found', { invoice: 'Selected invoice no longer exists' });
  }

  if (payload.amount > invoice.remainingAmount) {
    throw new HttpError(
      400,
      `Payment of ${payload.amount} exceeds the remaining invoice balance of ${invoice.remainingAmount}`,
      { amount: `Cannot exceed the remaining balance of ${invoice.remainingAmount}` }
    );
  }

  const payment = await PaymentModel.create(payload);
  invoice.amountPaid += payload.amount;
  invoice.remainingAmount = Math.max(invoice.amount - invoice.amountPaid, 0);
  invoice.paymentDate = payload.paymentDate;
  invoice.paymentMethod = payload.paymentMethod;
  invoice.transactionReferenceId = payload.transactionReferenceId;
  invoice.paymentStatus = derivePaymentStatus(invoice.amount, invoice.amountPaid, invoice.dueDate);
  await invoice.save();

  await logActivity({
    entityType: 'Payment',
    entityId: String(payment._id),
    action: 'created',
    description: `Payment recorded - ${payload.amount}`
  });

  await logActivity({
    entityType: 'Invoice',
    entityId: String(invoice._id),
    action: 'payment-recorded',
    description: `Payment recorded against invoice - ${invoice.invoiceNumber}`
  });

  return { payment, invoice };
}

export async function deletePayment(paymentId: string) {
  const payment = await getPaymentById(paymentId);
  const invoice = await InvoiceModel.findById(payment.invoice);

  await PaymentModel.deleteOne({ _id: payment._id });

  if (invoice) {
    invoice.amountPaid = Math.max(invoice.amountPaid - payment.amount, 0);
    invoice.remainingAmount = Math.max(invoice.amount - invoice.amountPaid, 0);
    invoice.paymentStatus = derivePaymentStatus(invoice.amount, invoice.amountPaid, invoice.dueDate);
    await invoice.save();
  }

  await logActivity({
    entityType: 'Payment',
    entityId: String(payment._id),
    action: 'deleted',
    description: `Payment deleted - ${payment.amount}`
  });
}
