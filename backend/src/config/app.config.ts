import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface PaginationConfig {
  defaultPageSize: number;
  maxPageSize: number;
}

export interface AppConfig {
  port: number;
  apiUrl: string;
  corsOrigin: string[];
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: string;
  jwt: JwtConfig;
  pagination: PaginationConfig;
}

export default registerAs('app', (): AppConfig => {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`API_PORT must be a valid port number, got: "${process.env.API_PORT}"`);
  }

  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];

  return {
    port,
    apiUrl: process.env.API_URL ?? `http://localhost:${port}`,
    corsOrigin: corsOrigins,
    nodeEnv,
    logLevel: process.env.LOG_LEVEL ?? 'log',
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRY ?? '24h',
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY ?? '7d',
    },
    pagination: {
      defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE ?? '20', 10),
      maxPageSize: parseInt(process.env.MAX_PAGE_SIZE ?? '100', 10),
    },
  };
});
