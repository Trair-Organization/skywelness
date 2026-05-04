import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { extractTenantSubdomain } from './common/tenant/subdomain.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? ['http://localhost:5173'];
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.use((req: Request, _res: Response, next: () => void) => {
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostRaw =
      typeof forwardedHost === 'string'
        ? forwardedHost
        : Array.isArray(forwardedHost)
          ? forwardedHost[0]
          : req.headers.host;
    req.requestHost = hostRaw ?? null;
    req.requestSubdomain = extractTenantSubdomain(hostRaw);
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
