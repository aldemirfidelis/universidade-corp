/** Acesso tipado e centralizado às variáveis de ambiente. */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? process.env.API_PORT ?? '3333', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.API_CORS_ORIGIN ?? 'http://localhost:3000',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },

  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? '512', 10),
  videoCompletionThreshold: parseInt(process.env.VIDEO_COMPLETION_THRESHOLD ?? '90', 10),

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Universidade Corporativa <no-reply@localhost>',
  },

  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
};
