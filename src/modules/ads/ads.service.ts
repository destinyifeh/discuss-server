import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { UploadApiResponse } from 'cloudinary';
import { Model, Types } from 'mongoose';
import {
  PAYSTACK_BASE_URL,
  PAYSTACK_CALLBACK_URL,
} from 'src/common/utils/constants/api-resources';
import { AdStatus } from 'src/common/utils/types/ad.types';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { Ad } from './schema/ad.schema';

@Injectable()
export class AdsService {
  private readonly paystackSecretKey: string | undefined;
  constructor(
    @InjectModel(Ad.name) private readonly adModel: Model<Ad>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.paystackSecretKey = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    );
  }

  /* Create: author is the current user */
  async createAd(
    author: string,
    dto: CreateAdDto,
    image?: UploadApiResponse | null,
  ) {
    const ad = new this.adModel({
      ...dto,
      owner: new Types.ObjectId(author),
      imageUrl: image?.secure_url ?? null,
      image_public_id: image?.public_id ?? null,
    });
    const savedAd = await ad.save();

    console.log('Saved ad:', savedAd);

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

    return {
      code: '200',
      message: 'Ad rejected',
      ad,
    };
  }

  async approveAd(id: string, adOwnerId: string) {
    try {
      const ad = await this.adModel.findByIdAndUpdate(
        id,
        { status: AdStatus.APPROVED, approvedDate: new Date() },
        { new: true },
      );

      if (!ad) throw new NotFoundException('Ad not found');

      // Notify user
      await this.notificationsService.createNotification({
        recipient: adOwnerId.toString(),
        type: 'ad_approved',
        content: `Your ad "${ad.title}" has been approved.`,
        senderName: 'Admin',
      });

      // email action here

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
      const adData = await this.adModel.findById(id);
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

      // Notify user
      await this.notificationsService.createNotification({
        recipient: adOwnerId.toString(),
        type: 'ad_activated',
        content: `Your ad "${adData.title}" has been activated.`,
        senderName: 'Admin',
      });

      // email action here

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

  async resumeAd(id: string, reason: string, adOwnerId: string) {
    try {
      const ad = await this.adModel.findByIdAndUpdate(
        id,
        { status: AdStatus.ACTIVE, pausedDate: null },
        { new: true },
      );

      if (!ad) throw new NotFoundException('Ad not found');

      return { code: '200', message: 'Ad resumed', ad };
    } catch (error) {
      console.error('pause ad error:', error);
      throw error;
    }
  }

  async deleteAd(id: string) {
    const res = await this.adModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Ad not found');
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
