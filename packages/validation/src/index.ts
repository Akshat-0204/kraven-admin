import {
  ACTIVITY_ENTITY_TYPES,
  DOCUMENT_STATUSES,
  DOCUMENT_TEMPLATE_TYPES,
  EXPENSE_CATEGORIES,
  INVOICE_PAYMENT_STATUSES,
  LEAD_STATUSES,
  PORTAL_RESERVED_SLUGS,
  PORTAL_SLUG_MAX_LENGTH,
  PORTAL_SLUG_MIN_LENGTH,
  PORTAL_SLUG_PATTERN,
  PROJECT_STATUSES
} from '@kraven/config';
import { z } from 'zod';

const optionalDate = z.preprocess((value) => (value === '' ? undefined : value), z.coerce.date().optional());
const objectId = z.string().min(1, 'Required id');
const optionalObjectId = z.preprocess((value) => (value === '' ? undefined : value), objectId.optional());
/** Strict 24-hex ObjectId, so bad ids are a 400 rather than a cast error. */
const hexObjectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const healthResponseSchema = z.object({
  app: z.string(),
  status: z.literal('ok')
});

export type HealthResponseSchema = z.infer<typeof healthResponseSchema>;

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url()
});

export const fileReferenceSchema = z.object({
  fileId: objectId,
  filename: z.string().min(1),
  contentType: z.string().optional(),
  uploadedAt: z.coerce.date().optional()
});

export const leadSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  leadSource: z.string().optional(),
  serviceInterested: z.string().optional(),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  assignedPerson: z.string().optional(),
  dateCreated: z.coerce.date().optional(),
  lastContactedDate: optionalDate,
  nextFollowUpDate: optionalDate,
  status: z.enum(LEAD_STATUSES).default('New'),
  notes: z.string().optional()
});

export type LeadInput = z.infer<typeof leadSchema>;

export const updateLeadSchema = leadSchema.partial();

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const leadFilterSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  leadSource: z.string().optional(),
  assignedPerson: z.string().optional(),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  minValue: z.coerce.number().nonnegative().optional(),
  maxValue: z.coerce.number().nonnegative().optional(),
  search: z.string().optional()
});

export type LeadFilterInput = z.infer<typeof leadFilterSchema>;

export const clientSchema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  industry: z.string().optional(),
  taxInfo: z.string().optional(),
  notes: z.string().optional(),
  requirements: z.string().optional(),
  importantInfo: z.string().optional(),
  internalNotes: z.string().optional(),
  links: z.array(linkSchema).default([]),
  documents: z.array(fileReferenceSchema).default([]),
  sourceLead: optionalObjectId
});

export type ClientInput = z.infer<typeof clientSchema>;

export const updateClientSchema = clientSchema.partial();

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientFilterSchema = z.object({
  search: z.string().optional()
});

export type ClientFilterInput = z.infer<typeof clientFilterSchema>;

export const attachClientDocumentSchema = fileReferenceSchema;

export type AttachClientDocumentInput = z.infer<typeof attachClientDocumentSchema>;

export const projectSchema = z.object({
  projectName: z.string().min(1),
  client: objectId,
  description: z.string().optional(),
  projectValue: z.coerce.number().nonnegative().optional(),
  startDate: optionalDate,
  expectedCompletionDate: optionalDate,
  actualCompletionDate: optionalDate,
  status: z.enum(PROJECT_STATUSES).default('Not Started'),
  progressPercentage: z.coerce.number().min(0).max(100).default(0),
  assignedTeam: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().optional(),
  deliverables: z.array(z.string()).default([]),
  links: z.array(linkSchema).default([]),
  documents: z.array(fileReferenceSchema).default([])
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const updateProjectSchema = projectSchema.partial();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectFilterSchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  client: objectId.optional(),
  assignedTeam: z.string().optional(),
  priority: z.string().optional(),
  deadlineFrom: optionalDate,
  deadlineTo: optionalDate,
  search: z.string().optional()
});

export type ProjectFilterInput = z.infer<typeof projectFilterSchema>;

export const attachProjectDocumentSchema = fileReferenceSchema;

export type AttachProjectDocumentInput = z.infer<typeof attachProjectDocumentSchema>;

export const invoiceSchema = z.object({
  client: objectId,
  project: optionalObjectId,
  invoiceNumber: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  paymentStatus: z.enum(INVOICE_PAYMENT_STATUSES).default('Pending'),
  amountPaid: z.coerce.number().nonnegative().default(0),
  paymentDate: optionalDate,
  paymentMethod: z.string().optional(),
  transactionReferenceId: z.string().optional(),
  notes: z.string().optional(),
  /** `null`/empty clears it, falling back to the default payee. */
  payeeProfile: z.preprocess((value) => (value === '' ? null : value), hexObjectId.nullable().optional())
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const updateInvoiceSchema = invoiceSchema.partial();

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const invoiceFilterSchema = z.object({
  client: objectId.optional(),
  project: objectId.optional(),
  paymentStatus: z.enum(INVOICE_PAYMENT_STATUSES).optional(),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  search: z.string().optional()
});

export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;

export const paymentSchema = z.object({
  invoice: objectId,
  amount: z.coerce.number().positive(),
  paymentDate: z.coerce.date(),
  paymentMethod: z.string().optional(),
  transactionReferenceId: z.string().optional(),
  notes: z.string().optional()
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const paymentFilterSchema = z.object({
  invoice: objectId.optional(),
  dateFrom: optionalDate,
  dateTo: optionalDate
});

export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;

export const expenseSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  category: z.enum(EXPENSE_CATEGORIES),
  date: z.coerce.date(),
  vendor: z.string().optional(),
  associatedProject: optionalObjectId,
  receipt: fileReferenceSchema.optional(),
  notes: z.string().optional()
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const updateExpenseSchema = expenseSchema.partial();

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const expenseFilterSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  associatedProject: optionalObjectId,
  dateFrom: optionalDate,
  dateTo: optionalDate,
  search: z.string().optional()
});

export type ExpenseFilterInput = z.infer<typeof expenseFilterSchema>;

export const activitySchema = z.object({
  entityType: z.enum(ACTIVITY_ENTITY_TYPES),
  entityId: objectId,
  action: z.string().min(1),
  description: z.string().min(1),
  timestamp: z.coerce.date().optional()
});

export type ActivityInput = z.infer<typeof activitySchema>;

export const fileUploadMetadataSchema = z.object({
  associatedEntityType: z.enum(ACTIVITY_ENTITY_TYPES).optional(),
  associatedEntityId: optionalObjectId
});

export type FileUploadMetadataInput = z.infer<typeof fileUploadMetadataSchema>;

export const documentTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum(DOCUMENT_TEMPLATE_TYPES),
  html: z.string().max(500_000, 'Template is too large')
});

export type DocumentTemplateInput = z.infer<typeof documentTemplateSchema>;

export const updateDocumentTemplateSchema = documentTemplateSchema.partial();

export type UpdateDocumentTemplateInput = z.infer<typeof updateDocumentTemplateSchema>;

export const documentContextSchema = z.object({
  client: objectId,
  project: optionalObjectId
});

export type DocumentContextInput = z.infer<typeof documentContextSchema>;

export const createDocumentSchema = documentContextSchema.extend({
  template: objectId,
  title: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().min(1).optional())
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const documentFilterSchema = z.object({
  client: optionalObjectId,
  project: optionalObjectId,
  status: z.enum(DOCUMENT_STATUSES).optional()
});

export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;

export const globalSearchSchema = z.object({
  q: z.string().trim().min(1)
});

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>;

export const fileVisibilitySchema = z.object({
  clientVisible: z.boolean()
});

export type FileVisibilityInput = z.infer<typeof fileVisibilitySchema>;

export const fileListFilterSchema = z.object({
  associatedEntityType: z.enum(ACTIVITY_ENTITY_TYPES),
  associatedEntityId: hexObjectId
});

export type FileListFilterInput = z.infer<typeof fileListFilterSchema>;

const reservedSlugs = new Set<string>(PORTAL_RESERVED_SLUGS);

export const portalSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(PORTAL_SLUG_MIN_LENGTH, `Slug must be at least ${PORTAL_SLUG_MIN_LENGTH} characters`)
  .max(PORTAL_SLUG_MAX_LENGTH, `Slug must be at most ${PORTAL_SLUG_MAX_LENGTH} characters`)
  .regex(PORTAL_SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens')
  .refine((slug) => !reservedSlugs.has(slug), 'This slug is reserved');

export const portalSettingsSchema = z.object({
  slug: portalSlugSchema,
  enabled: z.boolean(),
  expiresAt: z.preprocess((value) => (value === '' ? null : value), z.coerce.date().nullable().optional())
});

export type PortalSettingsInput = z.infer<typeof portalSettingsSchema>;

/** Omit `code` to have the server generate one. */
export const portalCodeSchema = z.object({
  code: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(8, 'Code must be at least 8 characters').max(64).optional()
  )
});

export type PortalCodeInput = z.infer<typeof portalCodeSchema>;

export const portalVerifySchema = z.object({
  code: z.string().max(128)
});

export type PortalVerifyInput = z.infer<typeof portalVerifySchema>;

export const projectUpdateSchema = z.object({
  project: hexObjectId,
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().max(20_000).default(''),
  clientVisible: z.boolean().default(false),
  attachments: z.array(hexObjectId).max(20).default([]),
  postedAt: z.coerce.date().optional()
});

export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>;

export const updateProjectUpdateSchema = projectUpdateSchema.omit({ project: true }).partial();

export type UpdateProjectUpdateInput = z.input<typeof updateProjectUpdateSchema>;

export const payeeProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  vpa: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/, 'Enter a valid UPI ID (name@bank)'),
  isDefault: z.boolean().default(false)
});

export type PayeeProfileInput = z.input<typeof payeeProfileSchema>;

export const updatePayeeProfileSchema = payeeProfileSchema.partial();

export type UpdatePayeeProfileInput = z.input<typeof updatePayeeProfileSchema>;
