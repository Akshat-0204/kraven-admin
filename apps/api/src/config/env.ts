import 'dotenv/config';

function parseList(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const s3Endpoint = process.env.S3_ENDPOINT ?? '';

const DEV_SESSION_SECRET = 'kraven-development-session-secret';
const DEV_PORTAL_SECRET = 'kraven-development-portal-secret';

/** Production must set real secrets; refuse to boot on missing or development defaults. */
function requireProductionSecret(name: string, value: string | undefined, devDefault: string) {
  if (process.env.NODE_ENV !== 'production') return value ?? devDefault;
  if (!value || value === devDefault) {
    throw new Error(`${name} must be set to a strong, non-default value in production`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/kraven',
  requireDatabase: process.env.REQUIRE_DATABASE === 'true',
  sessionSecret: requireProductionSecret('SESSION_SECRET', process.env.SESSION_SECRET, DEV_SESSION_SECRET),
  /** Signs the client portal cookie. Set a long random value in production. */
  portalCookieSecret: requireProductionSecret('PORTAL_COOKIE_SECRET', process.env.PORTAL_COOKIE_SECRET, DEV_PORTAL_SECRET),
  /** Web origin that serves client portal pages (`/c/<slug>`); used to build portal links. */
  portalBaseUrl: process.env.PORTAL_BASE_URL ?? 'http://localhost:5173',
  /** Resend email. With no API key the email service logs and sends nothing (dev/tests). */
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Kraven <noreply@example.com>',
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? '',
  remindersEnabled: process.env.REMINDERS_ENABLED === 'true',
  /** Cron expression for the daily reminder job. */
  remindersCron: process.env.REMINDERS_CRON ?? '0 9 * * *',
  /** Unsigned/unpaid pack items older than this many days get a reminder. */
  reminderAfterDays: Number(process.env.REMINDER_AFTER_DAYS ?? 3),
  corsOrigins: parseList(process.env.CORS_ORIGINS, ['http://localhost:5173', 'http://127.0.0.1:5173']),
  s3: {
    endpoint: s3Endpoint,
    /** Endpoint browsers use for presigned URLs; defaults to `S3_ENDPOINT`. */
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || s3Endpoint,
    accessKey: process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.S3_SECRET_KEY ?? '',
    bucket: process.env.S3_BUCKET ?? 'kraven',
    region: process.env.S3_REGION ?? 'us-east-1'
  },
  /** Headless Chromium (puppeteer) render timeout for HTML -> PDF. */
  pdfTimeoutMs: Number(process.env.PDF_TIMEOUT_MS ?? 30_000),
  /** Agency details exposed to document templates as {{agency.*}}. */
  agency: {
    name: process.env.AGENCY_NAME ?? 'Kraven',
    email: process.env.AGENCY_EMAIL ?? '',
    phone: process.env.AGENCY_PHONE ?? '',
    address: process.env.AGENCY_ADDRESS ?? '',
    website: process.env.AGENCY_WEBSITE ?? ''
  },
  /** Google Drive/Docs OAuth (agency account). Tokens live in Mongo, never in env. */
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/google/oauth/callback',
    /** 32-byte key (64 hex chars or base64) for AES-256-GCM encryption of the refresh token. */
    tokenKey: process.env.GOOGLE_TOKEN_KEY ?? '',
    rootFolderName: process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME ?? 'Kraven Documents'
  },
  adminUsers: [
    {
      email: process.env.ADMIN_EMAIL_1,
      password: process.env.ADMIN_PASSWORD_1
    },
    {
      email: process.env.ADMIN_EMAIL_2,
      password: process.env.ADMIN_PASSWORD_2
    }
  ].filter((user): user is { email: string; password: string } => Boolean(user.email && user.password))
};
