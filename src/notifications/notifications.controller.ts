import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notification')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Post()
  async createNotification(@Body() body: CreateNotificationDto) {
    return this.notificationService.createNotification(body);
  }

  @Get()
  async getNotifications(@Query('limit') limit: number) {
    return this.notificationService.getNotifications(limit);
  }
}
