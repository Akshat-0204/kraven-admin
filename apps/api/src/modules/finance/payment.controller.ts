import type { Request, Response } from 'express';
import { deletePayment, getPaymentById, listPayments, recordPayment } from './payment.service.js';
import { serializeInvoice, serializePayment } from './finance.serializer.js';

export async function listPaymentsController(req: Request, res: Response) {
  const payments = await listPayments(req.query as Record<string, string | undefined>);
  res.json({ payments: payments.map(serializePayment) });
}

export async function getPaymentController(req: Request, res: Response) {
  const payment = await getPaymentById(req.params.id);
  res.json({ payment: serializePayment(payment) });
}

export async function recordPaymentController(req: Request, res: Response) {
  const { payment, invoice } = await recordPayment(req.body);
  res.status(201).json({ payment: serializePayment(payment), invoice: serializeInvoice(invoice) });
}

export async function deletePaymentController(req: Request, res: Response) {
  await deletePayment(req.params.id);
  res.status(204).send();
}
