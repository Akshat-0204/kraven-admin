import { hash } from 'bcrypt';
import { connectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { UserModel } from '../modules/auth/user.model.js';
import { createExpense } from '../modules/finance/expense.service.js';
import { createInvoice } from '../modules/finance/invoice.service.js';
import { recordPayment } from '../modules/finance/payment.service.js';
import { createLead, convertLeadToClient } from '../modules/leads/lead.service.js';
import { createProject } from '../modules/projects/project.service.js';
import { logger } from '../shared/logger/logger.js';

async function seedAdminUsers() {
  const admins =
    env.adminUsers.length === 2
      ? env.adminUsers
      : [
          { email: 'admin.one@kraven.local', password: 'change-me-admin-one' },
          { email: 'admin.two@kraven.local', password: 'change-me-admin-two' }
        ];

  for (const admin of admins) {
    await UserModel.updateOne(
      { email: admin.email.toLowerCase().trim() },
      {
        $set: {
          email: admin.email.toLowerCase().trim(),
          hashedPassword: await hash(admin.password, 12)
        }
      },
      { upsert: true }
    );
  }

  return admins.map((admin) => admin.email);
}

async function seedDemo() {
  await connectDatabase({ required: true });
  const suffix = Date.now();
  const adminEmails = await seedAdminUsers();

  const lead = await createLead({
    name: 'Mira Kapoor',
    companyName: `Northstar Studio ${suffix}`,
    email: `mira-${suffix}@northstar.example`,
    phone: '+91 90000 00000',
    leadSource: 'Referral',
    serviceInterested: 'Brand site and operations dashboard',
    estimatedValue: 200000,
    assignedPerson: 'Admin',
    lastContactedDate: new Date(),
    nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: 'Won',
    notes: 'Demo lead for Kraven lifecycle.'
  });
  const client = await convertLeadToClient(String(lead._id));

  if (!client) throw new Error('Demo client was not created');

  const project = await createProject({
    projectName: `Northstar Website ${suffix}`,
    client: String(client._id),
    description: 'Demo client project created from a converted lead.',
    projectValue: 200000,
    startDate: new Date(),
    expectedCompletionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: 'In Progress',
    progressPercentage: 45,
    assignedTeam: 'Admin',
    priority: 'High',
    notes: 'Phase 8 demo data.',
    deliverables: ['Discovery', 'Design', 'Build', 'Launch'],
    links: [],
    documents: []
  });
  const invoice = await createInvoice({
    client: String(client._id),
    project: String(project._id),
    invoiceNumber: `DEMO-${suffix}`,
    amount: 200000,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    amountPaid: 0,
    paymentStatus: 'Pending',
    notes: 'Demo invoice.'
  });

  await recordPayment({
    invoice: String(invoice._id),
    amount: 120000,
    paymentDate: new Date(),
    paymentMethod: 'Bank Transfer',
    transactionReferenceId: `DEMO-TXN-${suffix}`,
    notes: 'Demo partial payment.'
  });

  await createExpense({
    name: 'Demo contractor design support',
    amount: 25000,
    category: 'Freelancer',
    date: new Date(),
    vendor: 'Design Partner',
    associatedProject: String(project._id),
    notes: 'Demo project expense.'
  });

  logger.info({ adminEmails, leadId: lead._id, clientId: client._id, projectId: project._id }, 'seeded demo data');
}

seedDemo()
  .catch((error) => {
    logger.error({ error }, 'failed to seed demo data');
    process.exitCode = 1;
  })
  .finally(async () => {
    await UserModel.db.close();
  });
