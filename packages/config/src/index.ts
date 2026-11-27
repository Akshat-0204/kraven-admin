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

/** Shared A4 page setup for the document editor and the PDF renderer (see docs/plans/document-editor-contract.md). */
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

/**
 * Body typography shared by the editor canvas and the PDF print shell. Scoped to `.document-content`:
 * the editor puts that class on the ProseMirror root, the print shell wraps the body in
 * `<div class="document-content">`.
 */
export const DOCUMENT_CONTENT_CSS = `
.document-content { font-family: ${DOCUMENT_PAGE.fontFamily}; font-size: ${DOCUMENT_PAGE.baseFontSizePt}pt; line-height: ${DOCUMENT_PAGE.lineHeight}; color: #1f2328; }
.document-content p { margin: 0 0 0.6em; }
.document-content h1 { font-size: 20pt; font-weight: 700; line-height: 1.25; margin: 0.8em 0 0.4em; }
.document-content h2 { font-size: 15pt; font-weight: 600; line-height: 1.3; margin: 0.8em 0 0.4em; }
.document-content h3 { font-size: 12.5pt; font-weight: 600; line-height: 1.35; margin: 0.7em 0 0.3em; }
.document-content > :first-child { margin-top: 0; }
.document-content ul { list-style: disc; padding-left: 1.5em; margin: 0 0 0.6em; }
.document-content ol { list-style: decimal; padding-left: 1.5em; margin: 0 0 0.6em; }
.document-content li > p { margin: 0 0 0.2em; }
.document-content a { color: #1a56db; text-decoration: underline; }
.document-content strong { font-weight: 700; }
.document-content hr { border: none; border-top: 1px solid #d0d7de; margin: 1em 0; }
.document-content blockquote { border-left: 3px solid #d0d7de; padding-left: 1em; color: #57606a; margin: 0 0 0.6em; }
.document-content table { border-collapse: collapse; width: 100%; margin: 0.6em 0 0.9em; }
.document-content th, .document-content td { border: 1px solid #d0d7de; padding: 4pt 6pt; vertical-align: top; text-align: left; }
.document-content th { background: #f6f8fa; font-weight: 600; }
.document-content img { max-width: 100%; height: auto; }
.document-content div[data-page-break] { page-break-after: always; break-after: page; }
`;
