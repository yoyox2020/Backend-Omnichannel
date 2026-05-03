import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // All routes are prefixed with /api/v1
  app.setGlobalPrefix('api/v1');

  // Validate and transform every incoming request body against DTO classes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // strip properties not in the DTO
      forbidNonWhitelisted: true,  // throw 400 if unknown properties are sent
      transform: true,             // auto-convert plain objects to DTO class instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS — CORS_ORIGIN supports comma-separated origins for multi-env setups
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  await app.listen(port);

  const apiUrl = process.env.API_URL ?? `http://localhost:${port}`;
  logger.log(`Application is running on ${apiUrl}/api/v1`);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
