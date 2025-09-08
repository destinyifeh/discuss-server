import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  //app.setGlobalPrefix('api');
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'auth/google/callback', method: RequestMethod.GET }],
  });
  app.enableCors({
    //origin: [process.env.APP_URL],
    origin: ['https://discuss-mu-three.vercel.app', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
