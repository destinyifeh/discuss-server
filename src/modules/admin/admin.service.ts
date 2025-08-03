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
  Role,
} from 'src/common/utils/types/user.type';
import { Post } from '../posts/schema/post.schema';
import { User } from '../users/schemas/user.schema';
import { AccountRestrictionDto } from './dto/account-restriction.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
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

  async getUserStats() {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(currentMonth.getMonth() - 1);

    const thisMonthCount = await this.userModel.countDocuments({
      createdAt: {
        $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
      },
    });

    const lastMonthCount = await this.userModel.countDocuments({
      createdAt: {
        $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
        $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
      },
    });

    const totalUsers = await this.userModel.countDocuments();

    const growth =
      lastMonthCount === 0
        ? 100
        : ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;

    return {
      code: '200',
      totalUsers,
      growth: parseFloat(growth.toFixed(2)),
    };
  }

  async getUserDistribution() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const totalUsers = await this.userModel.countDocuments();

    const newUsers = await this.userModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const activeUsers = await this.userModel.countDocuments({
      lastActive: { $gte: thirtyDaysAgo },
    });

    const inactiveUsers = totalUsers - activeUsers;

    return {
      code: '200',
      distribution: {
        newUsers: Math.round((newUsers / totalUsers) * 100),
        activeUsers: Math.round((activeUsers / totalUsers) * 100),
        inactiveUsers: Math.round((inactiveUsers / totalUsers) * 100),
      },
    };
  }

  async getAllUsersWithPostCount(
    page = 1,
    limit = 10,
    search = '',
    status?: 'active' | 'inactive' | 'suspended',
  ) {
    const skip = (page - 1) * limit;

    // Base query
    const query: any = {};

    // Add keyword search if provided
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Get total count
    const totalUsers = await this.userModel.countDocuments();

    // Get paginated users
    const users = await this.userModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .lean();

    const userData = await Promise.all(
      users.map(async (user) => {
        const postCount = await this.postModel.countDocuments({
          user: user._id,
        });
        return {
          _id: user._id,
          name: user.username,
          username: user.username,
          status: user.status,
          avatar: user.avatar,
          email: user.email,
          role: user.role,
          postCount,
        };
      }),
    );

    return {
      code: '200',
      users: userData,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit),
      },
    };
  }

  async getUserDistributionAndStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [totalUsers, newUsers, activeUsers] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      this.userModel.countDocuments({ lastActive: { $gte: thirtyDaysAgo } }),
    ]);

    const inactiveUsers = totalUsers - activeUsers;

    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(currentMonth.getMonth() - 1);

    const [thisMonthCount, lastMonthCount] = await Promise.all([
      this.userModel.countDocuments({
        createdAt: {
          $gte: new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            1,
          ),
        },
      }),
      this.userModel.countDocuments({
        createdAt: {
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        },
      }),
    ]);

    const growth =
      lastMonthCount === 0
        ? thisMonthCount > 0
          ? 100
          : 0
        : ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;

    return {
      code: '200',
      distribution: {
        newUsers:
          totalUsers === 0 ? 0 : Math.round((newUsers / totalUsers) * 100),
        activeUsers:
          totalUsers === 0 ? 0 : Math.round((activeUsers / totalUsers) * 100),
        inactiveUsers:
          totalUsers === 0 ? 0 : Math.round((inactiveUsers / totalUsers) * 100),
      },
      totalUsers,
      growth: parseFloat(growth.toFixed(2)),
    };
  }

  //update role
  async updateUserRole(role: Role, userId: string) {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = role;
    await user.save();

    return { code: '200', newRole: user.role, message: 'Success' };
  }

  async getSectionPostCommentStats() {
    const results = await this.postModel.aggregate([
      // Step 1: Lookup comments for each post
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'post',
          as: 'comments',
        },
      },
      // Step 2: Group by section
      {
        $group: {
          _id: '$section',
          posts: { $sum: 1 },
          comments: { $sum: { $size: '$comments' } },
        },
      },
      // Step 3: Rename fields to match frontend format
      {
        $project: {
          _id: 0,
          name: '$_id',
          posts: 1,
          comments: 1,
        },
      },
      // Optional: Sort by number of posts or comments
      { $sort: { posts: -1 } },
    ]);

    return {
      code: '200',
      message: 'Section stats retrieved',
      data: results,
    };
  }

  async getPostStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const totalPosts = await this.postModel.countDocuments();

    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(currentMonth.getMonth() - 1);

    const [thisMonthCount, lastMonthCount] = await Promise.all([
      this.postModel.countDocuments({
        createdAt: {
          $gte: new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            1,
          ),
        },
      }),
      this.postModel.countDocuments({
        createdAt: {
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        },
      }),
    ]);

    const growth =
      lastMonthCount === 0
        ? thisMonthCount > 0
          ? 100
          : 0
        : ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;

    return {
      code: '200',
      totalPosts,
      growth: parseFloat(growth.toFixed(2)),
    };
  }
}
