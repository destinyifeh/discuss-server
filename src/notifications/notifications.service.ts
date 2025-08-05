import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './schema/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async createNotification(data: CreateNotificationDto) {
    const notification = new this.notificationModel({
      ...data,
      recipient: new Types.ObjectId(data.recipient),
    });
    await notification.save();
    return {
      message: 'Notification created',
      code: HttpStatus.OK,
    };
  }

  async markAsRead(id: string, currentUserId: string) {
    const updatedNotification = await this.notificationModel.findOneAndUpdate(
      { _id: id, recipient: new Types.ObjectId(currentUserId) }, // ensure ownership
      { read: true },
      { new: true },
    );

    if (!updatedNotification) {
      throw new NotFoundException('Notification not found or not authorized');
    }

    return { updatedNotification, code: '200' };
  }

  async markAllAsRead(currentUserId: string) {
    const result = await this.notificationModel.updateMany(
      { recipient: new Types.ObjectId(currentUserId), read: false },
      { $set: { read: true } },
    );
    console.log('get hereeee', result);
    return {
      code: '200',
      markAllAsRead: true,
      message: 'Notifications updated',
      updatedCount: result.modifiedCount, // number of notifications marked as read
    };
  }

  async getNotifications(
    currentUserId: string,
    limit: number,
    page: number,
    requestedNote: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      const query: any = {};
      query.recipient = new Types.ObjectId(currentUserId);

      if (requestedNote === 'mentions') {
        query.type = 'mentioned';
      } else {
        // Exclude 'mentioned' type
        query.type = { $ne: 'mentioned' };
      }

      const [notifications, total] = await Promise.all([
        this.notificationModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.notificationModel.countDocuments(query),
      ]);
      return {
        code: '200',
        message: 'Notifications retrieved successfully',
        data: {
          notifications,
          pagination: {
            totalItems: total,
            page: page,
            pages: Math.ceil(total / limit),
            limit: limit,
          },
        },
      };
    } catch (error) {
      console.error(error);
      console.log(error, 'note err');
      throw new InternalServerErrorException('Failed to get notifications');
    }
  }

  async getUnreadCount(currentUserId: string) {
    // Update lastActive for the current user
    await this.userModel.findByIdAndUpdate(currentUserId, {
      lastActive: new Date(),
    });
    const unreadCount = await this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(currentUserId),
      read: false,
    });

    return {
      code: '200',
      unreadData: unreadCount > 0 ? unreadCount : null,
    };
  }
}
