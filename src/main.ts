import './tracing.js';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // transform: apply DTO defaults and turn query strings into numbers; whitelist: drop unknown params
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
  console.log('🚀 Lab API running on http://localhost:3000');
  console.log('📊 Jaeger Tracing UI running on http://localhost:16686');
}
await bootstrap();
