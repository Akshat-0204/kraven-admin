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

export const DOCUMENT_TEMPLATE_TYPES = ['Proposal', 'Contract', 'Agreement', 'Statement of Work', 'Handover', 'Other'] as const;

export const DOCUMENT_CATEGORIES = ['Proposal', 'SOW', 'MSA', 'Handover', 'Invoice', 'Other'] as const;

export const DOCUMENT_ACCESS_ROLES = ['writer', 'commenter', 'reader'] as const;

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

/** Admin app is split into two workspaces, switched from the sidebar. */
export const WORKSPACES = ['leads', 'crm'] as const;
export type Workspace = (typeof WORKSPACES)[number];

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  leads: 'Leads',
  crm: 'CRM'
};

export const WORKSPACE_DASHBOARD_PATHS: Record<Workspace, string> = {
  leads: '/dashboard/leads',
  crm: '/dashboard/crm'
};

export interface SidebarItem {
  label: string;
  path: string;
  children?: readonly { label: string; path: string }[];
}

/** Nav items per workspace. A path prefix here also decides which workspace a URL belongs to. */
export const SIDEBAR_ITEMS: Record<Workspace, readonly SidebarItem[]> = {
  leads: [
    { label: 'Dashboard', path: WORKSPACE_DASHBOARD_PATHS.leads },
    { label: 'Leads', path: '/leads' }
  ],
  crm: [
    { label: 'Dashboard', path: WORKSPACE_DASHBOARD_PATHS.crm },
    { label: 'Clients', path: '/clients' },
    { label: 'Projects', path: '/projects' },
    { label: 'Documents', path: '/documents' },
    {
      label: 'Finance',
      path: '/finance',
      children: [
        { label: 'Overview', path: '/finance' },
        { label: 'Invoices / Payments', path: '/finance/invoices' },
        { label: 'Expenses', path: '/finance/expenses' }
      ]
    }
  ]
};

/** Shown in both workspaces, pinned below the workspace nav. */
export const SHARED_SIDEBAR_ITEMS: readonly SidebarItem[] = [{ label: 'Settings', path: '/settings' }];

export const PACK_STATUSES = ['Draft', 'Sent', 'Closed'] as const;
export const PACK_ITEM_KINDS = ['document', 'payment', 'file'] as const;
export const PACK_PAYMENT_STATUSES = ['Pending', 'Sent', 'Paid'] as const;
/** Decoded size cap for a drawn signature PNG. */
export const SIGNATURE_IMAGE_MAX_BYTES = 200_000;

/** A4 page setup for the PDF renderer. */
export const DOCUMENT_PAGE = {
  format: 'A4',
  widthMm: 210,
  heightMm: 297,
  marginMm: { top: 25, bottom: 25, left: 20, right: 20 }, // top/bottom include header/footer band
  headerHeightMm: 12,
  footerHeightMm: 12,
  fontFamily: "'Inter', Arial, sans-serif",
  baseFontSizePt: 11,
  lineHeight: 1.5
} as const;

