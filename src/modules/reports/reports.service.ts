import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';
import { User } from '../users/schemas/user.schema';
import { Report } from './schema/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createReport(
    targetType: Report['targetType'],
    targetId: string,
    reporterId: string,
    reason: string,
    extra?: Partial<Report>,
  ) {
    return this.reportModel.create({
      targetType,
      targetId,
      reporterId,
      reason,
      ...extra,
    });
  }

  // Convenience wrappers
  reportPost(postId: string, reporterId: string, reason: string) {
    return this.createReport('post', postId, reporterId, reason);
  }
  reportComment(commentId: string, reporterId: string, reason: string) {
    return this.createReport('comment', commentId, reporterId, reason);
  }
  reportAd(adId: string, reporterId: string, reason: string) {
    return this.createReport('ad', adId, reporterId, reason);
  }
  reportUser(userId: string, reporterId: string, reason: string) {
    return this.createReport('user', userId, reporterId, reason);
  }

  /* Admin */
  async listOpenReports() {
    return this.reportModel.find({ status: 'open' }).sort({ createdAt: -1 });
  }

  async closeReport(id: string, adminNote: string) {
    return this.reportModel.findByIdAndUpdate(
      id,
      { status: 'closed', adminNote, resolvedAt: new Date() },
      { new: true },
    );
  }

  async reportAbuse(
    reporterId: string,
    reason: string,
    abuseCategory?: string,
    isAnonymous = false,
  ) {
    return this.createReport(
      'abuse',
      reporterId, // placeholder targetId
      reporterId,
      reason,
      { abuseCategory, isAnonymous },
    );
  }

  //   async warnUser(userId: string, warningText: string) {
  //     await this.createReport(
  //       'user',
  //       userId,
  //       userId, // reporterId = same user (placeholder)
  //       warningText,
  //       { status: 'warned' },
  //     );
  //   }

  async resolveWarning(userId: string, index: number, adminNote?: string) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.warnings?.[index])
      throw new NotFoundException('Warning not found');

    user.warnings[index].resolved = true;
    user.warnings[index].resolvedAt = new Date();
    user.warnings[index].adminNote = adminNote;
    await user.save();

    return { message: 'Warning resolved' };
  }

  /** Warn a user and notify them */
  async warnUser(userId: string, reason: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // append to warnings array (create if missing)
    user.warnings = user.warnings ?? [];
    user.warnings.push({ reason, issuedAt: new Date(), resolved: false });
    await user.save();

    // notify
    await this.notificationsService.createNotification({
      type: 'warning',
      content: reason,
      user: {
        username: 'admin',
        avatar: '/admin.png',
      },
      recipientId: user._id.toString(),
      recipient: user._id.toString(),
    });

    return { message: 'Warning issued' };
  }
}
