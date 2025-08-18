import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from 'src/mail/mail.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { MediaUploadModule } from '../media-upload/media-upload.module';
import { RedisModule } from '../storage/redis.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdsCleanupService } from './ads-cleanup.cron';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { Ad, AdSchema } from './schema/ad.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ad.name, schema: AdSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MediaUploadModule,
    MailModule,
    NotificationsModule,
    RedisModule,
    ConfigModule,
  ],
  controllers: [AdsController],
  providers: [AdsService, AdsCleanupService],
  exports: [AdsService],
})
export class AdsModule {}
