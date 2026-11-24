import 'dotenv/config';

function parseList(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/kraven',
  requireDatabase: process.env.REQUIRE_DATABASE === 'true',
  sessionSecret: process.env.SESSION_SECRET ?? 'kraven-development-session-secret',
  corsOrigins: parseList(process.env.CORS_ORIGINS, ['http://localhost:5173', 'http://127.0.0.1:5173']),
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.S3_BUCKET ?? 'kraven',
    region: process.env.S3_REGION ?? 'us-east-1'
  },
  gotenbergUrl: process.env.GOTENBERG_URL ?? 'http://127.0.0.1:3000',
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
