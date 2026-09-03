import { createInvoice } from '../modules/finance/invoice.service.js';
import { recordPayment } from '../modules/finance/payment.service.js';
import { createLead, convertLeadToClient } from '../modules/leads/lead.service.js';
import { createProject } from '../modules/projects/project.service.js';
import { connectDatabase } from '../config/db.js';
import { logger } from '../shared/logger/logger.js';
import { ActivityModel } from '../shared/activity/activity.model.js';
import { ClientModel } from '../modules/clients/client.model.js';
import { InvoiceModel } from '../modules/finance/invoice.model.js';
import { ProjectModel } from '../modules/projects/project.model.js';

async function runLifecycleCheck() {
  await connectDatabase({ required: true });

  const suffix = Date.now();
  const lead = await createLead({
    name: 'Phase 3 Contact',
    companyName: `Phase 3 Client ${suffix}`,
    email: `phase3-${suffix}@example.com`,
    phone: '+1 555 0100',
    leadSource: 'Referral',
    serviceInterested: 'Website build',
    estimatedValue: 200000,
    assignedPerson: 'Admin',
    status: 'New',
    notes: 'Lifecycle relationship check lead'
  });

  const client = await convertLeadToClient(String(lead._id));

  if (!client) {
    throw new Error('Expected lead conversion to create a client');
  }

  const project = await createProject({
    projectName: `Phase 3 Project ${suffix}`,
    client: String(client._id),
    description: 'Lifecycle relationship check project',
    projectValue: 200000,
    status: 'In Progress',
    progressPercentage: 25,
    deliverables: ['Discovery', 'Build'],
    links: [],
    documents: []
  });

  const invoice = await createInvoice({
    client: String(client._id),
    project: String(project._id),
    invoiceNumber: `PH3-${suffix}`,
    amount: 200000,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    paymentStatus: 'Pending',
    amountPaid: 0
  });

  const { invoice: paidInvoice } = await recordPayment({
    invoice: String(invoice._id),
    amount: 120000,
    paymentDate: new Date(),
    paymentMethod: 'Bank Transfer',
    transactionReferenceId: `TXN-${suffix}`
  });

  const resolvedClient = await ClientModel.findById(client._id).populate('sourceLead');
  const resolvedProject = await ProjectModel.findById(project._id).populate('client');
  const resolvedInvoice = await InvoiceModel.findById(invoice._id).populate(['client', 'project']);
  const activityCount = await ActivityModel.countDocuments({
    entityId: { $in: [lead._id, client._id, project._id, invoice._id, paidInvoice._id] }
  });

  if (!resolvedClient?.sourceLead || !resolvedProject?.client || !resolvedInvoice?.client) {
    throw new Error('Lifecycle relationships did not resolve correctly');
  }

  if (paidInvoice.remainingAmount !== 80000 || paidInvoice.paymentStatus !== 'Partially Paid') {
    throw new Error('Payment did not update invoice balance/status correctly');
  }

  logger.info(
    {
      leadId: lead._id,
      clientId: client._id,
      projectId: project._id,
      invoiceId: invoice._id,
      activityCount
    },
    'Phase 3 lifecycle check passed'
  );
}

runLifecycleCheck()
  .catch((error) => {
    logger.error({ error }, 'Phase 3 lifecycle check failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await ClientModel.db.close();
  });
