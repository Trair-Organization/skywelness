import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { mkdirSync } from 'fs';
import * as express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { extractTenantSubdomain } from './common/tenant/subdomain.util';
import { resolveUploadDir } from './common/uploads/upload.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  // Production'da Nginx/reverse-proxy arkasındayız. Gerçek client IP'yi almak için trust proxy.
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance() as unknown as {
    set?: (key: string, value: unknown) => void;
  };
  if (typeof instance.set === 'function') {
    instance.set('trust proxy', 1);
  }
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? ['http://localhost:5173'];
  app.enableCors({ origin: corsOrigins, credentials: true });
  // Güvenlik header'ları. crossOriginResourcePolicy gevşetilmiş çünkü /uploads
  // statik dosyaları farklı origin'den (web-admin, mobile) tüketilebiliyor.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // API-only; CSP'yi web-admin tarafında uygula
    }),
  );
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
  const uploadDir = resolveUploadDir();
  mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));

  // Swagger — sadece development/staging'de aktif. Production'da devre dışı bırakılabilir.
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Wellness Club API')
      .setDescription('Multi-tenant fitness/wellness platform REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-Subdomain', in: 'header' }, 'tenant')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
