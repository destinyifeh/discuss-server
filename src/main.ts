import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
async function bootstrap() {
  //const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  //app.setGlobalPrefix('api');
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'auth/google/callback', method: RequestMethod.GET }],
  });
  app.enableCors({
    origin: [process.env.APP_URL as string],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    exposedHeaders: ['set-cookie'],
  });

  app.set('trust proxy', true);
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
