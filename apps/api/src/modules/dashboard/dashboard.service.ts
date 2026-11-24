import { LEAD_STATUSES, PROJECT_STATUSES } from '@kraven/config';
import type {
  AgencyFinancialSummary,
  DashboardAlert,
  DashboardSummary,
  LeadDashboardStats,
  LeadStatus,
  ProjectDashboardStats,
  ProjectStatus,
  RevenuePoint
} from '@kraven/types';
import { ExpenseModel } from '../finance/expense.model.js';
import { InvoiceModel } from '../finance/invoice.model.js';
import { LeadModel } from '../leads/lead.model.js';
import { ProjectModel } from '../projects/project.model.js';

// Read-only by design: every query here is an aggregation or a lean find. Invoice payment status is
// persisted on invoice/payment writes; "overdue" depends on the clock, so it is derived at read time.

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ALERTS = 12;
const MAX_POINTS = 12;
const CLOSED_LEAD_STATUSES: LeadStatus[] = ['Won', 'Lost'];
const INACTIVE_PROJECT_STATUSES: ProjectStatus[] = ['Completed', 'Cancelled'];

interface DashboardClock {
  now: Date;
  /** Invoices due before this instant are overdue (matches derivePaymentStatus: due date's end of day). */
  startOfToday: Date;
  deadlineHorizon: Date;
}

function createClock(now = new Date()): DashboardClock {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return { now, startOfToday, deadlineHorizon: new Date(now.getTime() + 7 * DAY_MS) };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const clock = createClock();
  const [leads, projects, finance, alerts, revenueOverTime] = await Promise.all([
    getLeadStats(),
    getProjectStats(clock),
    getFinanceSummary(clock),
    getAlerts(clock),
    getRevenueOverTime()
  ]);

  return { leads, projects, finance, alerts, revenueOverTime };
}

export async function getDashboardRevenue() {
  return { revenueOverTime: await getRevenueOverTime() };
}

export async function getDashboardProjects() {
  return { projects: await getProjectStats(createClock()) };
}

export async function getDashboardLeads() {
  return { leads: await getLeadStats() };
}

async function getLeadStats(): Promise<LeadDashboardStats> {
  const [statusCounts, overTime] = await Promise.all([
    LeadModel.aggregate<{ _id: LeadStatus; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    LeadModel.aggregate<{ _id: string; count: number }>([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$dateCreated', '$createdAt'] } } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: MAX_POINTS }
    ])
  ]);
  const countFor = (status: LeadStatus) => statusCounts.find((entry) => entry._id === status)?.count ?? 0;
  const total = statusCounts.reduce((sum, entry) => sum + entry.count, 0);
  const won = countFor('Won');

  return {
    total,
    new: countFor('New'),
    inProgress: total - countFor('New') - won - countFor('Lost'),
    won,
    lost: countFor('Lost'),
    conversionRate: total === 0 ? 0 : Math.round((won / total) * 100),
    byStatus: LEAD_STATUSES.map((status) => ({ status, count: countFor(status) })),
    overTime: overTime.map((entry) => ({ date: entry._id, count: entry.count })).reverse()
  };
}

async function getProjectStats(clock: DashboardClock): Promise<ProjectDashboardStats> {
  const [statusGroups, approachingDeadline] = await Promise.all([
    ProjectModel.aggregate<{ _id: ProjectStatus; count: number; progressSum: number }>([
      { $group: { _id: '$status', count: { $sum: 1 }, progressSum: { $sum: '$progressPercentage' } } }
    ]),
    ProjectModel.countDocuments(approachingDeadlineFilter(clock))
  ]);
  const countFor = (status: ProjectStatus) => statusGroups.find((entry) => entry._id === status)?.count ?? 0;
  const active = statusGroups.filter((entry) => !INACTIVE_PROJECT_STATUSES.includes(entry._id));
  const activeCount = active.reduce((sum, entry) => sum + entry.count, 0);
  const activeProgress = active.reduce((sum, entry) => sum + entry.progressSum, 0);

  return {
    totalActive: activeCount,
    inProgress: countFor('In Progress'),
    onHold: countFor('On Hold'),
    completed: countFor('Completed'),
    approachingDeadline,
    overallProgress: activeCount === 0 ? 0 : Math.round(activeProgress / activeCount),
    byStatus: PROJECT_STATUSES.map((status) => ({ status, count: countFor(status) }))
  };
}

async function getFinanceSummary(clock: DashboardClock): Promise<AgencyFinancialSummary> {
  const [[invoiceTotals], [expenseTotals]] = await Promise.all([
    InvoiceModel.aggregate<{ invoiced: number; received: number; pending: number; overdue: number }>([
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$amount' },
          received: { $sum: '$amountPaid' },
          pending: { $sum: '$remainingAmount' },
          overdue: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$remainingAmount', 0] }, { $lt: ['$dueDate', clock.startOfToday] }] },
                '$remainingAmount',
                0
              ]
            }
          }
        }
      }
    ]),
    ExpenseModel.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  const invoiced = invoiceTotals?.invoiced ?? 0;
  const expenses = expenseTotals?.total ?? 0;

  return {
    revenue: invoiced,
    invoiced,
    received: invoiceTotals?.received ?? 0,
    pending: invoiceTotals?.pending ?? 0,
    overdue: invoiceTotals?.overdue ?? 0,
    expenses,
    profit: invoiced - expenses
  };
}

async function getAlerts(clock: DashboardClock): Promise<DashboardAlert[]> {
  const [overdueInvoices, approachingProjects, followUpLeads, onHoldProjects] = await Promise.all([
    InvoiceModel.find({ remainingAmount: { $gt: 0 }, dueDate: { $lt: clock.startOfToday } })
      .sort({ dueDate: 1 })
      .limit(MAX_ALERTS)
      .select('invoiceNumber remainingAmount dueDate')
      .lean(),
    ProjectModel.find(approachingDeadlineFilter(clock))
      .sort({ expectedCompletionDate: 1 })
      .limit(MAX_ALERTS)
      .select('projectName progressPercentage expectedCompletionDate')
      .lean(),
    LeadModel.find({ nextFollowUpDate: { $lte: clock.now }, status: { $nin: CLOSED_LEAD_STATUSES } })
      .sort({ nextFollowUpDate: 1 })
      .limit(MAX_ALERTS)
      .select('name companyName nextFollowUpDate')
      .lean(),
    ProjectModel.find({ status: 'On Hold' })
      .sort({ updatedAt: -1 })
      .limit(MAX_ALERTS)
      .select('projectName notes updatedAt')
      .lean()
  ]);

  const alerts: DashboardAlert[] = [
    ...overdueInvoices.map((invoice) => ({
      id: `invoice-${invoice._id}`,
      type: 'overdue-payment' as const,
      title: `Invoice ${invoice.invoiceNumber} overdue`,
      description: `Outstanding balance ${invoice.remainingAmount}`,
      href: '/finance/invoices',
      date: invoice.dueDate?.toISOString()
    })),
    ...approachingProjects.map((project) => ({
      id: `project-${project._id}`,
      type: 'project-deadline' as const,
      title: `${project.projectName} deadline approaching`,
      description: `${project.progressPercentage}% complete`,
      href: `/projects/${project._id}`,
      date: project.expectedCompletionDate?.toISOString()
    })),
    ...followUpLeads.map((lead) => ({
      id: `lead-${lead._id}`,
      type: 'lead-follow-up' as const,
      title: `${lead.companyName} needs follow-up`,
      description: lead.name,
      href: `/leads/${lead._id}`,
      date: lead.nextFollowUpDate?.toISOString()
    })),
    ...onHoldProjects.map((project) => ({
      id: `project-hold-${project._id}`,
      type: 'project-on-hold' as const,
      title: `${project.projectName} is on hold`,
      description: project.notes ?? 'Project is paused',
      href: `/projects/${project._id}`,
      date: project.updatedAt?.toISOString()
    }))
  ];

  return alerts.slice(0, MAX_ALERTS);
}

/** Last 12 months that have invoices or expenses, keyed `YYYY-MM` (UTC), oldest first. */
async function getRevenueOverTime(): Promise<RevenuePoint[]> {
  const monthOf = (field: string) => ({ $dateToString: { format: '%Y-%m', date: field } });
  const [invoiceMonths, expenseMonths] = await Promise.all([
    InvoiceModel.aggregate<{ _id: string; invoiced: number; received: number }>([
      { $group: { _id: monthOf('$invoiceDate'), invoiced: { $sum: '$amount' }, received: { $sum: '$amountPaid' } } }
    ]),
    ExpenseModel.aggregate<{ _id: string; expenses: number }>([
      { $group: { _id: monthOf('$date'), expenses: { $sum: '$amount' } } }
    ])
  ]);
  const points = new Map<string, RevenuePoint>();
  const pointFor = (month: string) => {
    const point = points.get(month) ?? { date: month, invoiced: 0, received: 0, expenses: 0 };
    points.set(month, point);
    return point;
  };

  for (const entry of invoiceMonths) {
    const point = pointFor(entry._id);
    point.invoiced += entry.invoiced;
    point.received += entry.received;
  }

  for (const entry of expenseMonths) {
    pointFor(entry._id).expenses += entry.expenses;
  }

  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_POINTS);
}

function approachingDeadlineFilter(clock: DashboardClock) {
  return { expectedCompletionDate: { $gte: clock.now, $lte: clock.deadlineHorizon } };
}
