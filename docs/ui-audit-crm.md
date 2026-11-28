# CRM UI / Layout Audit

Scope: `apps/web/src/features/{clients,projects,documents,finance,settings}` and the shared UI kit in `apps/web/src/components/ui`. Sidebar, `AppShell` and `DashboardPage` are deliberately excluded (being restructured separately).

All paths below are relative to `apps/web/src/`.

---

## 1. Summary — top 5 problems

1. **No shared layout primitives.** Every page hand-rolls its header, card, table, modal, form field and loading/empty/error state. The result is drift: card padding is p-3, p-4, p-5 or p-8; there are three table styles, four modal widths and three icon-button styles.
2. **Detail pages pile everything into one column.** `ClientDetailPage` stacks 8 panels and `ProjectDetailPage` stacks 7 in a 1/3-width right rail. That includes a full rich-text editor, a PDF preview iframe and multi-button pack cards. The rail ends up several screens taller than the main column. Tabs are needed.
3. **Tables break on phones and lack basic table hygiene.** Every table is wrapped in `overflow-hidden` rather than `overflow-x-auto`. Amounts are not right-aligned or tabular, and status is shown as plain text instead of a badge. Each row has a lone trash-icon "Actions" column, and only the name cell is clickable.
4. **Button system has one variant.** Secondary and ghost buttons are produced by repeating `bg-transparent text-white hover:bg-white/10` dozens of times. Primary buttons are used for everything (PacksPanel shows three primary buttons side by side). Buttons are h-9 but inputs and selects are h-10, so inline rows misalign. Icon buttons often lack `aria-label`, and some modal buttons lack `type="button"`, so they submit the form.
5. **Filter bars and forms are laid out with column counts that don't match their content.** Projects uses a 6-column grid for 5 controls, Invoices a 4-column grid for 7 cells and Expenses a 5-column grid for 6 cells. Date filters are unlabeled, so the user can't tell "from" from "to". Modal forms are an ungrouped 2-column dump that ends at a non-sticky footer far below the fold.

---

## 2. Cross-cutting issues

### 2.1 Page headers are inconsistent
- **Evidence:**
  - `clients/ClientListPage.tsx:49-58`, `projects/ProjectListPage.tsx:73-82`, `documents/TemplateListPage.tsx`, `finance/FinanceOverviewPage.tsx` and `settings/SettingsPage.tsx:153-159` use an eyebrow plus an h1 (`text-2xl mt-2`). The eyebrow labels differ: "Client records", "Delivery", "Documents", "Administration".
  - Detail pages use a back link plus h1 plus meta (`clients/ClientDetailPage.tsx:131-151`, `projects/ProjectDetailPage.tsx:173-192`).
  - `documents/TemplateEditorPage.tsx:66` uses `md:items-end`, while the other headers use `items-center` or `items-start`.
  - Back-link text varies between "Clients", "Projects" and "Back to templates".
- **Why it is bad:**
  - The title baseline, action placement and back affordance move between pages.
  - Users cannot build muscle memory.
  - The eyebrow duplicates the sidebar label.
- **Fix:** Add a `PageHeader` primitive (see §4) and use it on every page. Use one back-link pattern: `← {Parent}` above the title, shown as a muted small link. Put actions top-right and let them wrap below the title on phones.

### 2.2 Card / section containers drift
- **Evidence:**
  - The string `rounded border border-border bg-panel` plus padding is repeated in almost every file. Padding varies: p-3 (`ClientListPage.tsx:60`), p-4 (detail panels), p-5 (`SettingsPage.tsx:197` and others) and p-8 (empty states).
  - Section titles also vary:
    - `ClientDetailPage` and `ProjectDetailPage` use `text-sm font-semibold mb-4`.
    - Settings uses `text-base font-semibold`.
    - The Invoices "Recent payments" heading is `text-sm`.
  - Inner tiles use `bg-black`, for example Metric in `ProjectDetailPage.tsx:412-419`, deliverables at 241-256, and Settings tiles at 343 and 372.
- **Why it is bad:** Visual rhythm differs page to page, and there is no single place to tune density.
- **Fix:** Add a `Card` with `header` (title, description, actions) and a `padding` prop (`sm`=p-3, `md`=p-4 by default, `lg`=p-5). Use one section-title style. Replace inner `bg-black` tiles with a `bg-white/[0.02]` "inset" variant of `Card`.

### 2.3 Spacing scale is ad hoc
- **Evidence:**
  - Page roots use `space-y-5`, except Settings at `space-y-6` (`SettingsPage.tsx:152`).
  - Grid gaps are `gap-4` on detail pages and `gap-6` on Settings.
  - Label spacing varies:
    - `space-y-2` in the modals (`clients/ClientFormModal.tsx`)
    - `space-y-1.5` in Settings (`SettingsPage.tsx:264`)
    - `space-y-1` in the template editor (`TemplateEditorPage.tsx:81-96`)
  - Label font size is `text-sm` in most places but `text-xs` in `clients/PortalPanel.tsx`.
- **Fix:** Agree on a scale and encode it in the primitives:
  - page `space-y-6`
  - card body `space-y-4`
  - field `space-y-1.5`
  - grid `gap-4`
  - label `text-sm text-muted`
  - error `text-xs text-red-300`

### 2.4 Button hierarchy and sizing
- **Evidence:**
  - `components/ui/button` has a single white/black variant.
  - Ghost overrides are repeated everywhere: `ClientDetailPage.tsx` (Edit button, trash buttons), `PayeeProfilesSection.tsx:77,86` and `SettingsPage.tsx:438,481,493`.
  - Settings has a danger button built entirely from class overrides: `SettingsPage.tsx:493`, `bg-transparent text-red-300 hover:bg-red-500/20 border-red-500/30`.
  - Icon-button sizes are h-7 w-7 (`documents/DocumentsPanel.tsx:189-216`), h-8 w-8, h-8 px-2 (`PayeeProfilesSection.tsx`), and raw `<button className="p-1 text-muted">` (`projects/ProjectUpdatesPanel.tsx:168-188`).
  - Button is h-9; Input and Select are h-10.
- **Why it is bad:**
  - There is no visual priority. On `PacksPanel.tsx:67-90` Send, Send + email and Email client are all primary.
  - Inline input-plus-button rows are 4px out of alignment: Links add form, Portal panel, Payee form.
- **Fix:** Add `cva` variants to Button: `primary | secondary | ghost | danger` and sizes `sm (h-8) | md (h-9/h-10, aligned with inputs) | icon`. Add an `IconButton` that requires a `label`, which becomes the `aria-label`. Pick one height for controls (h-9 for Input, Select and Button).

### 2.5 Loading / empty / error states
- **Evidence:**
  - Ad-hoc divs: `ClientListPage.tsx:70-79`, `ProjectListPage.tsx:122-131`, `ClientDetailPage.tsx:98-114`.
  - The `ClientListPage` empty state always says "No clients match the current search", even when no search has been typed.
  - Missing states:
    - `DocumentsPanel` has no `isLoading` branch, so it shows "No generated documents" while loading.
    - `PacksPanel` has no loading state.
    - The payments table on `InvoicesPaymentsPage` has no loading state.
  - The empty state varies: dashed box, `<p>` (`EmailLogPanel.tsx:35`) or `<li>` (`PacksPanel.tsx:165`).
  - Developer commands are shown in the UI: `TemplateListPage.tsx:32` (`pnpm --filter @kraven/api seed:templates`) and `PayeeProfilesSection.tsx:64` (`pnpm --filter @kraven/api seed:payees`).
  - The `ClientDetailPage` error state uses a back `Button`, while the header uses a `Link`.
- **Fix:**
  - Add `EmptyState {icon, title, description, action}`, `LoadingState {rows?}` (skeleton) and `ErrorState {error, onRetry}`.
  - Add an optional `QueryBoundary` wrapper that takes a React Query result.
  - Remove the CLI hints from the UI and use action buttons instead ("Add payee", "Create template").

### 2.6 Tables
- **Evidence:**
  - `projects/ProjectListPage.tsx:133-181`, `finance/InvoicesPaymentsPage.tsx:131-177,180-210`, `finance/ExpensesPage.tsx` and `documents/TemplateListPage.tsx` all use `overflow-hidden`.
  - Cell styles differ: `px-3 py-3` with `divide-y` versus `th p-3 tracking-wider` with `border-b last:border-0` (TemplateListPage).
  - Amounts are left-aligned and not `tabular-nums`.
  - Status is plain text in the invoice table and the email log (`EmailLogPanel.tsx:46`).
  - Only the name cell is a link.
  - Each row has an "Actions" column holding a single trash icon.
- **Why it is bad:**
  - Columns are clipped on a 375px phone and can't be scrolled into view.
  - Money is hard to scan.
  - Row click targets are tiny.
- **Fix:**
  - Add a `DataTable` (§4) with an `overflow-x-auto` wrapper, `align: 'right'` for numbers, `rowHref` to make the whole row a link, and `hideBelow: 'md'` for secondary columns.
  - Collapse row actions into a kebab menu (`RowActions`), or move delete to the detail page.

### 2.7 Lists vs tables are mixed for the same kind of data
- **Evidence:** Clients are a card grid (`ClientListPage.tsx:81-113`) showing only email and phone. Projects, invoices, expenses and templates use tables.
- **Fix:** Switch Clients to `DataTable` with these columns: name, company, email, phone, active projects, outstanding balance, portal status. Keep cards only as the phone fallback.

### 2.8 Modals
- **Evidence:**
  - The same shell is repeated in each modal: `fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4` with an inner `max-h-[90vh] w-full max-w-* overflow-y-auto rounded border border-border bg-panel`. It appears in `clients/ClientFormModal.tsx:62-69` and in the Project, Invoice, Expense and Payment form modals.
  - Max widths differ: 4xl, 3xl and md.
  - None of them handle Escape, trap focus, set `aria-modal`/`role="dialog"`, or have a sticky footer.
  - `PaymentFormModal` has no close X.
  - Cancel buttons have no `type="button"`: `finance/InvoiceFormModal.tsx:179` and `finance/PaymentFormModal.tsx:81`. The InvoiceFormModal close X at `:95` has no `type` either. Each of these submits the form.
- **Fix:** Add a `Modal {title, description, size, footer, onClose}` that renders a header, a scrollable body and a sticky footer, and handles Escape and focus. Every footer button gets an explicit `type`.

### 2.9 Form layouts
- **Evidence:**
  - `ClientFormModal.tsx` is `grid gap-4 p-5 md:grid-cols-2` with about 10 ungrouped fields. `taxInfo` and `notes` are shown on the detail page but cannot be edited.
  - `projects/ProjectFormModal.tsx` has these problems:
    - A "Find client" Input plus a separate Client Select (101-121).
    - Priority is a free-text Input (133-136).
    - Three date fields in a 2-column grid leave one orphan.
    - Deliverables is a textarea.
  - `finance/ExpenseFormModal.tsx:137-152` wraps a readOnly Input and an Upload button inside a `<label>`.
  - Inline forms in panels use unlabeled inputs with placeholders only: `PacksPanel.tsx:167-186`, the Links add form at `ClientDetailPage.tsx:206-245`, and `PayeeProfilesSection.tsx:99-105`.
- **Fix:**
  - Add `FormField {label, hint, error, span}` and `FormSection {title, description}` so long forms are grouped: Contact / Company / Billing & tax / Notes.
  - Use a client combobox instead of search plus select.
  - Make Priority a select.
  - Put dates in a 3-column row from `md` up.

### 2.10 Status display
- **Evidence:**
  - `components/statusBadge` only covers lead and project statuses.
  - Invoice status is plain text (`InvoicesPaymentsPage.tsx:131-177`).
  - Email status is coloured text (`EmailLogPanel.tsx:46`).
  - Portal enabled/disabled is coloured text (`PortalPanel.tsx`).
  - Payee default is `text-emerald-300` text (`PayeeProfilesSection.tsx:71`).
  - Settings renders invoice statuses as neutral chips (`SettingsPage.tsx:399`).
  - The `ClientDetailPage` projects list (178-202) shows status and percentage as plain text, even though `ProjectStatusBadge` and `ProgressBar` exist.
- **Fix:** Add a generic `StatusBadge {tone: neutral|info|success|warning|danger}` plus per-domain maps for invoice, document, pack, email, portal and payee statuses.

### 2.11 Duplicated helpers and markup
- **Evidence:**
  - `formatDate` and `formatCurrency` exist separately in `clients/clientFormat.ts`, `projects/projectFormat.ts` and `finance/financeFormat.ts`. Code also calls `toLocaleString`/`toLocaleDateString('en-IN')` ad hoc.
  - `PacksPanel.tsx:92-111` builds amounts as the string `"INR {amount}"`.
  - The Settings currency and date-format preferences (`SettingsPage.tsx:48-49,87-91`) are saved to localStorage, but no formatter reads them.
  - `Info` is defined twice, at `ClientDetailPage.tsx:330-357` and `ProjectDetailPage.tsx:421-448`.
  - `Metric` is defined twice, at `ProjectDetailPage.tsx:412-419` and `FinanceOverviewPage.tsx:39-46`, with different background and size.
  - Link-list and document-upload rows are identical between `ClientDetailPage.tsx:206-290` and `ProjectDetailPage.tsx:292-376`.
- **Fix:** Create one `lib/format.ts`, which also reads the workspace preference. Add `DescriptionList`, `StatCard`, `LinkListEditor` and `AttachmentList` primitives.

### 2.12 One-off Tailwind
- **Examples:**
  - Search-icon offset `absolute left-6 top-6` at `ClientListPage.tsx:60-68`; everywhere else uses left-3 top-3.
  - `text-neutral-300` at `ProjectUpdatesPanel.tsx:191`.
  - The rainbow metric colours at `FinanceOverviewPage.tsx`: indigo, emerald, amber, red, rose, violet.
  - Icon accent colours in Settings: `text-indigo-400`, `text-amber-400` (`SettingsPage.tsx:199,254,345,353`).
  - `min-h-[420px]` in `documents/TiptapEditor.tsx` clashes with `min-height: 400px` in `index.css` (`.kraven-editor .tiptap`).
  - `index.css` hard-codes `#030303` instead of using the token.
- **Fix:** Add semantic colour tokens to `tailwind.config.ts` (`success`, `warning`, `danger`, `info`, `accent`). Restrict metric colour to meaning (red = overdue or outstanding, green = received, neutral otherwise). Keep a single min-height for the editor.

### 2.13 Phone width / overflow
- **Evidence:**
  - Tables clip (see §2.6).
  - The `InvoiceFormModal` line-item grid `grid-cols-[1fr_5rem_7rem_2rem]` (`:136`) leaves about 100px for the description at 375px.
  - The `ClientDetailPage` website link (`:348`) does not truncate.
  - The PacksPanel header puts 3 to 4 buttons in one row.
  - The EmailLogPanel header button wraps awkwardly (26-29).
  - The Settings tab bar has 5 icon-plus-label pills that wrap to 2 or 3 rows (`SettingsPage.tsx:161-192`).
  - Settings `dl` rows use `flex justify-between` with long values such as the User ID, with no `min-w-0`/`truncate` (209-228).
- **Fix:**
  - Add a horizontally scrollable `Tabs` primitive.
  - Make `DataTable` responsive.
  - Line items should stack as cards below `sm`.
  - Add `min-w-0 truncate` on every key/value value.

---

## 3. Per-page findings

Severity: **H** = breaks layout or usability, **M** = clearly inconsistent or awkward, **L** = polish.

### Clients

| File:line | Issue | Fix | Sev |
|---|---|---|---|
| `clients/ClientListPage.tsx:81-113` | Card grid shows only email and phone. It can't be scanned or sorted, and is inconsistent with the other lists. | Use `DataTable` with name, company, email, phone, projects and outstanding columns; cards below `sm`. | H |
| `clients/ClientListPage.tsx:99-110` | A lone delete icon sits on its own row at the bottom of each card. It uses `window.confirm` and has no aria-label. | Move delete to the detail page or a row kebab; use a confirm dialog. | M |
| `clients/ClientListPage.tsx:60-68` | Search input is wrapped in a padded panel box; the icon uses a one-off `left-6 top-6`. | Use `FilterBar` with a bare search input (`left-3`). | L |
| `clients/ClientListPage.tsx:70-79` | Empty state always says "match the current search". | `EmptyState` with two variants: no data (with a "New client" CTA) and no results (with "Clear search"). | M |
| `clients/ClientDetailPage.tsx:153-317` | 2/3 + 1/3 grid; the right rail stacks Links, Uploads, DocumentsPanel, Portal, Email log, Packs, Shared files and Activity. | Use `Tabs`: **Overview** (info, general, links), **Projects**, **Documents** (uploads + generated + shared-in-portal), **Portal** (portal settings, packs, email log), **Activity**. Keep a narrow right summary card (contact, outstanding, portal status) on `lg`. | H |
| `clients/ClientDetailPage.tsx:178-202` | Projects shown as plain-text status and %. | `ProjectStatusBadge` + `ProgressBar`; whole row is a link. | M |
| `clients/ClientDetailPage.tsx:247-292` | Three "documents" concepts: uploaded files, generated documents and shared-in-portal files. | Group them under the Documents tab with sub-headers "Files", "Generated", "Visible in portal". | M |
| `clients/ClientDetailPage.tsx:250` | Upload is an icon-only primary button. | `Button variant="secondary" size="sm"` with an "Upload" label. | L |
| `clients/ClientDetailPage.tsx:213-225,272-286` | Trash buttons have no aria-label; the markup is duplicated in ProjectDetail. | `LinkListEditor` / `AttachmentList` with `IconButton label`. | M |
| `clients/ClientDetailPage.tsx:98-114` | Loading is a bare div; the error state uses a Button for "back". | `LoadingState` / `ErrorState`; the header back link is still rendered. | L |
| `clients/ClientDetailPage.tsx:348` | Long website URL overflows. | `truncate` + `title`. | M |
| `clients/ClientFormModal.tsx:62-135` | Ad-hoc modal shell; 10 ungrouped fields; no sticky footer; the close X has no aria-label; taxInfo and notes are missing. | `Modal size="lg"` + `FormSection`s (Contact / Company / Billing / Notes); add the taxInfo and notes fields. | H |
| `clients/PortalPanel.tsx` (whole, 94-99) | Three sub-forms crammed into the rail; `text-xs` labels; native checkbox; enabled state is coloured text; loading and error use different markup. | Move to the Portal tab, laid out as a two-column `Card`: left "Access" (slug, expiry, enabled `Switch`, Save), right "Access code" (generate/revoke/custom). Show a `StatusBadge` for enabled/expired. | M |
| `clients/PacksPanel.tsx:67-90` | Up to 3 primary buttons plus Delete in the card header, which overflows the rail. | One primary ("Send"), the rest in a `secondary` split or kebab menu ("Send + email", "Email client", "Delete"). | H |
| `clients/PacksPanel.tsx:92-111` | Amount built as the string "INR {amount}". | `formatCurrency`; right-aligned. | L |
| `clients/PacksPanel.tsx:167-186` | Create form is unlabeled inputs, checkbox list and equal-width label/amount fields. | `FormField`s; amount field `w-32`; checklist inside a bordered scroll area. | M |
| `clients/PacksPanel.tsx:24-37,165` | Signature hash uses break-all inside a dl; the empty state is an `li`; no loading state. | `DescriptionList` with `mono truncate` + a copy button; `EmptyState` / `LoadingState`. | L |
| `clients/EmailLogPanel.tsx:26-29,35,46` | Primary CTA in a cramped header; the empty state is a `p`; status is coloured text. | `Card actions` with a secondary button; `EmptyState`; `StatusBadge`. | L |
| `clients/SharedFilesPanel.tsx` | Fine on its own, but it is a third documents list. | Merge into the Documents tab ("Visible in portal" toggle per file row). | L |

### Projects

| File:line | Issue | Fix | Sev |
|---|---|---|---|
| `projects/ProjectListPage.tsx:84-120` | `md:grid-cols-6` for 5 controls, so the last column is empty; filters have no labels. | `FilterBar` (flex-wrap: search `flex-1 min-w-[16rem]`, selects `w-40`), visually hidden labels plus a "Clear" button. | M |
| `projects/ProjectListPage.tsx:133-181` | `overflow-hidden` table; only the name cell is linked; lone-trash Actions column. | `DataTable` with `rowHref`, `overflow-x-auto`, client and due columns hidden below md, kebab menu. | H |
| `projects/ProjectListPage.tsx:122-131` | Ad-hoc state divs. | State primitives. | L |
| `projects/ProjectDetailPage.tsx:173-204` | "% complete" appears in both the header and the Overview. | Keep it in the header meta (badge + `ProgressBar`); drop it from the Overview. | L |
| `projects/ProjectDetailPage.tsx:218-239` | "Update status" section (unlabeled select + number input saving on blur) duplicates the edit modal. | Move it to the header as a status dropdown button + inline progress slider; remove the section. | M |
| `projects/ProjectDetailPage.tsx:258-276` | 6-metric financial grid uses the local `Metric` (`bg-black text-base`). | `StatCard`; group under a **Finance** tab with the project's invoices and expenses lists. | M |
| `projects/ProjectDetailPage.tsx:278-398` | Right rail stacks Client, Links, Docs, DocumentsPanel, Updates, Shared files and Activity. | `Tabs`: **Overview** (overview, deliverables, links), **Updates**, **Documents**, **Finance**, **Activity**. Right rail on `lg` keeps only the client card plus key dates. | H |
| `projects/ProjectDetailPage.tsx:241-256` | Deliverables are `bg-black` tiles. | Checklist rows inside a `Card`. | L |
| `projects/ProjectFormModal.tsx:101-121` | "Find client" input + separate Select. | `Combobox` (searchable select). | M |
| `projects/ProjectFormModal.tsx:133-136` | Priority is free text. | Select (Low/Medium/High). | M |
| `projects/ProjectFormModal.tsx` (dates) | 3 date fields in a 2-column grid leave an orphan. | `md:grid-cols-3` "Schedule" `FormSection`. | L |
| `projects/ProjectUpdatesPanel.tsx:105-150` | Save/Cancel left-aligned, unlike the modals. | Right-aligned `FormActions` component. | L |
| `projects/ProjectUpdatesPanel.tsx:168-191` | Raw `p-1` icon buttons; one-off `text-neutral-300`. | `IconButton`; `text-foreground/80`. | L |

### Documents

| File:line | Issue | Fix | Sev |
|---|---|---|---|
| `documents/DocumentsPanel.tsx:27-55` | `DraftEditor` renders the full Tiptap editor (min-h 420 + toolbar) inside the 1/3 rail. | New route `/documents/:id/edit` (or a full-screen `Modal size="full"`) with the same layout as `TemplateEditorPage`; the panel only lists drafts with an "Edit" link. | H |
| `documents/DocumentsPanel.tsx:132-170` | Template select + flex-1 Preview/Create buttons + `h-96` iframe preview in the narrow rail. | A "New document" wide modal: template select at the top, preview on the left and variables/actions on the right on `lg`. | H |
| `documents/DocumentsPanel.tsx:127-129` | Icon-only primary "New document" toggle. | Labelled `secondary sm` button in `Card actions`. | L |
| `documents/DocumentsPanel.tsx` (query) | No loading state; shows "No generated documents" while loading. | `QueryBoundary`. | M |
| `documents/DocumentsPanel.tsx:189-216` | h-7 icon buttons with no labels. | `IconButton`. | L |
| `documents/TemplateListPage.tsx:32` | Empty state shows the `pnpm --filter @kraven/api seed:templates` command. | `EmptyState` with a "New template" action. | M |
| `documents/TemplateListPage.tsx` (table) | Different table styles (`p-3 tracking-wider`, `border-b last:border-0`); `overflow-hidden`; only the name is linked. | `DataTable`. | M |
| `documents/TemplateEditorPage.tsx:66` | Header `md:items-end`, a different back-link wording, version shown as a stray `p text-xs`. | `PageHeader back meta={<Badge>v{n}</Badge>}`; Save in `actions`. | M |
| `documents/TemplateEditorPage.tsx:81-96` | Name/Type fields in their own panel with `space-y-1`. | One inline row inside the header area (`grid md:grid-cols-[1fr_12rem]`) using `FormField`. | L |
| `documents/TemplateEditorPage.tsx:98-107` | Full-bleed editor with no page canvas; the variable help text sits below the editor. | Two-column layout on `lg`: editor canvas `max-w-[820px]` (page-like, white-on-dark paper) + a right "Variables" side panel with clickable inserts; help text goes there. | M |
| `documents/TemplateEditorPage.tsx:57-62` | Loading and error states lose the back link. | Always render `PageHeader`. | L |
| `documents/TiptapEditor.tsx` | Raw `select` for variables with `ml-auto h-8 text-xs`; no toolbar group separators; `min-h-[420px]` vs CSS 400. | Kit `Select size="sm"`; `ToolbarGroup` dividers; sticky toolbar; one min-height. | L |

### Finance

| File:line | Issue | Fix | Sev |
|---|---|---|---|
| `finance/FinanceOverviewPage.tsx` (whole) | Six rainbow metrics in `md:grid-cols-3` and nothing else; no actions or links. | `StatCard` row (4-up on `lg`, 2-up on phones) with semantic tones; below it, "Overdue invoices" and "Recent payments" `DataTable`s (5 rows, "View all" links); header actions "New invoice" and "Log expense". | M |
| `finance/FinanceOverviewPage.tsx:39-46` | Local `Metric` duplicate. | `StatCard`. | L |
| `finance/InvoicesPaymentsPage.tsx` (filter grid) | `md:grid-cols-4` with 7 cells, so 3 wrapped rows; unlabeled date inputs. | `FilterBar` + `DateRangeField` ("Issued from – to"). | M |
| `finance/InvoicesPaymentsPage.tsx:131-177` | No client or project column; status is plain text; amounts left-aligned; mixed action styles (ghost download, primary "Pay", ghost trash with no label); `overflow-hidden`. | `DataTable` with Number, Client, Project, Issued, Due, Amount (right), Outstanding (right), `StatusBadge`; row actions: "Record payment" (secondary sm) + kebab (Download, Delete). | H |
| `finance/InvoicesPaymentsPage.tsx:180-210` | A second "Recent payments" table stacked below with a small h2; no invoice reference; no loading state. | `Tabs` **Invoices** / **Payments** (URL-synced); add an Invoice # column; state primitives. | M |
| `finance/InvoiceFormModal.tsx:136` | Line-item grid `[1fr_5rem_7rem_2rem]` with no column headers; overflows on phones. | `LineItemsTable` with headers (Description / Qty / Rate / Amount), row amount shown, stacked cards below `sm`. | H |
| `finance/InvoiceFormModal.tsx:146-148` | Totals in `text-xs`; Amount field above the items, total below. | Right-aligned totals block (Subtotal, Tax, **Total** at `text-base font-semibold`) under the items; show the manual Amount only when there are no items. | M |
| `finance/InvoiceFormModal.tsx` (tax/amount) | Amount is disabled when items exist; tax is disabled when there are none, with no explanation. | Hide rather than disable, plus a hint. | L |
| `finance/InvoiceFormModal.tsx:95,179` | Close X and Cancel have no `type="button"`, so they submit the form. | `Modal` footer with typed buttons. | H |
| `finance/PaymentFormModal.tsx:81` | Cancel has no `type="button"`; no close X; different header. | `Modal size="sm"` with `description="Outstanding ₹…"`. | H |
| `finance/ExpensesPage.tsx` (filter grid) | `md:grid-cols-5` with 6 cells, so the last date wraps alone. | `FilterBar` + `DateRangeField`. | M |
| `finance/ExpensesPage.tsx` (table) | No project or receipt column; rows aren't editable; `overflow-hidden`; amount left-aligned. | `DataTable` with Date, Description, Category badge, Project, Receipt (paperclip), Amount (right); row click opens the edit modal. | M |
| `finance/ExpenseFormModal.tsx:137-152` | `<label>` wraps a readOnly Input + primary Upload button. | `FileField` (dropzone-lite: filename + "Choose file" secondary button + remove). | L |

### Settings

| File:line | Issue | Fix | Sev |
|---|---|---|---|
| `settings/SettingsPage.tsx:161-192,508-533` | Local `TabButton` pills (white active fill) wrap to multiple rows on phones; not URL-synced. | Shared `Tabs` (underline style, horizontal scroll, `?tab=`); on `lg`, optionally a left vertical nav (`grid lg:grid-cols-[14rem_1fr]`). | M |
| `settings/SettingsPage.tsx:152-159` | `space-y-6` vs `space-y-5` elsewhere; eyebrow header. | `PageHeader`. | L |
| `settings/SettingsPage.tsx:195-298` | Account tab: profile and security in the left column, password in the right; `p-5` cards; decorative icon circles in indigo/amber; full-width password button. | Single column `max-w-2xl` of `Card`s (Profile, Password, Security). Password form uses `FormField`; the button is auto-width and right-aligned. | M |
| `settings/SettingsPage.tsx:209-228,444-467` | `flex justify-between` key/value rows with no truncation (User ID). | `DescriptionList layout="inline"` with `min-w-0 truncate`. | L |
| `settings/SettingsPage.tsx:301-336` | Currency and date-format preferences save to localStorage, but nothing reads them. App name is a disabled input. | Wire them into `lib/format.ts`; show the app name as read-only text, not a disabled input. | M |
| `settings/SettingsPage.tsx:338-361` | "Appearance" card is informational filler (font list). | Drop it, or fold it into System as `DescriptionList`. | L |
| `settings/SettingsPage.tsx:365-419` | Pipeline tab shows `bg-black` tiles per status, and invoice statuses as neutral chips. | `Card` with an ordered list of `StatusBadge`s; invoice statuses use the new invoice badge tones. | L |
| `settings/SettingsPage.tsx:421-425` | Payments tab is `max-w-2xl` while the other tabs are a full-width 2-column grid. | Make every tab `max-w-3xl`, single column. | L |
| `settings/SettingsPage.tsx:438,481,492-498` | Buttons shrunk with `h-8 text-xs`; danger styling via overrides. | `Button size="sm"`, `variant="danger"`. | L |
| `settings/PayeeProfilesSection.tsx:64` | Empty state shows a CLI command. | `EmptyState` "No payees yet". | M |
| `settings/PayeeProfilesSection.tsx:71` | "Default" is green text. | `StatusBadge tone="success"`. | L |
| `settings/PayeeProfilesSection.tsx:99-105` | Unlabeled Name/UPI inputs (h-10) + Button (h-9) misaligned. | `FormField`s with visible labels; heights unified. | L |

---

## 4. Proposed shared primitives

All of these go in `components/ui/` (layout ones may go in `components/layout/`). `cn` already exists in `lib/utils`. Add `class-variance-authority` for variants.

```tsx
// PageHeader.tsx
type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;            // one line, muted
  back?: { to: string; label: string };
  meta?: ReactNode;                // badges, progress, version chip
  actions?: ReactNode;             // right-aligned; wraps below title < sm
};
```
Adopted by: every list page, every detail page, TemplateEditorPage, FinanceOverview, InvoicesPayments, Expenses, Settings.

```tsx
// Card.tsx
type CardProps = {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';   // default md (p-4); 'none' for tables
  variant?: 'default' | 'inset';           // inset replaces bg-black tiles
  children: ReactNode;
};
```
Adopted by: all detail panels (Client, Project, Portal, Packs, EmailLog, Documents, Updates, SharedFiles), all Settings sections, filter bars, and table wrappers.

```tsx
// button.tsx (extend existing)
variant: 'primary' | 'secondary' | 'ghost' | 'danger';
size: 'sm' | 'md' | 'icon-sm' | 'icon';
// IconButton.tsx
type IconButtonProps = { label: string; icon: LucideIcon; variant?: 'ghost'|'danger'; size?: 'sm'|'md' } & ButtonHTMLAttributes;
// default `type="button"` for both unless type passed
```
Adopted by: everywhere. This removes every `bg-transparent text-white hover:bg-white/10` override.

```tsx
// DataTable.tsx
type Column<T> = {
  key: string; header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';        // right also applies tabular-nums
  width?: string; hideBelow?: 'sm' | 'md' | 'lg';
};
type DataTableProps<T> = {
  columns: Column<T>[]; rows: T[]; getRowId: (r: T) => string;
  rowHref?: (r: T) => string;      // whole row navigates
  rowActions?: (r: T) => ReactNode;  // renders RowActions kebab
  loading?: boolean; error?: unknown; empty?: ReactNode;
  mobile?: (r: T) => ReactNode;    // optional card renderer < sm
};
```
Adopted by: ClientList, ProjectList, TemplateList, Invoices, Payments, Expenses, the FinanceOverview mini-tables, and the ClientDetail Projects tab.

```tsx
// FilterBar.tsx
type FilterBarProps = { search?: { value; onChange; placeholder }; children?: ReactNode; onClear?: () => void };
// DateRangeField.tsx
type DateRangeFieldProps = { label: string; from: string; to: string; onChange: (r: {from; to}) => void };
```
Adopted by: ClientList, ProjectList, Invoices, Expenses.

```tsx
// FormField.tsx
type FormFieldProps = { label: string; htmlFor?: string; hint?: ReactNode; error?: string; span?: 1 | 2 | 'full'; required?: boolean; children: ReactNode };
// FormSection.tsx
type FormSectionProps = { title: string; description?: string; columns?: 1 | 2 | 3; children: ReactNode };
// FormActions.tsx — right-aligned button row, used in inline forms and modal footers
```
Adopted by: all 5 modals, Settings password form, PortalPanel, PacksPanel create form, Links add form, ProjectUpdatesPanel, TemplateEditor meta, PayeeProfilesSection.

```tsx
// Modal.tsx
type ModalProps = {
  open: boolean; onClose: () => void;
  title: string; description?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: ReactNode;              // sticky
  children: ReactNode;             // scrollable body
};
// role="dialog" aria-modal, Escape closes, focus first field, restore focus on close
```
Adopted by: ClientFormModal (lg), ProjectFormModal (lg), InvoiceFormModal (xl), ExpenseFormModal (md), PaymentFormModal (sm), the new-document / draft editor (full), and confirm dialogs.

```tsx
// ConfirmDialog.tsx — replaces window.confirm
type ConfirmDialogProps = { open; title; description; confirmLabel?; tone?: 'danger' | 'default'; onConfirm; onCancel };
```
Adopted by: all deletes (client, project, invoice, expense, payee, pack, links, files, documents).

```tsx
// States.tsx
EmptyState  { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; compact?: boolean }
LoadingState{ variant?: 'table' | 'card' | 'inline'; rows?: number }
ErrorState  { error: unknown; onRetry?: () => void }
QueryBoundary<T>{ query: UseQueryResult<T>; empty?: (d: T) => boolean; emptyState?: ReactNode; children: (d: T) => ReactNode }
```
Adopted by: every page and panel.

```tsx
// Tabs.tsx
type TabsProps = { tabs: { id: string; label: string; count?: number; icon?: LucideIcon }[]; param?: string /* default 'tab' */; children: (active: string) => ReactNode };
// underline style, overflow-x-auto, URL-synced via useSearchParams
```
Adopted by: ClientDetail, ProjectDetail, InvoicesPayments, Settings.

```tsx
// DescriptionList.tsx
type DescriptionListProps = { items: { label: string; value: ReactNode; mono?: boolean; href?: string; span?: 2 }[]; layout?: 'grid' | 'inline'; columns?: 1 | 2 };
// value cell: min-w-0 truncate, title attr; '—' fallback for empty
```
Adopted by: ClientDetail (replaces `Info`), ProjectDetail (replaces `Info`), PortalPanel, PacksPanel SignatureAudit, Settings profile/system.

```tsx
// StatCard.tsx
type StatCardProps = { label: string; value: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger'; hint?: ReactNode; href?: string };
```
Adopted by: FinanceOverview, ProjectDetail finance tab, optional client summary card.

```tsx
// StatusBadge.tsx (generalise components/statusBadge)
type StatusBadgeProps = { tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; children: ReactNode; dot?: boolean };
// plus mapping helpers: InvoiceStatusBadge, DocumentStatusBadge, PackStatusBadge, EmailStatusBadge, PortalStatusBadge
// LeadStatusBadge / ProjectStatusBadge re-implemented on top of it
```
Adopted by: invoice table, documents panel, packs, email log, portal panel, payees, settings pipeline tab.

```tsx
// LinkListEditor.tsx
type LinkListEditorProps = { links: { id; label; url }[]; onAdd: (l) => Promise<void>; onRemove: (id) => void; pending?: boolean };
// AttachmentList.tsx
type AttachmentListProps = { files: Attachment[]; onUpload: (f: File) => void; onRemove: (id) => void; onToggleShared?: (id, shared) => void; uploading?: boolean };
```
Adopted by: ClientDetail and ProjectDetail (this replaces the duplicated blocks, and `onToggleShared` absorbs SharedFilesPanel).

```ts
// lib/format.ts
formatCurrency(amount: number, currency?: string): string   // reads workspace pref
formatDate(d: string | Date, style?: 'short' | 'long' | 'datetime'): string
formatRelative(d): string
```
This replaces `clientFormat.ts`, `projectFormat.ts`, `financeFormat.ts`, the inline `toLocale*` calls and the `"INR {amount}"` strings.

Also small additions: `Combobox` (client picker), `Switch` (portal enabled), `FileField` (receipt upload), `LineItemsTable` (invoice), `RowActions` (kebab menu).

---

## 5. Implementation plan

Each chunk is shippable and reviewable on its own. Primitives land before the pages that adopt them, and each page migration is behaviour-preserving unless stated otherwise.

1. **Tokens + Button variants.**
   - Add semantic colours to `tailwind.config.ts`, and use the token instead of `#030303` in `index.css`.
   - Add `cva` variants and sizes to `components/ui/button.tsx`, defaulting to `type="button"`.
   - Add `components/ui/IconButton.tsx`.
   - Align `components/ui/input.tsx` and `select.tsx` heights with Button.
   - Fix the untyped buttons in `finance/InvoiceFormModal.tsx:95,179` and `finance/PaymentFormModal.tsx:81`.
2. **State primitives.**
   - Add `components/ui/States.tsx` (EmptyState, LoadingState, ErrorState, QueryBoundary).
   - Adopt it in `DocumentsPanel.tsx` (fixes the missing loading state), `PacksPanel.tsx`, `EmailLogPanel.tsx`, `TemplateListPage.tsx` and `PayeeProfilesSection.tsx`.
   - Remove the CLI hints.
3. **PageHeader.**
   - Add `components/layout/PageHeader.tsx`.
   - Adopt it in `ClientListPage`, `ProjectListPage`, `TemplateListPage`, `FinanceOverviewPage`, `InvoicesPaymentsPage`, `ExpensesPage` and `SettingsPage`.
   - Detail pages and the template editor are covered in later chunks.
4. **Card.**
   - Add `components/ui/Card.tsx`.
   - Adopt it in the Settings sections, `PortalPanel`, `EmailLogPanel`, `PacksPanel`, `SharedFilesPanel`, `ProjectUpdatesPanel` and `DocumentsPanel` (container only).
5. **Format utils.**
   - Add `lib/format.ts`.
   - Replace `clientFormat.ts`, `projectFormat.ts`, `financeFormat.ts`, the inline `toLocale*` calls and the PacksPanel string amounts.
   - Wire up the Settings currency and date preferences.
6. **FormField + Modal + ConfirmDialog.**
   - Add `components/ui/FormField.tsx` (FormField, FormSection, FormActions), `components/ui/Modal.tsx` and `components/ui/ConfirmDialog.tsx`.
   - Migrate `PaymentFormModal` and `ExpenseFormModal` (including `FileField`) first, as the smallest.
7. **Modal migration, part 2.**
   - `ClientFormModal`: grouped sections; add the taxInfo and notes fields.
   - `ProjectFormModal`: `Combobox` client picker, Priority select, 3-column schedule.
   - Add `components/ui/Combobox.tsx`.
8. **InvoiceFormModal line items.**
   - Add `finance/LineItemsTable.tsx` with headers, a totals block, and stacked layout on phones.
   - Hide rather than disable the amount/tax fields.
9. **DataTable + FilterBar + DateRangeField.**
   - Add `components/ui/DataTable.tsx`, `FilterBar.tsx`, `DateRangeField.tsx` and `RowActions.tsx`.
   - Migrate `ProjectListPage` and `TemplateListPage`.
10. **Finance tables.**
    - `InvoicesPaymentsPage`: Invoices/Payments `Tabs` (add `components/ui/Tabs.tsx` here); client, project and status columns; right-aligned amounts.
    - `ExpensesPage`: project and receipt columns; row click opens edit.
11. **StatusBadge generalisation.**
    - Rewrite `components/statusBadge` on a tone-based `StatusBadge`.
    - Add the invoice, document, pack, email, portal and payee mappings.
    - Adopt them in the invoice table, panels and Settings pipeline tab.
12. **Clients list to table.**
    - `ClientListPage` uses `DataTable` + `FilterBar` with a mobile card renderer and `ConfirmDialog`.
13. **Detail primitives.**
    - Add `components/ui/DescriptionList.tsx`, `StatCard.tsx`, `features/shared/LinkListEditor.tsx` and `features/shared/AttachmentList.tsx`.
    - Swap them into `ClientDetailPage` and `ProjectDetailPage` in place, with no layout change yet.
    - Delete the local `Info` and `Metric`.
14. **Client detail tabs.**
    - `ClientDetailPage`: `PageHeader` + `Tabs` (Overview / Projects / Documents / Portal / Activity) + `lg` summary rail.
    - Re-home `PortalPanel` (two-column access layout, `Switch`), `PacksPanel` (single primary button + menu), `EmailLogPanel` and `SharedFilesPanel` (merged into AttachmentList).
15. **Project detail tabs.**
    - `ProjectDetailPage`: `PageHeader` with a status dropdown + progress; `Tabs` (Overview / Updates / Documents / Finance / Activity); remove the "Update status" section.
16. **Document drafting out of the rail.**
    - Add the route `documents/:id/edit` (`features/documents/DocumentDraftPage.tsx`) and register it in `router/routes.tsx`.
    - Add a "New document" wide modal.
    - `DocumentsPanel` becomes a list with Edit, Download and Delete.
17. **Template editor layout.**
    - `TemplateEditorPage`: `PageHeader` with a version badge; inline name/type row; paper-width canvas + Variables side panel.
    - `TiptapEditor`: kit Select, toolbar groups, sticky toolbar, one min-height.
18. **Finance overview.**
    - `FinanceOverviewPage`: `StatCard` row with semantic tones; Overdue invoices and Recent payments mini-tables; header actions.
19. **Settings alignment.**
    - `SettingsPage`: shared `Tabs` (URL-synced) and a single-column `max-w-3xl` layout.
    - Use `DescriptionList`, `FormField` and Button variants; drop the Appearance filler.
    - `PayeeProfilesSection`: labelled fields and a badge.
20. **Phone-width pass.**
    - Test every CRM route at 375px and 768px.
    - Fix the remaining overflow (truncation in description lists, header action wrapping, tab scroll).
    - Optionally add a Playwright viewport snapshot per route.
