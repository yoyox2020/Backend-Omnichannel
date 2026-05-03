import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
}

export default registerAs('database', (): DatabaseConfig => {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`DB_PORT must be a valid port number, got: "${process.env.DB_PORT}"`);
  }

  return {
    host: process.env.DB_HOST!,
    port,
    username: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    // Respect explicit DB_SYNCHRONIZE env var; fall back to false for safety
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true' || process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production',
  };
});
