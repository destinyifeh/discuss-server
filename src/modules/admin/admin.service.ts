import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccountStatus,
  ModerationAction,
} from 'src/common/utils/types/user.type';
import { User } from '../users/schemas/user.schema';
import { AccountRestrictionDto } from './dto/account-restriction.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  private pushHistory(
    user: User,
    action: AccountRestrictionDto['action'],
    performedBy: string,
    reason?: string,
    period?: string,
  ) {
    user.statusHistory.push({
      action,
      performedBy,
      performedAt: new Date(),
      reason,
      suspensionPeriod: period,
    } as ModerationAction);
  }

  async accountRestrictionAction(
    userId: string,
    dto: AccountRestrictionDto,
    performedBy: string,
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    let message = '';
    switch (dto.action) {
      case 'suspend': {
        if (!dto.period)
          throw new BadRequestException('Suspension period required');
        const days = parseInt(dto.period, 10);
        const until = new Date(Date.now() + days * 86400000);
        user.status = AccountStatus.SUSPENDED;
        user.suspendedUntil = until;
        user.suspensionReason = dto.reason ?? null;
        user.banReason = null;
        this.pushHistory(user, 'suspend', performedBy, dto.reason, dto.period);
        message = `User suspended for ${dto.period} day(s)`;
        break;
      }
      case 'ban': {
        user.status = AccountStatus.BANNED;
        user.banReason = dto.reason ?? null;
        user.suspendedUntil = null;
        user.suspensionReason = null;
        this.pushHistory(user, 'ban', performedBy, dto.reason);
        message = 'User permanently banned';
        break;
      }
      case 'unsuspend': {
        if (!dto.reason) throw new BadRequestException('Reason required');
        if (user.status !== AccountStatus.SUSPENDED)
          throw new BadRequestException('User is not suspended');
        user.status = AccountStatus.ACTIVE;
        user.suspendedUntil = null;
        user.suspensionReason = null;
        this.pushHistory(user, 'unsuspend', performedBy, dto.reason);
        message = 'User unsuspended';
        break;
      }
      case 'unban': {
        if (!dto.reason) throw new BadRequestException('Reason required');
        if (user.status !== AccountStatus.BANNED)
          throw new BadRequestException('User is not banned');
        user.status = AccountStatus.ACTIVE;
        user.banReason = null;
        this.pushHistory(user, 'unban', performedBy, dto.reason);
        message = 'User unbanned';
        break;
      }
      default:
        throw new BadRequestException('Invalid action');
    }

    await user.save();
    //  await this.sendUserNotification(user, dto.action, dto.reason);
    return { message };
  }

  //  async clearExpiredSuspensions() {
  //     const now = new Date();
  //     await this.userModel.updateMany(
  //       { status: AccountStatus.SUSPENDED, suspendedUntil: { $lte: now } },
  //       { $set: { status: AccountStatus.ACTIVE, suspendedUntil: null, suspensionReason: null } },
  //     );
  //   }

  /** auto-clear expired suspensions (cron) */
  async clearExpiredSuspensions() {
    const now = new Date();
    const expiredUsers = await this.userModel.find({
      status: AccountStatus.SUSPENDED,
      suspendedUntil: { $lte: now },
    });

    for (const user of expiredUsers) {
      user.status = AccountStatus.ACTIVE;
      user.suspendedUntil = null;
      user.suspensionReason = null;

      // Push automatic unsuspend record
      user.statusHistory.push({
        action: 'unsuspend',
        performedBy: 'system_cron',
        performedAt: new Date(),
        reason: 'Suspension period expired',
      });

      await user.save();
    }
  }
}
