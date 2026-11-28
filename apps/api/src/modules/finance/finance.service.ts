import type { AgencyFinancialSummary, ProjectFinancialSummary } from '@kraven/types';
import { ExpenseModel } from './expense.model.js';
import { calculateAgencyFinancialSummary, calculateProjectFinancialSummary } from './finance.calculations.js';
import { serializeExpense, serializeInvoice } from './finance.serializer.js';
import { InvoiceModel } from './invoice.model.js';
import { syncInvoicePaymentStatus } from './invoice.service.js';
import { assertObjectId } from '../../shared/utils/objectId.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ProjectModel } from '../projects/project.model.js';

export async function getAgencyFinancialSummary(): Promise<AgencyFinancialSummary> {
  const [invoiceDocsRaw, expenseDocs] = await Promise.all([
    InvoiceModel.find(),
    ExpenseModel.find()
  ]);
  const invoiceDocs = await Promise.all(invoiceDocsRaw.map(syncInvoicePaymentStatus));
  const invoices = invoiceDocs.map(serializeInvoice);
  const expenses = expenseDocs.map(serializeExpense);

  return calculateAgencyFinancialSummary({ invoices, expenses });
}

export async function getProjectFinancialSummary(projectId: string): Promise<ProjectFinancialSummary> {
  assertObjectId(projectId, 'project');
  if (!(await ProjectModel.exists({ _id: projectId }))) {
    throw new HttpError(404, 'Project not found');
  }

  const [invoiceDocsRaw, expenseDocs] = await Promise.all([
    InvoiceModel.find({ project: projectId }),
    ExpenseModel.find({ associatedProject: projectId })
  ]);
  const invoiceDocs = await Promise.all(invoiceDocsRaw.map(syncInvoicePaymentStatus));
  const invoices = invoiceDocs.map(serializeInvoice);
  const expenses = expenseDocs.map(serializeExpense);

  return calculateProjectFinancialSummary({ invoices, expenses });
}
