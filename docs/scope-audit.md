# Kraven Scope Audit

Last updated: Stage 1 of the [CRM portal plan](plans/crm-portal-plan.md).

## Current state

Kraven is a two-admin agency panel (npm workspaces + turbo):

- `apps/api` - Express + Mongoose (ESM). Session-cookie auth for two seeded admins; no public registration, no roles.
- `apps/web` - React/Vite admin UI.
- `packages/config`, `packages/types`, `packages/validation` - shared constants, DTO types, zod schemas.

Modules: auth, leads, clients, projects, finance (invoices, payments, expenses), dashboard, search, files, activity log.

### Storage

- Data: MongoDB via Mongoose.
- Files: **MinIO (S3 API)** via `@aws-sdk/client-s3` (`apps/api/src/modules/files/storage.service.ts`). GridFS is no longer used.
  - Objects live under `files/<metadataId>` in `S3_BUCKET`; the bucket is created on API startup if missing.
  - Metadata stays in Mongo (`FileMetadata`: `bucketKey`, `filename`, `contentType`, `length`, `clientVisible` default `false`, entity association, uploader).
  - `bucketKey` has a unique index that is partial (`bucketKey: { $exists: true }`), so legacy GridFS-era docs without it do not break the index build.
  - Existing databases may still carry a stale `gridFsId_1` index from the GridFS era. It is harmless but can be dropped: `db.filemetadatas.dropIndex('gridFsId_1')`.
  - `POST /files` (multipart) and `GET /files/:id` (streamed download) keep their original contract.
  - `GET /files/:id/url` returns a 60-second presigned download URL (authenticated).
- Local infra: `docker-compose.yml` runs MinIO (API `:9000`, console `:9001`) and Gotenberg (`:3000`, pinned `8.40.0`).

### Security

- CORS restricted to the `CORS_ORIGINS` allowlist (credentials allowed only for those origins).
- CSRF: the production session cookie is `SameSite=None`, so state-changing requests (anything but GET/HEAD/OPTIONS) are rejected with 403 when their `Origin` (or `Referer` fallback) is not allowlisted. Requests with neither header (non-browser clients) pass.
- `helmet` security headers (Cross-Origin-Resource-Policy relaxed to `cross-origin` because the web app is served from a different origin).
- Login rate limit: 10 failed attempts per IP per 15 minutes (`express-rate-limit`).

### Dashboard

- `GET /dashboard/*` is read-only: MongoDB aggregations and lean, limited finds; no whole-collection loads, no writes.
- Invoice `remainingAmount`/`paymentStatus` are persisted on invoice and payment writes. "Overdue" is time-dependent and derived at read time (`dueDate` before today with a remaining balance).
- Revenue chart is grouped by month (`YYYY-MM`, UTC), last 12 months with activity.

### Documents (Stage 2)

- `DocumentTemplate` (sanitized Tiptap HTML with escaped `{{var}}` placeholders, `version` bumps on edit) and `Document` (immutable rendered-HTML snapshot, `templateVersion`, status Draft/Sent/Viewed/Signed, `pdfKey`).
- Variables: `client.*`, `project.*`, `agency.*` (from `AGENCY_*` env), `today`; `GET /document-templates/variables`.
- PDFs rendered by Gotenberg from the snapshot, stored at `documents/<id>.pdf`, reused while the snapshot hash is unchanged.
- `npm run seed:templates -w @kraven/api` inserts one generic "Project Proposal" template (insert-only).

## Planned (see plan for detail)

| Stage | Scope |
| --- | --- |
| 1 | Foundations + storage (this stage): MinIO, CORS/CSRF/helmet/rate limit, read-only dashboard |
| 2 | Document templates (Tiptap, Handlebars-style variables) rendered to PDF via Gotenberg, stored in MinIO (done) |
| 3 | Client portal: `/c/<slug>` + admin-set access code (bcrypt), signed cookie, lockout; project updates, documents, payments (UPI deep-link/QR), downloads of `clientVisible` files |
| 4 | Packs (grouped sends) + in-house e-sign (audit capture, `pdf-lib` seal, SHA-256) |
| 5 | Email via Resend (webhooks, reminders), "Waiting on client" widget, invoice line items/tax/PDF |

## Still out of scope

- Public registration, roles/permissions beyond the two admins.
- Payment gateways (payments are manual status changes).
- Redis, GraphQL, microservices, HR/payroll, AI features.
- UI revamp (Stage 6, separate plan).
