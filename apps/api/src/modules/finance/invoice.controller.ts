import type { Request, Response } from 'express';
import { generateInvoicePdf } from './invoice.pdf.js';
import { createInvoice, deleteInvoice, getInvoiceById, listInvoices, updateInvoice } from './invoice.service.js';
import { serializeInvoice } from './finance.serializer.js';

export async function listInvoicesController(req: Request, res: Response) {
  const invoices = await listInvoices(req.query as Record<string, string | undefined>);
  res.json({ invoices: invoices.map(serializeInvoice) });
}

export async function getInvoiceController(req: Request, res: Response) {
  const invoice = await getInvoiceById(req.params.id);
  res.json({ invoice: serializeInvoice(invoice) });
}

export async function createInvoiceController(req: Request, res: Response) {
  const invoice = await createInvoice(req.body);
  res.status(201).json({ invoice: serializeInvoice(invoice) });
}

export async function updateInvoiceController(req: Request, res: Response) {
  const invoice = await updateInvoice(req.params.id, req.body);
  res.json({ invoice: serializeInvoice(invoice) });
}

export async function deleteInvoiceController(req: Request, res: Response) {
  await deleteInvoice(req.params.id);
  res.status(204).send();
}

export async function downloadInvoicePdfController(req: Request, res: Response) {
  const { pdf, filename } = await generateInvoicePdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdf);
}
