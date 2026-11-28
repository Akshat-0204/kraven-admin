# CRM Portal Plan

Turn kraven-admin (pnpm workspaces + turbo; apps/api Express+Mongoose, apps/web React/Vite/Tailwind/react-query; packages config/types/validation) into an agency client CRM. Replaces sending ~5 PDFs per client by hand: edit docs online, send one link with documents + payment items + e-sign, plus per-client portal with progress updates and downloads. UI will be fully revamped later -> build functionality/API first, keep UI minimal and swappable.

Status (2026-11-27): documents now live in Google Docs/Drive (see docs/plans/google-docs-plan.md, stages 0-6 done); the Tiptap editor and HTML merge pipeline are removed. Share = snapshot PDF + lock.

## Global Constraints (locked decisions)
- DB stays **MongoDB** (Mongoose). Old data unimportant.
- Files: **Hosted S3** replaces GridFS (MinIO/Docker removed 2026-11-27). Use `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. File metadata stays in Mongo (`FileMetadata`). Downloads via short-TTL (~60s) presigned URLs only after auth/cookie check.
- Docs: **HTML templates -> PDF via puppeteer** (in-process headless Chromium; Docker/Gotenberg removed 2026-11-27). Editing in **Tiptap**. Variables via Handlebars-style `{{client.company}}`, `{{project.value}}`, escape-safe.
- E-sign: **in-house**. Typed/drawn signature, capture timestamp + IP + UA, SHA-256 of final PDF, `pdf-lib` appends audit page, sealed PDF to MinIO.
- Email: **Resend**. Track sent/opened via webhooks, reminders.
- Payments: **no gateway**. Payment items manual status `Pending -> Sent -> Paid`, admin sets by hand. Pay UI = UPI deep-link + QR page (`upi://pay?pa=&pn=&cu=INR&am=&tn=`). Payee profile is a setting.
- Client portal access: **no accounts**. URL `/c/<slug>`, slug simple and admin-set. Access code is the secret: admin sets/regenerates, stored bcrypt-hashed. Verify -> httpOnly signed cookie scoped to that client (30 days). Lockout: 5 wrong tries/slug -> 15 min, plus per-IP rate limit. Admin can revoke/rotate/expire.
- Portal public API under `/public/portal/*` (no `authenticate`), public routes in web app.
- Client sees only: their projects+progress, Updates (clientVisible), Documents, Payments, Downloads (files flagged `clientVisible`). Never internal notes/files.
- Tests: vitest + supertest. Each stage ends working + tested.
- Frontend UI minimal; functionality first.

## Task 1: Stage 1 - Foundations + storage
- Add `docker-compose.yml` at repo root with MinIO (+ console) and Gotenberg containers; env config (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `GOTENBERG_URL`, `CORS_ORIGINS`) wired through existing config pattern, with `.env.example`.
- Replace `gridfs.service.ts` with `storage.service.ts` (put/stream/presign/delete) on S3 client; keep `/files` API contract so web keeps working. Add `clientVisible` (default false) + `bucketKey` to `FileMetadata`. Bucket auto-created on startup if missing.
- Security: `cors({origin:true, credentials:true})` in `app.ts` -> restrict to env allowlist `CORS_ORIGINS`. Add `helmet`. Add login rate limit (e.g. express-rate-limit, 10/15min/IP). Note CSRF consideration given prod cookie sameSite=none (at minimum Origin check on state-changing requests against allowlist).
- `dashboard.service.ts`: GET /dashboard must not write. Remove `syncInvoicePaymentStatus` calls from GET; move status sync to payment/invoice write paths. Replace whole-collection `find()` with aggregation. Revenue chart grouped by month.
- Rewrite `docs/scope-audit.md` to reflect current state + this plan.
- Tests: storage service (S3 mocked), files routes, CORS allowlist, rate limit, dashboard GET does not write.

## Task 2: Stage 2 - Document templates + PDF
Models: `DocumentTemplate` (name, type, html, variables schema, version), `Document` (client/project ref, template ref, rendered html snapshot, status Draft/Sent/Viewed/Signed, pdfKey). Merge service (Handlebars, escape-safe). Gotenberg client -> PDF -> MinIO. Tiptap editor page (minimal UI). Preview/download endpoints. The user's 5 real PDFs are NOT yet supplied: seed one generic placeholder template only; real templates recreated later.

## Task 3: Stage 3 - Client portal (access + content)
`PortalAccess` on Client (slug unique, codeHash, enabled, expiresAt, lastViewedAt, failedAttempts/lockedUntil). Admin UI fields to set slug/code, regenerate, revoke. `ProjectUpdate` model (project, title, body, clientVisible, attachments, postedAt). Public API: verify code -> cookie; GET overview/updates/documents/payments/downloads scoped by cookie client. Portal web pages (minimal), port PayPage (from `git show e7bc7c4:ghost/src/pages/PayPage.tsx` in `/Users/sanchitjain/Documents/Code-stuff/Kraven/kravenDevhouse`, read-only, never modify that repo) with prefilled amount + invoice number. Payee profile as setting. View-tracking events.

## Task 4: Stage 4 - Packs + e-sign
`Pack` (client, project, items[]: document|payment|file, expiresAt). Items live inside the client portal (one URL per client) - pack = grouped send. Signing flow: draw/type signature, consent checkbox, audit capture, pdf-lib seal, SHA-256, store sealed PDF, status Signed. Manual payment item status transitions with Activity log.

## Task 5: Stage 5 - Email + reminders + dashboard
Resend service: send pack/portal-access email, templates, email log model, webhooks (delivered/opened). Reminder job (unsigned/overdue) via node-cron. Dashboard widget "Waiting on client". Invoice improvements (line items, tax, PDF via Gotenberg).

(Stage 6 UI revamp is out of scope for this plan.)
