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

export const DOCUMENT_TEMPLATE_TYPES = ['Proposal', 'Contract', 'Agreement', 'Statement of Work', 'Other'] as const;

export const DOCUMENT_STATUSES = ['Draft', 'Sent', 'Viewed', 'Signed'] as const;

/** Client portal slug rules: `/c/<slug>`. */
export const PORTAL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PORTAL_SLUG_MIN_LENGTH = 3;
export const PORTAL_SLUG_MAX_LENGTH = 40;
export const PORTAL_RESERVED_SLUGS = [
  'admin',
  'api',
  'app',
  'auth',
  'c',
  'clients',
  'dashboard',
  'help',
  'kraven',
  'login',
  'logout',
  'me',
  'new',
  'pay',
  'portal',
  'public',
  'settings',
  'static',
  'support',
  'www'
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
  { label: 'Templates', path: '/templates' },
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
