import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // nginx reverse-proxy orqasida req.ip X-Forwarded-For dan olinadi —
  // aks holda rate limit barcha foydalanuvchilarga umumiy bo'lib qolardi.
  app.set('trust proxy', 1);
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const corsOrigins = process.env.CORS_ORIGINS;
  app.enableCors({
    // CORS_ORIGINS bo'sh yoki "*" bo'lsa — barcha domenlarga ruxsat (origin aks ettiriladi)
    origin: !corsOrigins || corsOrigins === '*' ? true : corsOrigins.split(','),
    credentials: true,
  });
  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
