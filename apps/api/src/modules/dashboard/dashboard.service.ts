import { LEAD_STATUSES, PROJECT_STATUSES } from '@kraven/config';
import type {
  DashboardAlert,
  DashboardSummary,
  LeadDashboardStats,
  ProjectDashboardStats,
  RevenuePoint
} from '@kraven/types';
import { ExpenseModel } from '../finance/expense.model.js';
import { calculateAgencyFinancialSummary } from '../finance/finance.calculations.js';
import { serializeExpense, serializeInvoice } from '../finance/finance.serializer.js';
import { InvoiceModel } from '../finance/invoice.model.js';
import { syncInvoicePaymentStatus } from '../finance/invoice.service.js';
import { LeadModel, type LeadDocument } from '../leads/lead.model.js';
import { ProjectModel, type ProjectDocument } from '../projects/project.model.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [leads, projects, invoiceDocsRaw, expenseDocs] = await Promise.all([
    LeadModel.find(),
    ProjectModel.find(),
    InvoiceModel.find(),
    ExpenseModel.find()
  ]);
  const invoiceDocs = await Promise.all(invoiceDocsRaw.map(syncInvoicePaymentStatus));
  const invoices = invoiceDocs.map(serializeInvoice);
  const expenses = expenseDocs.map(serializeExpense);

  return {
    leads: buildLeadStats(leads),
    projects: buildProjectStats(projects),
    finance: calculateAgencyFinancialSummary({ invoices, expenses }),
    alerts: buildAlerts({ leads, projects, invoices }),
    revenueOverTime: buildRevenueOverTime({ invoices, expenses })
  };
}

export async function getDashboardRevenue() {
  const [invoiceDocsRaw, expenseDocs] = await Promise.all([InvoiceModel.find(), ExpenseModel.find()]);
  const invoiceDocs = await Promise.all(invoiceDocsRaw.map(syncInvoicePaymentStatus));

  return {
    revenueOverTime: buildRevenueOverTime({
      invoices: invoiceDocs.map(serializeInvoice),
      expenses: expenseDocs.map(serializeExpense)
    })
  };
}

export async function getDashboardProjects() {
  const projects = await ProjectModel.find();
  return { projects: buildProjectStats(projects) };
}

export async function getDashboardLeads() {
  const leads = await LeadModel.find();
  return { leads: buildLeadStats(leads) };
}

type LeadWithId = LeadDocument & { _id: unknown };
type ProjectWithId = ProjectDocument & { _id: unknown };

function buildLeadStats(leads: LeadWithId[]): LeadDashboardStats {
  const total = leads.length;
  const won = leads.filter((lead) => lead.status === 'Won').length;
  const lost = leads.filter((lead) => lead.status === 'Lost').length;
  const byStatus = LEAD_STATUSES.map((status) => ({
    status,
    count: leads.filter((lead) => lead.status === status).length
  }));

  return {
    total,
    new: leads.filter((lead) => lead.status === 'New').length,
    inProgress: leads.filter((lead) => !['New', 'Won', 'Lost'].includes(lead.status)).length,
    won,
    lost,
    conversionRate: total === 0 ? 0 : Math.round((won / total) * 100),
    byStatus,
    overTime: groupCountsByDate(leads.map((lead) => lead.dateCreated ?? lead.createdAt))
  };
}

function buildProjectStats(projects: ProjectWithId[]): ProjectDashboardStats {
  const activeProjects = projects.filter((project) => !['Completed', 'Cancelled'].includes(project.status));

  return {
    totalActive: activeProjects.length,
    inProgress: projects.filter((project) => project.status === 'In Progress').length,
    onHold: projects.filter((project) => project.status === 'On Hold').length,
    completed: projects.filter((project) => project.status === 'Completed').length,
    approachingDeadline: projects.filter((project) => isApproaching(project.expectedCompletionDate)).length,
    overallProgress:
      activeProjects.length === 0
        ? 0
        : Math.round(
            activeProjects.reduce((sum, project) => sum + project.progressPercentage, 0) /
              activeProjects.length
          ),
    byStatus: PROJECT_STATUSES.map((status) => ({
      status,
      count: projects.filter((project) => project.status === status).length
    }))
  };
}

function buildAlerts(input: {
  leads: LeadWithId[];
  projects: ProjectWithId[];
  invoices: ReturnType<typeof serializeInvoice>[];
}): DashboardAlert[] {
  const now = new Date();
  const overduePayments = input.invoices
    .filter((invoice) => invoice.paymentStatus === 'Overdue' && invoice.remainingAmount > 0)
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: 'overdue-payment' as const,
      title: `Invoice ${invoice.invoiceNumber} overdue`,
      description: `Outstanding balance ${invoice.remainingAmount}`,
      href: '/finance/invoices',
      date: invoice.dueDate
    }));
  const approachingProjects = input.projects
    .filter((project) => isApproaching(project.expectedCompletionDate))
    .map((project) => ({
      id: `project-${project._id}`,
      type: 'project-deadline' as const,
      title: `${project.projectName} deadline approaching`,
      description: `${project.progressPercentage}% complete`,
      href: `/projects/${project._id}`,
      date: project.expectedCompletionDate?.toISOString()
    }));
  const followUps = input.leads
    .filter((lead) => lead.nextFollowUpDate && lead.nextFollowUpDate <= now && !['Won', 'Lost'].includes(lead.status))
    .map((lead) => ({
      id: `lead-${lead._id}`,
      type: 'lead-follow-up' as const,
      title: `${lead.companyName} needs follow-up`,
      description: lead.name,
      href: `/leads/${lead._id}`,
      date: lead.nextFollowUpDate?.toISOString()
    }));
  const onHoldProjects = input.projects
    .filter((project) => project.status === 'On Hold')
    .map((project) => ({
      id: `project-hold-${project._id}`,
      type: 'project-on-hold' as const,
      title: `${project.projectName} is on hold`,
      description: project.notes ?? 'Project is paused',
      href: `/projects/${project._id}`,
      date: project.updatedAt?.toISOString()
    }));

  return [...overduePayments, ...approachingProjects, ...followUps, ...onHoldProjects].slice(0, 12);
}

function buildRevenueOverTime(input: {
  invoices: ReturnType<typeof serializeInvoice>[];
  expenses: ReturnType<typeof serializeExpense>[];
}): RevenuePoint[] {
  const points = new Map<string, RevenuePoint>();

  for (const invoice of input.invoices) {
    const key = invoice.invoiceDate.slice(0, 10);
    const point = points.get(key) ?? { date: key, invoiced: 0, received: 0, expenses: 0 };
    point.invoiced += invoice.amount;
    point.received += invoice.amountPaid;
    points.set(key, point);
  }

  for (const expense of input.expenses) {
    const key = expense.date.slice(0, 10);
    const point = points.get(key) ?? { date: key, invoiced: 0, received: 0, expenses: 0 };
    point.expenses += expense.amount;
    points.set(key, point);
  }

  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
}

function groupCountsByDate(dates: Date[]) {
  const points = new Map<string, { date: string; count: number }>();

  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    points.set(key, { date: key, count: (points.get(key)?.count ?? 0) + 1 });
  }

  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
}

function isApproaching(value?: Date) {
  if (!value) return false;
  const now = new Date();
  const diff = value.getTime() - now.getTime();
  return diff >= 0 && diff <= 7 * DAY_MS;
}
