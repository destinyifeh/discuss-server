import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model, Types } from 'mongoose';
import {
  AD_PAYMENT_URL,
  DASHBOARD_URL,
  PAYSTACK_BASE_URL,
  PAYSTACK_CALLBACK_URL,
  VIEW_AD_URL,
} from 'src/common/utils/constants/api-resources';
import {
  AD_ACTIVATION_EMAIL_SUBJECT,
  AD_APROVAL_EMAIL_SUBJECT,
  AD_REJECTION_EMAIL_SUBJECT,
} from 'src/common/utils/constants/settings';
import { capitalizeName } from 'src/common/utils/formatter';
import { AdStatus } from 'src/common/utils/types/ad.types';
import { MailService } from 'src/mail/mail.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { RedisService } from '../storage/redis.service';
import { User } from '../users/schemas/user.schema';
import { AdPlacementProps, CreateAdDto } from './dto/create-ad.dto';
import { Ad } from './schema/ad.schema';

@Injectable()
export class AdsService {
  private readonly paystackSecretKey: string | undefined;
  private rotationMap: Record<string, { index: number; ads: any[] }> = {};

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(Ad.name) private readonly adModel: Model<Ad>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly mediaUploadService: MediaUploadService,
    private readonly mailService: MailService,
  ) {
    this.paystackSecretKey = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    );
  }

  private async setAdRotation(
    placement: string,
    rotation: { index: number; ads: any[] },
    ttlSeconds = 600, // default 10 minutes
  ) {
    const client = this.redisService.getClient();
    if (!client) {
      // Redis unavailable → just skip caching
      return;
    }

    try {
      await client.set(`ads:${placement}`, JSON.stringify(rotation), {
        EX: ttlSeconds, // correct format in node-redis v4
      });
    } catch (err) {
      console.error(`❌ Failed to set cache for ads:${placement}`, err);
    }
  }

  private async getAdRotation(
    placement: string,
  ): Promise<{ index: number; ads: any[] } | null> {
    const client = this.redisService.getClient();
    if (!client) {
      // Redis unavailable → no cache
      return null;
    }

    try {
      const data = await client.get(`ads:${placement}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`❌ Failed to get cache for ads:${placement}`, err);
      return null;
    }
  }

  private async clearAdRotation(placement: string) {
    const client = this.redisService.getClient();
    if (!client) {
      // Redis unavailable → nothing to clear
      return;
    }

    try {
      await client.del(`ads:${placement}`);
    } catch (err) {
      console.error(`❌ Failed to clear cache for ads:${placement}`, err);
    }
  }

  /* Create: author is the current user */
  async createAd(
    author: string,
    dto: CreateAdDto,
    image?: { url: string; key: string } | null,
  ) {
    const ad = new this.adModel({
      ...dto,
      owner: new Types.ObjectId(author),
      imageUrl: image?.url ?? null,
      image_public_id: image?.key ?? null,
    });
    const savedAd = await ad.save();

    console.log('Saved ad:', savedAd);

    await this.notificationsService.createNotification({
      type: 'admin',
      message: 'New advertisement submitted',
      content: `A new ad  titled "${dto.title}" submitted`,
      senderName: 'System',
    });

    return {
      code: '200',
      message: 'success',
      data: savedAd,
    };
  }

  async getAds(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    // Base query
    const query: any = {};

    // Add keyword search if provided
    if (search) {
      query.$or = [
        { status: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const [ads, total] = await Promise.all([
      this.adModel
        .find(query)
        .populate('owner', 'avatar username')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.adModel.countDocuments(query),
    ]);

    return {
      code: '200',
      message: 'Ads retrieved successfully',
      data: {
        ads,
        pagination: {
          totalItems: total,
          page: page,
          pages: Math.ceil(total / limit),
          limit: limit,
        },
      },
    };
  }

  async findOne(id: string) {
    const ad = await this.adModel
      .findById(id)
      .populate('owner', 'username email avatar');
    if (!ad) throw new NotFoundException('Ad not found');
    return { code: '200', ad: ad };
  }

  async getCountAdByStatus(status: AdStatus) {
    const ad = await this.adModel.countDocuments({ status: status });
    return { code: '200', ad: ad };
  }

  async getUserAdByStatus(
    status: AdStatus,
    user: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    // Base query
    const query: any = {};
    query.owner = new Types.ObjectId(user);
    if (status !== 'all') {
      query.status = status;
    }
    // Add keyword search if provided
    if (search) {
      query.$or = [
        { status: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const [ads, total] = await Promise.all([
      this.adModel
        .find(query)
        .populate('owner', 'avatar username')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.adModel.countDocuments(query),
    ]);

    return {
      code: '200',
      message: 'Ads retrieved successfully',
      data: {
        ads,
        pagination: {
          totalItems: total,
          page: page,
          pages: Math.ceil(total / limit),
          limit: limit,
        },
      },
    };
  }

  async rejectAd(id: string, reason: string, adOwnerId: string) {
    const ad = await this.adModel.findByIdAndUpdate(
      id,
      {
        status: AdStatus.REJECTED,
        rejectionReason: reason,
        rejectedDate: new Date(),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!ad) throw new NotFoundException('Ad not found');

    // Notify user
    await this.notificationsService.createNotification({
      recipient: adOwnerId.toString(),
      type: 'ad_rejected',
      content: `Your ad "${ad.title}" has been rejected. Reason: ${reason}`,
      senderName: 'Admin',
    });

    // TODO: Add email notification logic here
    const theOwner = await this.userModel.findById(adOwnerId);
    if (theOwner) {
      const link = DASHBOARD_URL;
      await this.mailService.sendWith(
        'ses',
        theOwner.email,
        AD_REJECTION_EMAIL_SUBJECT,
        'ad-rejection',
        {
          name: capitalizeName(theOwner.username),
          email: theOwner.email,
          link: link,
          year: new Date().getFullYear(),
          reason: reason,
          adTitle: capitalizeName(ad.title),
        },
      );
    }

    return {
      code: '200',
      message: 'Ad rejected',
      ad,
    };
  }

  async approveAd(id: string, adOwnerId: string) {
    try {
      const ad = await this.adModel
        .findByIdAndUpdate(
          id,
          { status: AdStatus.APPROVED, approvedDate: new Date() },
          { new: true },
        )
        .populate('owner');

      if (!ad) throw new NotFoundException('Ad not found');

      // Notify user
      await this.notificationsService.createNotification({
        recipient: adOwnerId.toString(),
        type: 'ad_approved',
        content: `Your ad "${ad.title}" has been approved.`,
        senderName: 'Admin',
      });

      // email action here

      if (ad.owner) {
        const theOwner: any = ad.owner;
        const link = `${AD_PAYMENT_URL}/${ad._id}`;
        await this.mailService.sendWith(
          'ses',
          theOwner.email,
          AD_APROVAL_EMAIL_SUBJECT,
          'ad-approval',
          {
            advertiserName: theOwner.username,
            email: theOwner.email,
            link: link,
            year: new Date().getFullYear(),
            sectionName: ad.section,
            adType: ad.type,
            paymentAmount: ad.price,
            paymentUrl: link,
            adTitle: ad.title,
          },
        );
      }

      return { code: '200', message: 'Ad approved', ad };
    } catch (error) {
      console.error('Approve ad error:', error);
      throw error;
    }
  }

  async activateAd2(id: string, adOwnerId: string) {
    try {
      const ad = await this.adModel.findByIdAndUpdate(
        id,
        { status: AdStatus.ACTIVE, activatedDate: new Date() },
        { new: true },
      );

      if (!ad) throw new NotFoundException('Ad not found');

      // Notify user
      await this.notificationsService.createNotification({
        recipient: adOwnerId.toString(),
        type: 'ad_activated',
        content: `Your ad "${ad.title}" has been activated.`,
        senderName: 'Admin',
      });

      // email action here

      return { code: '200', message: 'Ad activated', ad };
    } catch (error) {
      console.error('Activated ad error:', error);
      throw error;
    }
  }

  async activateAd(id: string, adOwnerId: string) {
    try {
      // Fetch ad first to get duration
      const adData = await this.adModel.findById(id).populate('owner');
      if (!adData) throw new NotFoundException('Ad not found');

      const activatedDate = new Date();
      const durationDays = Number(adData.duration || 0); // convert to number
      const expirationDate = new Date(activatedDate);
      expirationDate.setDate(expirationDate.getDate() + durationDays); // add days
      console.log(expirationDate, 'expirtionDate');
      const ad = await this.adModel.findByIdAndUpdate(
        id,
        {
          status: AdStatus.ACTIVE,
          activatedDate: activatedDate,
          expirationDate: expirationDate,
        },
        { new: true },
      );
      await this.clearAdRotation(adData.section.toLowerCase());
      // Notify user
      await this.notificationsService.createNotification({
        recipient: adOwnerId.toString(),
        type: 'ad_activated',
        content: `Your ad "${adData.title}" has been activated.`,
        senderName: 'Admin',
      });

      // email action here
      if (adData.owner) {
        const theOwner: any = adData.owner;
        const link = VIEW_AD_URL;
        await this.mailService.sendWith(
          'ses',
          theOwner.email,
          AD_ACTIVATION_EMAIL_SUBJECT,
          'ad-activation',
          {
            name: capitalizeName(theOwner.username),
            email: theOwner.email,
            link: link,
            year: new Date().getFullYear(),
            sectionName: adData.section,
            adTitle: capitalizeName(adData.title),
          },
        );
      }

      return { code: '200', message: 'Ad activated', ad };
    } catch (error) {
      console.error('Activated ad error:', error);
      throw error;
    }
  }

  async pauseAd(id: string, reason: string, adOwnerId: string) {
    try {
      const ad = await this.adModel.findByIdAndUpdate(
        id,
        { status: AdStatus.PAUSED, pausedDate: new Date() },
        { new: true },
      );

      if (!ad) throw new NotFoundException('Ad not found');
      await this.clearAdRotation(ad.section.toLowerCase());
      // Notify user
      await this.notificationsService.createNotification({
        recipient: adOwnerId.toString(),
        type: 'ad_paused',
        content: `Your ad "${ad.title}" has been paused.  Reason: ${reason}`,
        senderName: 'Admin',
      });

      // email action here

      return { code: '200', message: 'Ad paused', ad };
    } catch (error) {
      console.error('pause ad error:', error);
      throw error;
    }
  }

  async resumeAd(id: string) {
    try {
      const ad = await this.adModel.findByIdAndUpdate(
        id,
        { status: AdStatus.ACTIVE, pausedDate: null },
        { new: true },
      );

      if (!ad) throw new NotFoundException('Ad not found');
      await this.clearAdRotation(ad.section.toLowerCase());

      return { code: '200', message: 'Ad resumed', ad };
    } catch (error) {
      console.error('pause ad error:', error);
      throw error;
    }
  }

  async deleteAd2(id: string) {
    const res = await this.adModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Ad not found');
    return { deleted: true };
  }

  async deleteAd(id: string) {
    const ad = await this.adModel.findById(id);
    if (!ad) throw new NotFoundException('Ad not found');

    // Delete from DB
    await this.adModel.deleteOne({ _id: id });

    if (ad.image_public_id) {
      await this.mediaUploadService.deleteFile(ad.image_public_id);
    }
    // Clear Redis cache for this section
    await this.clearAdRotation(ad.section.toLowerCase());
    return { deleted: true };
  }

  async updateAdImpressions(id: string) {
    const ad = await this.adModel.findByIdAndUpdate(
      id,
      { $inc: { impressions: 1 } }, // increment by 1
      { new: true },
    );

    if (!ad) throw new NotFoundException('Ad not found');
    return { code: '200', ad };
  }

  async updateAdClicks(id: string) {
    const ad = await this.adModel.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } }, // increment by 1
      { new: true },
    );

    if (!ad) throw new NotFoundException('Ad not found');
    return { code: '200', ad };
  }

  async getBannerAds2(section: string) {
    console.log(section, 'sectionnnnn');
    const ads = await this.adModel.find({
      section: section.toLowerCase(),
      status: AdStatus.ACTIVE,
      type: 'banner',
    });
    console.log(ads, 'ad');

    if (!ads || ads.length === 0) {
      throw new NotFoundException('No active ads found for this section');
    }

    // Shuffle each time it's called
    const shuffledAds = ads.sort(() => Math.random() - 0.5);

    return { code: '200', ads: shuffledAds };
  }
  async getBannerAds3(section: string) {
    const sectionKey = section.toLowerCase();

    // Load ads into rotation if not loaded or empty
    if (
      !this.rotationMap[sectionKey] ||
      this.rotationMap[sectionKey].ads.length === 0
    ) {
      const ads = await this.adModel.find({
        section: sectionKey,
        status: AdStatus.ACTIVE,
        type: 'banner',
      });

      if (!ads || ads.length === 0) {
        throw new NotFoundException('No active ads found for this section');
      }

      // Shuffle once
      const shuffledAds = ads.sort(() => Math.random() - 0.5);
      this.rotationMap[sectionKey] = { index: 0, ads: shuffledAds };
    }

    const rotation = this.rotationMap[sectionKey];

    // Get next ad in sequence
    const ad = rotation.ads[rotation.index];
    rotation.index = (rotation.index + 1) % rotation.ads.length;

    return { code: '200', ads: [ad] }; // Return one ad at a time
  }

  async getBannerAds(placement: AdPlacementProps, section?: string) {
    const placementKey = placement;
    const filter: any = { status: AdStatus.ACTIVE, type: 'banner' };
    // Try to get rotation from Redis
    let rotation = await this.getAdRotation(placementKey);

    // If not found, load fresh ads from DB and store in Redis
    if (!rotation || rotation.ads.length === 0) {
      if (placement === 'homepage_feed') {
        filter.plan = 'enterprise';
      }
      if (placement === 'details_feed') {
        filter.plan = { $in: ['enterprise', 'professional'] };
      }
      if (placement === 'section_feed') {
        filter.section = section;
      }
      const ads = await this.adModel.find(filter);

      if (!ads || ads.length === 0) {
        throw new NotFoundException('No active ads found for this section');
      }

      // Shuffle once before storing
      const shuffledAds = ads.sort(() => Math.random() - 0.5);
      rotation = { index: 0, ads: shuffledAds };

      await this.setAdRotation(placementKey, rotation);
    }

    // Get the next ad in sequence
    const ad = rotation.ads[rotation.index];
    rotation.index = (rotation.index + 1) % rotation.ads.length;

    // Save updated rotation back to Redis
    await this.setAdRotation(placementKey, rotation);

    return { code: '200', ads: [ad] }; // one ad per call
  }

  //payment

  async initializeTransaction(
    email: string,
    amount: number,
    otherDetails: any,
  ) {
    try {
      const rawAmount = Number(amount.toString().replace(/₦|,/g, ''));
      const amountInKobo = rawAmount * 100;
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/initialize`,
        {
          email,
          amount: amountInKobo, // kobo
          callback_url: PAYSTACK_CALLBACK_URL,
          metadata: { ...otherDetails },
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data; // contains authorization_url etc
    } catch (error) {
      console.log(error, 'Sending response...');
      throw new HttpException(
        error.response?.data || 'Paystack initialization failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      const data = response.data.data;

      if (data.status === 'success') {
        const adId = data.metadata.adId; // get the adId you sent earlier
        const ownerId = data.metadata.ownerId;
        // TODO: Update your Ad in DB to mark it active
        const ad = await this.activateAd(adId, ownerId);

        return {
          code: '200',
          message: 'Payment verified and ad activated',
          ad,
        };
      } else {
        return { message: 'Payment failed', data: data.status };
      }
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Paystack verification failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
