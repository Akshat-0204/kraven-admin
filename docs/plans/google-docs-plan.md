# Google Docs documents — plan (2026-11-27)

Replaces the in-app Tiptap editor (`docs/plans/document-editor-contract.md` is superseded).
Google Docs is the editor. The app keeps a list of links and handles copy, rename,
permissions and PDF export through the Drive + Docs APIs.

## Locked decisions

- **Templates = Google Doc links.** A template is `{ name, type, googleDocUrl }`. The owner
  edits templates in Google Docs and pastes or updates the link in the app. In the app they
  only get a view-only "Open" link. No HTML, versions or variable schema stored.
- **New document = Drive copy.** Pick template + client: `files.copy`, then rename to
  `<Client> — <Template> — <YYYY-MM-DD>`, move into the client's Drive folder, fill
  `{{client.company}}`-style placeholders with Docs `replaceAllText`, set permissions,
  open `webViewLink` in a new tab. "Blank" creates an empty Google Doc.
- **App stores the link + metadata only.** The Document row = Drive file id, URL, title,
  type, client/project, status. The content lives in Google.
- **Auth = in-app "Connect Google" button (OAuth) for the agency account** (works for Gmail and
  Workspace). Service accounts have no Drive storage quota, so they can't own copies unless
  a Workspace Shared Drive exists. No refresh token in env: the OAuth callback stores tokens
  in Mongo (encrypted), the library refreshes access tokens on its own and saves rotated
  tokens. The dashboard shows connection status + Reconnect/Disconnect.
- **Token lifetime:** Google expires refresh tokens after 7 days while the OAuth consent
  screen is in **Testing**. Set it to **In production** (or **Internal** on Workspace). The
  token then lasts until revoked, so connecting once is enough. On `invalid_grant` the app
  marks the account disconnected and the dashboard shows a "Reconnect Google" banner.
- **Access picker on create:** the "New document" dialog has an "Access" field. Multi-select
  from admin users (all pre-checked) plus "Add email" for any address, each with a role
  (Editor / Commenter / Viewer). Stored on the Document and granted via Drive permissions.
  Editable later from the doc row ("Manage access").
- **PDF = Drive export.** `files.export(mimeType=application/pdf)` → MinIO → `FileMetadata`
  on the client, with a document **category** (Proposal/SOW/MSA/Handover/Invoice/Other), an
  internal filename and a `clientVisible` flag. Files can be renamed later.
- **Puppeteer stays only for invoices** (`finance/invoice.pdf.ts` → `pdf/pdf.renderer.ts`).

## Permissions

| Object | Who | Access |
|---|---|---|
| Template Google Doc | owner (set in Google by hand) | edit |
| | app (agency account) | must be able to read it, which `files.copy` needs. Checked on save via `files.get` |
| | admins in app | view link only |
| Created document | agency account | owner |
| | emails picked in the access picker (admins and/or extra emails) | chosen role (`writer`/`commenter`/`reader`) via `permissions.create`, no notification email |
| | anyone with the link | **none**. No public sharing |
| | file settings | `writersCanShare=false`, `copyRequiresWriterPermission=true` |
| | client | **no Drive access**. The client gets the exported PDF in the portal |
| Sent document | everyone | locked with `contentRestrictions.readOnly=true` (reason "Sent to client"). "Revise" unlocks it and resets it to Draft |

## Data model changes

`DocumentTemplate`: `name, type, googleDocUrl, googleFileId (parsed from URL), active`.
Drop `html, headerHtml, footerHtml, variables, version`.

`Document`: `title, type, client, project, template, googleFileId, webViewLink, status,
access: [{email, role, permissionId}], lockedAt, pdfFile (ref FileMetadata), pdfRevisionId (Drive headRevisionId at export), createdBy`.
Drop `html, headerHtml, footerHtml, mergedAt, templateVersion, pdfKey, pdfSourceHash`.
Old document data is unimportant, so the existing rows are wiped (dev DB).

`FileMetadata`: add `category` (enum `DOCUMENT_CATEGORIES`), `sourceDocument` (ref Document),
`sourceRevisionId`.

`Client`: add `driveFolderId` (created lazily under `GOOGLE_DRIVE_ROOT_FOLDER_ID`).

`GoogleConnection` (single doc): `email, refreshToken (AES-GCM encrypted with
GOOGLE_TOKEN_KEY), accessToken, expiryDate, scopes, rootFolderId, connectedBy, connectedAt,
status (connected|disconnected), lastError`.

`packages/config`: `DOCUMENT_CATEGORIES`, `DOCUMENT_ACCESS_ROLES = ['writer','commenter','reader']`.
Reuse `DOCUMENT_TEMPLATE_TYPES`.

Env (static app config only): `GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI`
(`<api>/google/oauth/callback`), `GOOGLE_TOKEN_KEY` (32-byte key, required in prod),
`GOOGLE_DRIVE_ROOT_FOLDER_NAME` (default "Kraven Documents"; created on first connect, id
stored on the connection). With no connection the Google routes return 409 "Google not
connected", so dev and tests still boot.

## API

```
GET             /google/status                  {connected, email, connectedAt, lastError}
GET             /google/oauth/start             (admin auth) -> 302 Google consent (access_type=offline, prompt=consent, state=signed nonce cookie)
GET             /google/oauth/callback          verify state -> exchange code -> save GoogleConnection -> ensure root folder -> 302 /dashboard/crm?google=connected
POST            /google/disconnect              revoke token + mark disconnected
GET             /admins                         admin users {id, name, email} for the access picker
GET/POST/PATCH  /document-templates            {name,type,googleDocUrl}   (validate link + read access)
DELETE          /document-templates/:id
GET             /documents?client=&status=&q=
POST            /documents                      {templateId?, clientId?, projectId?, title?, access:[{email, role}]} -> copy -> {id, webViewLink}
PUT             /documents/:id/access           [{email, role}] -> diff vs Drive permissions (create/update/delete)
PATCH           /documents/:id                  {title} -> Drive rename too; {client, project}
POST            /documents/:id/refill           re-run replaceAllText (Draft only)
POST            /documents/:id/pdf              {category, filename, clientVisible} -> export -> FileMetadata
POST            /documents/:id/share            export snapshot PDF + lock + status Sent (as now, for packs)
POST            /documents/:id/revise           unlock, status Draft (blocked if Signed)
DELETE          /documents/:id                  trash the Drive file + delete row (Draft only)
PATCH           /files/:id                      {filename, category, clientVisible}   (rename)
```

## Stages

**Owner one-time setup (Google Cloud Console):** create a project, enable the Drive + Docs
APIs, configure the OAuth consent screen and **set it to In production** (Internal on Workspace),
and create an OAuth client of type Web with redirect URI `<api>/google/oauth/callback`. Put the
client id/secret in env, then click "Connect Google" in the app.

**Stage 0: checkpoint.** The working tree has the uncommitted Tiptap editor WIP. Commit it as
`wip(documents): tiptap editor (superseded)` so it can be recovered, then rip it out on top.

**Stage 1: Google connection + service** (`apps/api/src/modules/google/`)
- Deps: `@googleapis/drive`, `@googleapis/docs`, `google-auth-library`.
- `google.connection.model.ts` + `token.crypto.ts` (AES-256-GCM).
- `google.oauth.ts`: start/callback/disconnect/status routes. State is a random nonce in a
  short-lived signed cookie, so callbacks can't be forged.
- `google.client.ts`: `getAuthedClient()` loads the connection, builds an OAuth2 client and
  saves rotated/refreshed tokens on the `tokens` event. On `invalid_grant` it sets
  status=disconnected and throws 409 "Reconnect Google". `requireGoogle()` guard.
- `drive.service.ts`: `parseDocId(url)`, `getFile`, `copyFile`, `createBlankDoc`,
  `renameFile`, `ensureFolder(name, parent)`, `moveToFolder`, `setAccess(fileId, [{email, role}])`
  (diffs against current permissions, `sendNotificationEmail=false`),
  `setLocked(bool)`, `exportPdf(fileId) -> Buffer` (10 MB export cap → clear error), `trashFile`.
- `docs.service.ts`: `replacePlaceholders(fileId, map)` → one `batchUpdate` of `replaceAllText`.
- Scopes: `drive` (needed to copy templates the app didn't create), `documents`, `userinfo.email`.
- Web: `GoogleConnectCard` on the CRM dashboard shows status, the connected email,
  Connect/Reconnect (full-page redirect to `/google/oauth/start`) and Disconnect. When
  disconnected, a global banner appears in AppShell and the Google actions are disabled with a tooltip.
- Tests: mock the googleapis clients and cover URL parsing and the error mapping (404/403/quota → HttpError).

**Stage 2: templates as links**
- Rework the model, service and validation. Saving a link parses the id and calls
  `files.get` to confirm the agency account can read it (403 → "share this doc with
  <agency account>"). Store the title from Drive if the name is empty.
- Delete `defaultTemplates.ts`, `seed-templates.ts`, `template.sanitize.ts`, the preview route
  and the HTML of `merge.service.ts`. Keep `document.context.ts` / `document.variables.ts`,
  which build the `{{key}} → value` map for `replaceAllText`.
- Web `TemplatesTab`: table name / type / "Open in Google Docs ↗" / Edit link. Add/edit
  dialog with name, type, URL. One-time: upload the 5 `Documents/*.docx` to Drive, convert
  to Google Docs, paste the links (manual, by the owner).

**Stage 3: documents as Drive copies**
- `createDocument`: template → `copyFile` (or blank) → rename → `ensureFolder(client)` + move
  → `replacePlaceholders` (if a client is set) → `setAccess(access)` → save row → return `webViewLink`.
  Unknown placeholders are left as they are, so they stay visible in the doc.
- If no client is picked at creation, the copy lands in the root folder. Setting the client
  later moves it and offers "Fill variables" (`/refill`).
- Rename: PATCH title → `renameFile`. The Drive name and the DB title stay in sync.
- Web `DocumentsPage`: list rows = title, client, type, status, last modified, actions
  (Open ↗, Rename, Save as PDF, Share/Revise, Delete). `NewDocumentDialog` creates, then
  calls `window.open(webViewLink)`. The dialog has an **Access** section: admin users as checkboxes
  (pre-checked) + "Add email" (validated, deduped), each row with a role select (default Editor).
  The connected agency account is the owner and is never listed. "Manage access" on a row
  reopens the same picker → `PUT /documents/:id/access`. The client-page `DocumentsPanel` shows the same list
  filtered by client.
- Delete `features/documents/editor/`, `components/editor/TiptapEditor.tsx`, the
  `/documents/:id` and `/templates/:id` editor routes, the Tiptap deps and
  `tiptap-pagination-plus`, `handlebars` and `sanitize-html` (if nothing else uses them).

**Stage 4: PDF to client documents**
- "Save as PDF" dialog: category (prefilled from the doc type), filename (prefilled
  `<client-slug>_<category>_<YYYY-MM-DD>.pdf`, editable) and a "Visible to client" checkbox.
- `exportPdf` → `putObject('clients/<clientId>/documents/<uuid>.pdf')` → `FileMetadata`
  {category, sourceDocument, sourceRevisionId, associatedEntity=Client}. The doc row
  points to its latest PDF and shows "PDF out of date" when `headRevisionId` ≠ `pdfRevisionId`.
- `PATCH /files/:id` renames, changes the category and toggles visibility. The client Files tab
  groups by category, and the portal Downloads tab shows visible ones.

**Stage 5: share / sign rewire**
- `shareDocument`: require a client → export a snapshot PDF (Stage 4 path, `clientVisible=false`
  until signed) → `setLocked(true)` → status Sent. `sign.service` reads the snapshot from
  `pdfFile.bucketKey` instead of `ensureDocumentPdf`. The sealed PDF flow is unchanged.
- `revise`: `setLocked(false)`, status Draft, drop the pack linkage. Blocked once Signed.
- The portal document view serves the snapshot PDF (no Google link exposed).

**Stage 6: cleanup + tests**
- Update `documents.routes.test.ts` and `documents.auth.test.ts` with a mocked google module,
  the web tests (`DocumentsPage`, `DocumentsPanel`, `AppShell`) and the e2e `lifecycle.spec.ts`
  (stub Google).
- `.env.example`: Google vars (no tokens). `docs/scope-audit.md` + `crm-portal-plan.md` status line.
  Mark `document-editor-contract.md` superseded.

## Risks / notes

- `drive` scope is a restricted scope. This is fine for an internal app on the owner's own
  account: the "unverified app" screen is clicked through once. No Google verification needed.
- Export cap is 10 MB per file. Image-heavy proposals could hit it, so the app shows an
  error and links to File → Download in Google.
- Rate limits (Drive ~12k req/min) are a non-issue at agency volume.
- Placeholder syntax in the Google templates must be exactly `{{client.company}}` etc. The
  Templates tab shows the list of variables that can be copied (`GET /document-templates/variables`, kept).
