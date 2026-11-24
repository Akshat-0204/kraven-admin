import 'dotenv/config';

function parseList(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const s3Endpoint = process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/kraven',
  requireDatabase: process.env.REQUIRE_DATABASE === 'true',
  sessionSecret: process.env.SESSION_SECRET ?? 'kraven-development-session-secret',
  /** Signs the client portal cookie. Set a long random value in production. */
  portalCookieSecret: process.env.PORTAL_COOKIE_SECRET ?? 'kraven-development-portal-secret',
  /** Web origin that serves client portal pages (`/c/<slug>`); used to build portal links. */
  portalBaseUrl: process.env.PORTAL_BASE_URL ?? 'http://localhost:5173',
  corsOrigins: parseList(process.env.CORS_ORIGINS, ['http://localhost:5173', 'http://127.0.0.1:5173']),
  s3: {
    endpoint: s3Endpoint,
    /** Endpoint browsers use for presigned URLs; defaults to `S3_ENDPOINT`. */
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || s3Endpoint,
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.S3_BUCKET ?? 'kraven',
    region: process.env.S3_REGION ?? 'us-east-1'
  },
  gotenbergUrl: process.env.GOTENBERG_URL ?? 'http://127.0.0.1:3000',
  gotenbergTimeoutMs: Number(process.env.GOTENBERG_TIMEOUT_MS ?? 30_000),
  /** Agency details exposed to document templates as {{agency.*}}. */
  agency: {
    name: process.env.AGENCY_NAME ?? 'Kraven',
    email: process.env.AGENCY_EMAIL ?? '',
    phone: process.env.AGENCY_PHONE ?? '',
    address: process.env.AGENCY_ADDRESS ?? '',
    website: process.env.AGENCY_WEBSITE ?? ''
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
