# Document editor — shared contract (backend ⇄ web)

Status: SUPERSEDED by docs/plans/google-docs-plan.md (documents are now Google Drive copies; Tiptap editor removed). Originally agreed 2026-11-27. Both the backend agent and the editor agent build against this. Deviations must be reported.

## Decisions (locked by owner)
- Documents get their own CRM nav item `/documents` (list + "New document"); Templates become a tab there.
- Variables are resolved **at send** (POST /:id/share), not at creation. Until then a Draft stores *unmerged* HTML with placeholders; the editor shows them as chips with live values of the assigned client/project.
- True pagination in the editor via `tiptap-pagination-plus` (MIT, supports Tiptap v3). Header/footer per page.
- Existing documents (already merged) stay as-is; merging them again is a no-op since no placeholders remain.

## Shared page setup — `packages/config/src/index.ts`
```ts
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
```
Editor and PDF renderer both read this. Body CSS (fonts, sizes, headings, tables, lists) lives in ONE exported string `DOCUMENT_CONTENT_CSS` in packages/config so editor canvas and print shell use identical typography.

## HTML conventions
- Placeholder in stored HTML: `<span data-variable="client.companyName">{{client.companyName}}</span>`.
  Plain `{{client.companyName}}` (legacy/templates) must also keep working.
- Page tokens allowed **only** in header/footer HTML: `{{page.number}}`, `{{page.total}}`.
  PDF maps them to Puppeteer `<span class="pageNumber"></span>` / `<span class="totalPages"></span>`; the editor maps them to pagination-plus page number rendering.
- Manual page break: `<div data-page-break="true"></div>` (PDF CSS: `page-break-after: always`).
- Sanitizer must allow: `span[data-variable]`, `div[data-page-break]`, `img[src^="data:"]` (logos in header).

## Model changes
DocumentTemplate: add `headerHtml: string (default '')`, `footerHtml: string (default '')`.

Document:
- `client` optional (required at share), `project` optional.
- `template` optional (blank docs), `templateVersion` optional.
- `html`: body HTML (unmerged while Draft; merged after share). Stop storing the full print shell — store body only; wrap at render time. Legacy docs whose `html` is a full shell: extract body on read (existing `extractBody`).
- add `headerHtml`, `footerHtml` (copied from template on create).
- add `mergedAt?: Date` (set at share).

## Endpoints (all under existing `/api` prefix)
| Method | Path | Body / query | Notes |
|---|---|---|---|
| GET | /documents | `?client&project&status&q&page&limit` | lists all docs when no client; `q` matches title. Each item includes `client {_id, companyName}` populated, `template {_id,name}`, `updatedAt`. |
| POST | /documents | `{ template?, client?, project?, title? }` | creates Draft with template's body/header/footer **unmerged**. Blank when no template. Default title: template name or "Untitled document". |
| GET | /documents/:id | | returns `{ ..., html (body), headerHtml, footerHtml, mergedAt }` |
| PATCH | /documents/:id | `{ title?, html?, headerHtml?, footerHtml?, client?: id\|null, project?: id\|null }` | Draft only (409 otherwise). Autosave target — must be cheap. |
| GET | /documents/:id/variables | | `{ variables: [{ key, label, group, value: string\|null }] }` resolved against assigned client/project (value null when unassigned/missing). |
| POST | /documents/:id/share | | 422 if no client. Merges body+header+footer against client/project, stores merged, sets `mergedAt`, status Sent. |
| POST/GET | /documents/:id/pdf | | Draft PDFs render with live merge (missing values shown as `[label]`); Sent+ render stored merged HTML. Header/footer via Puppeteer `displayHeaderFooter` + `headerTemplate`/`footerTemplate` (inline styles only), margins from DOCUMENT_PAGE. |
| PATCH | /document-templates/:id | adds `headerHtml?`, `footerHtml?` | |
| GET | /document-templates/variables | unchanged | used by template mode chip picker |

Validation schemas in `packages/validation/src/index.ts` updated accordingly (`createDocumentSchema`, `updateDocumentSchema`, `documentFilterSchema`, `documentTemplateSchema`).

## Web routes
- `/documents` — list (agent 3).
- `/documents/:id` — full-screen editor, document mode (agent 2). Outside AppShell, white theme.
- `/templates/:id` — same editor, template mode (agent 2).
