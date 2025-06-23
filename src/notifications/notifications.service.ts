import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './schema/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  async createNotification(data: CreateNotificationDto) {
    const notification = new this.notificationModel({
      ...data,
      recipientId: String,
      recipient: String,
      // postId: data.postId ? new Types.ObjectId(data.postId) : undefined,
    });
    await notification.save();
    return {
      message: 'Notification created',
      code: HttpStatus.OK,
    };
  }

  async markAsRead(id: string) {
    return this.notificationModel.findByIdAndUpdate(
      id,
      { read: true },
      { new: true },
    );
  }

  async getNotifications(limit = 20) {
    return this.notificationModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getUnreadCount() {
    return this.notificationModel.countDocuments({ read: false });
  }
}
