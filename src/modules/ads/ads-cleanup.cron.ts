import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { capitalizeName } from 'src/common/utils/formatter'; // if you already have this util
import { AdStatus } from 'src/common/utils/types/ad.types';
import { MailService } from 'src/mail/mail.service';
import { Ad } from 'src/modules/ads/schema/ad.schema';
import { MediaUploadService } from 'src/modules/media-upload/media-upload.service';

@Injectable()
export class AdsCleanupService {
  private readonly logger = new Logger(AdsCleanupService.name);

  constructor(
    @InjectModel(Ad.name) private readonly adModel: Model<Ad>,
    private readonly mediaUploadService: MediaUploadService,
    private readonly mailService: MailService, // 👈 inject mail service
  ) {}

  // Runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAdExpirationAndCleanup() {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - 3); // 3 days ago

    this.logger.log('🕛 Checking for expired ads...');

    // 1️⃣ Find ads that should expire
    const adsToExpire = await this.adModel
      .find({
        expirationDate: { $lte: now },
        status: { $ne: AdStatus.EXPIRED },
      })
      .populate('owner'); // 👈 make sure "owner" is populated with email/name

    if (adsToExpire.length > 0) {
      // Update their status
      await this.adModel.updateMany(
        { _id: { $in: adsToExpire.map((ad) => ad._id) } },
        { $set: { status: AdStatus.EXPIRED } },
      );

      this.logger.log(`⚠️ Marked ${adsToExpire.length} ads as expired`);

      // Send emails
      for (const ad of adsToExpire) {
        const owner: any = ad.owner; // adjust type
        if (owner?.email) {
          await this.mailService.sendWith(
            'ses',
            owner.email,
            `Your ad "${ad.title}" has expired`,
            'ad-expired',
            {
              name: capitalizeName(owner.username),
              email: owner.email,
              adTitle: capitalizeName(ad.title),
              year: new Date().getFullYear(),
              daysToDelete: 3,
              expirationDate: ad.expirationDate?.toDateString(),
            },
          );
          this.logger.log(`📧 Sent expiration email to ${owner.email}`);
        }
      }
    }

    // Find ads that have been expired for more than 3 days
    const adsToDelete = await this.adModel.find({
      expirationDate: { $lt: cutoffDate },
      status: AdStatus.EXPIRED,
    });

    if (adsToDelete.length > 0) {
      const publicIds = adsToDelete
        .map((ad) => ad.image_public_id)
        .filter((id) => !!id);

      const deletedResult = await this.adModel.deleteMany({
        _id: { $in: adsToDelete.map((ad) => ad._id) },
      });

      if (publicIds.length > 0) {
        await this.mediaUploadService.deleteFiles(publicIds);
        this.logger.log(`🖼️ Deleted ${publicIds.length} ad images`);
      }

      this.logger.log(
        `🗑️ Deleted ${deletedResult.deletedCount} ads permanently`,
      );
    }
  }
}
