import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_DEV_URL as string),
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
    // MongooseModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     uri:
    //       configService.get<string>('NODE_ENV') === 'production'
    //         ? configService.get<string>('MONGO_PROD_URL')
    //         : configService.get<string>('MONGO_DEV_URL'),
    //   }),
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
