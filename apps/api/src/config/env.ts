import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/kraven',
  requireDatabase: process.env.REQUIRE_DATABASE === 'true',
  sessionSecret: process.env.SESSION_SECRET ?? 'kraven-development-session-secret',
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
