import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdsModule } from './modules/ads/ads.module';
import { FeedsModule } from './modules/feeds/feeds.module';
import { MediaUploadModule } from './modules/media-upload/media-upload.module';
import { PostsModule } from './modules/posts/posts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RedisModule } from './modules/storage/redis.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URL as string),
    AuthModule,
    ReportsModule,
    NotificationsModule,
    AdsModule,
    AdminModule,
    PostsModule,
    FeedsModule,
    MailModule,
    MediaUploadModule,
    RedisModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // time-to-live in seconds (1 minute)
        limit: 100, // number of requests allowed per ttl
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
