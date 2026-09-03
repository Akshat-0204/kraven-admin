export const APP_NAME = 'Kraven';

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Meeting',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost'
] as const;

export const PROJECT_STATUSES = [
  'Not Started',
  'In Progress',
  'On Hold',
  'Client Review',
  'Completed',
  'Cancelled'
] as const;

export const INVOICE_PAYMENT_STATUSES = ['Pending', 'Partially Paid', 'Paid', 'Overdue'] as const;

export const EXPENSE_CATEGORIES = [
  'Software',
  'Freelancer',
  'Hosting',
  'Advertising',
  'Operations',
  'Other'
] as const;

export const ACTIVITY_ENTITY_TYPES = [
  'Lead',
  'Client',
  'Project',
  'Invoice',
  'Payment',
  'Expense',
  'File'
] as const;

export const SIDEBAR_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Leads', path: '/leads' },
  { label: 'Projects', path: '/projects' },
  { label: 'Clients', path: '/clients' },
  {
    label: 'Finance',
    path: '/finance',
    children: [
      { label: 'Overview', path: '/finance' },
      { label: 'Invoices / Payments', path: '/finance/invoices' },
      { label: 'Expenses', path: '/finance/expenses' }
    ]
  },
  { label: 'Settings', path: '/settings' }
] as const;
