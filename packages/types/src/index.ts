export interface HealthResponse {
  app: string;
  status: 'ok';
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface EntityLink {
  label: string;
  url: string;
}

export interface FileReference {
  fileId: string;
  filename: string;
  contentType?: string;
  uploadedAt: string;
}

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Meeting'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost';

export type ProjectStatus =
  | 'Not Started'
  | 'In Progress'
  | 'On Hold'
  | 'Client Review'
  | 'Completed'
  | 'Cancelled';

export type InvoicePaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';

export type ExpenseCategory =
  | 'Software'
  | 'Freelancer'
  | 'Hosting'
  | 'Advertising'
  | 'Operations'
  | 'Other';

export interface ActivityRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  timestamp: string;
}

export interface LeadRecord {
  id: string;
  name: string;
  companyName: string;
  email?: string;
  phone?: string;
  leadSource?: string;
  serviceInterested?: string;
  estimatedValue?: number;
  assignedPerson?: string;
  dateCreated: string;
  lastContactedDate?: string;
  nextFollowUpDate?: string;
  status: LeadStatus;
  notes?: string;
  convertedClient?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRecord {
  id: string;
  companyName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  industry?: string;
  taxInfo?: string;
  notes?: string;
  requirements?: string;
  importantInfo?: string;
  internalNotes?: string;
  links: EntityLink[];
  documents: FileReference[];
  sourceLead?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectSummaryRecord {
  id: string;
  projectName: string;
  status: ProjectStatus;
  progressPercentage: number;
  projectValue?: number;
  expectedCompletionDate?: string;
}

export interface ProjectRecord {
  id: string;
  projectName: string;
  client: string;
  description?: string;
  projectValue?: number;
  startDate?: string;
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
  status: ProjectStatus;
  progressPercentage: number;
  assignedTeam?: string;
  priority?: string;
  notes?: string;
  deliverables: string[];
  links: EntityLink[];
  documents: FileReference[];
  createdAt: string;
  updatedAt: string;
}

export interface FileMetadataRecord {
  id: string;
  filename: string;
  contentType?: string;
  length: number;
  clientVisible: boolean;
  associatedEntityType?: string;
  associatedEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  client: string;
  project?: string;
  invoiceNumber: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  paymentStatus: InvoicePaymentStatus;
  amountPaid: number;
  remainingAmount: number;
  paymentDate?: string;
  paymentMethod?: string;
  transactionReferenceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  invoice: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  transactionReferenceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  vendor?: string;
  associatedProject?: string;
  receipt?: FileReference;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFinancialSummary {
  revenue: number;
  received: number;
  pending: number;
  overdue: number;
  expenses: number;
  profit: number;
}

export interface AgencyFinancialSummary extends ProjectFinancialSummary {
  invoiced: number;
}

export interface LeadDashboardStats {
  total: number;
  new: number;
  inProgress: number;
  won: number;
  lost: number;
  conversionRate: number;
  byStatus: { status: LeadStatus; count: number }[];
  overTime: { date: string; count: number }[];
}

export interface ProjectDashboardStats {
  totalActive: number;
  inProgress: number;
  onHold: number;
  completed: number;
  approachingDeadline: number;
  overallProgress: number;
  byStatus: { status: ProjectStatus; count: number }[];
}

export interface DashboardAlert {
  id: string;
  type: 'overdue-payment' | 'project-deadline' | 'lead-follow-up' | 'project-on-hold';
  title: string;
  description: string;
  href: string;
  date?: string;
}

export interface RevenuePoint {
  date: string;
  invoiced: number;
  received: number;
  expenses: number;
}

export interface DashboardSummary {
  leads: LeadDashboardStats;
  projects: ProjectDashboardStats;
  finance: AgencyFinancialSummary;
  alerts: DashboardAlert[];
  revenueOverTime: RevenuePoint[];
}

export interface GlobalSearchResult {
  id: string;
  type: 'lead' | 'client' | 'project' | 'invoice';
  title: string;
  subtitle?: string;
  href: string;
}

export type DocumentTemplateType = 'Proposal' | 'Contract' | 'Agreement' | 'Statement of Work' | 'Other';

export type DocumentStatus = 'Draft' | 'Sent' | 'Viewed' | 'Signed';

export interface DocumentVariable {
  key: string;
  label: string;
  group: 'client' | 'project' | 'agency' | 'general';
}

export interface DocumentTemplateRecord {
  id: string;
  name: string;
  type: DocumentTemplateType;
  html: string;
  /** Variable keys referenced by the template HTML. */
  variables: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  client: string;
  project?: string;
  template: string;
  templateVersion: number;
  status: DocumentStatus;
  hasPdf: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetailRecord extends DocumentRecord {
  /** Rendered HTML snapshot; never changes when the template is edited later. */
  html: string;
}

export interface DocumentPdfLink {
  url: string;
  expiresIn: number;
}
