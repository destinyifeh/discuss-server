import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createNotification(@Body() body: CreateNotificationDto) {
    return this.notificationService.createNotification(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getNotifications(
    @Query('limit') limit: number,
    @CurrentUser() user: { userId: string },
  ) {
    return this.notificationService.getNotifications(user.userId, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mark-all-as-read')
  async markAllAsRead(@CurrentUser() user: { userId: string }) {
    return this.notificationService.markAllAsRead(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mark-as-read/:id')
  async marksRead(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.notificationService.markAsRead(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-notifications')
  async getUnreadCount(@CurrentUser() user: { userId: string }) {
    return this.notificationService.getUnreadCount(user.userId);
  }
}
