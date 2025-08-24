import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReportType } from 'src/common/utils/types/report.type';
import { NotificationsService } from 'src/notifications/notifications.service';
import { User } from '../users/schemas/user.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { Report } from './schema/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async reportPost(data: CreateReportDto) {
    const report = await this.reportModel.create({
      type: ReportType.POST,
      ...data,
      post: new Types.ObjectId(data.post),
      reportedBy: new Types.ObjectId(data.reportedBy),
    });

    await this.notificationsService.createNotification({
      type: 'admin',
      message: 'content reported',
      content: `A post was reported for inappropriate content`,
      senderName: 'System',
    });

    return {
      code: '200',
      message: 'Post has been reported',
      report: report,
    };
  }
  async reportComment(data: CreateReportDto) {
    const report = await this.reportModel.create({
      type: ReportType.COMMENT,
      ...data,
      comment: new Types.ObjectId(data.comment),
      reportedBy: new Types.ObjectId(data.reportedBy),
    });

    await this.notificationsService.createNotification({
      type: 'admin',
      message: 'comment reported',
      content: `A comment was reported for inappropriate content`,
      senderName: 'System',
    });
    return {
      code: '200',
      message: 'Comment has been reported',
      report: report,
    };
  }
  async reportAd(data: CreateReportDto) {
    const report = await this.reportModel.create({
      type: ReportType.AD,
      ...data,
      ad: new Types.ObjectId(data.ad),
      reportedBy: new Types.ObjectId(data.reportedBy),
    });

    await this.notificationsService.createNotification({
      type: 'admin',
      message: 'Ad reported',
      content: `Ad was reported for inappropriate content`,
      senderName: 'System',
    });
    return {
      code: '200',
      message: 'Ad has been reported',
      report: report,
    };
  }
  async reportUser(data: CreateReportDto) {
    const report = await this.reportModel.create({
      type: ReportType.USER,
      ...data,
      user: new Types.ObjectId(data.user),
      reportedBy: new Types.ObjectId(data.reportedBy),
    });

    await this.notificationsService.createNotification({
      type: 'admin',
      message: 'User reported',
      content: `A user was reported`,
      senderName: 'System',
    });

    return {
      code: '200',
      message: 'User has been reported',
      report: report,
    };
  }

  async reportAbuse(data: CreateReportDto) {
    const report = await this.reportModel.create({
      type: ReportType.ABUSE,
      ...data,
      reportedBy: new Types.ObjectId(data.reportedBy),
    });

    await this.notificationsService.createNotification({
      type: 'admin',
      message: 'Abuse reported',
      content: `An abuse was reported`,
      senderName: 'System',
    });
    return {
      code: '200',
      message: 'Successfully reported',
      report: report,
    };
  }

  async getReports(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;

    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } },
      ];
    }

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(query)
        .populate('reportedBy', 'avatar username')
        .populate('post')
        .populate('comment')
        .populate('ad')
        .populate('user')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.reportModel.countDocuments(query),
    ]);

    return {
      code: '200',
      message: 'Reports retrieved successfully',
      data: {
        reports,
        pagination: {
          totalItems: total,
          page: page,
          pages: Math.ceil(total / limit),
          limit: limit,
        },
      },
    };
  }

  async resolveWarning(id: string) {
    const deleted = await this.reportModel.findByIdAndDelete(id);

    if (!deleted) {
      return { message: 'No warning found with that ID', code: '404' };
    }

    return { message: 'Warning resolved', code: '200' };
  }

  /** Warn a user and notify them */
  async warn(targetUserId: string, adminUserId: string, message: string) {
    //const user = await this.userModel.findById(adminUserId);

    // notify
    await this.notificationsService.createNotification({
      type: 'warning',
      content: message,
      senderName: 'Admin',
      recipient: targetUserId.toString(),
    });

    return { code: '200', message: 'Warning issued' };
  }
}
