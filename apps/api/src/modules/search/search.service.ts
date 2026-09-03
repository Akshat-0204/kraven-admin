import { globalSearchSchema } from '@kraven/validation';
import type { GlobalSearchResult } from '@kraven/types';
import { ClientModel } from '../clients/client.model.js';
import { InvoiceModel } from '../finance/invoice.model.js';
import { LeadModel } from '../leads/lead.model.js';
import { ProjectModel } from '../projects/project.model.js';

export async function globalSearch(input: unknown): Promise<GlobalSearchResult[]> {
  const { q } = globalSearchSchema.parse(input);
  const pattern = new RegExp(escapeRegExp(q), 'i');
  const [leads, clients, projects, invoices] = await Promise.all([
    LeadModel.find({ $or: [{ companyName: pattern }, { name: pattern }, { email: pattern }] }).limit(5),
    ClientModel.find({ $or: [{ companyName: pattern }, { contactPerson: pattern }, { email: pattern }] }).limit(5),
    ProjectModel.find({ $or: [{ projectName: pattern }, { description: pattern }] }).limit(5),
    InvoiceModel.find({ invoiceNumber: pattern }).limit(5)
  ]);

  return [
    ...leads.map((lead) => ({
      id: String(lead._id),
      type: 'lead' as const,
      title: lead.companyName,
      subtitle: `${lead.name} - ${lead.status}`,
      href: `/leads/${lead._id}`
    })),
    ...clients.map((client) => ({
      id: String(client._id),
      type: 'client' as const,
      title: client.companyName,
      subtitle: client.contactPerson,
      href: `/clients/${client._id}`
    })),
    ...projects.map((project) => ({
      id: String(project._id),
      type: 'project' as const,
      title: project.projectName,
      subtitle: project.status,
      href: `/projects/${project._id}`
    })),
    ...invoices.map((invoice) => ({
      id: String(invoice._id),
      type: 'invoice' as const,
      title: invoice.invoiceNumber,
      subtitle: invoice.paymentStatus,
      href: '/finance/invoices'
    }))
  ];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
