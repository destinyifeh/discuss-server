import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UploadApiResponse } from 'cloudinary';
import { Model } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';
import { selectedFields } from '../../auth/dto/selectedFields.dto';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { GetUsersParams } from '../../auth/dto/user-types.dto';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly mediaUploadService: MediaUploadService,
    private readonly notificationService: NotificationsService,
  ) {}

  async getUser(userId: string) {
    try {
      const user = await this.userModel
        .findById(userId)
        .select(selectedFields)
        .lean(); // include only what you want

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        code: HttpStatus.OK,
        message: 'User retrieved successfully',
        data: user,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to get user');
    }
  }

  async getUsers() {
    try {
      const users = await this.userModel.find({}).select(selectedFields).exec();

      if (!users) {
        throw new NotFoundException('Users not found');
      }

      return {
        code: HttpStatus.OK,
        message: 'Users retrieved successfully',
        data: users,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to get users');
    }
  }

  //GET /users?joinedAfter=2024-01-01
  //GET /users?joinedBefore=2025-01-01
  //GET /users?search=john&joinedAfter=2024-01-01&joinedBefore=2025-01-01&page=1&limit=5

  async getAllUsers(params: GetUsersParams) {
    const { page, limit, search, role, sortBy, joinedAfter, joinedBefore } =
      params;

    try {
      const skip = (page - 1) * limit;

      const query: any = {};

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      if (role) {
        query.roles = role;
      }

      if (joinedAfter || joinedBefore) {
        query.joined = {};
        if (joinedAfter) query.joined.$gte = new Date(joinedAfter);
        if (joinedBefore) query.joined.$lte = new Date(joinedBefore);
      }
      const sortDirection = sortBy === 'asc' ? 1 : -1;

      const [users, total] = await Promise.all([
        this.userModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: sortDirection })
          .select(selectedFields)
          .lean()
          .exec(),
        this.userModel.countDocuments(query),
      ]);
      const sanitized = new UserResponseDto(users);

      return {
        code: HttpStatus.OK,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            totalItems: total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            perPage: limit,
          },
        },
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to get users');
    }
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      code: HttpStatus.OK,
      message: 'User record updated',
      data: user,
    };
  }

  async deleteUser(id: string) {
    try {
      const result = await this.userModel.deleteOne({ _id: id }).exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException('User not found');
      }

      return {
        code: HttpStatus.OK,
        message: 'User successfully deleted',
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  async updateUserPhoto(
    id: string,
    fileType: string,
    avatar: UploadApiResponse,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete existing image if it exists
    if (fileType === 'profile_cover') {
      if (user.cover_avatar_public_id) {
        await this.mediaUploadService.deleteImage(user.cover_avatar_public_id);
      }
      user.cover_avatar_public_id = avatar.public_id;
      user.cover_avatar = avatar.secure_url;
    } else if (fileType === 'profile_photo') {
      if (user.avatar_public_id) {
        await this.mediaUploadService.deleteImage(user.avatar_public_id);
      }
      user.avatar_public_id = avatar.public_id;
      user.avatar = avatar.secure_url;
    } else {
      throw new BadRequestException(
        'Invalid fileType. Expected profile_cover or profile_photo.',
      );
    }

    await user.save();

    return {
      code: HttpStatus.OK,
      message: 'Photo updated',
    };
  }

  async followUser2(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const currentUser = await this.userModel.findById(currentUserId);
    const targetUser = await this.userModel.findById(targetUserId);

    if (!targetUser) throw new NotFoundException('User to follow not found');

    if (currentUser && !currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
      await currentUser.save();
    }

    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId);
      await targetUser.save();
    }

    return { message: 'Followed successfully' };
  }

  async followUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const [currentUser, targetUser] = await Promise.all([
      this.userModel.findById(currentUserId),
      this.userModel.findById(targetUserId),
    ]);

    if (!currentUser) throw new NotFoundException('Current user not found');
    if (!targetUser) throw new NotFoundException('User to follow not found');

    /* ---------- 1️⃣  Add follow relationship if not already following ---------- */
    let updated = false;

    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
      await currentUser.save();
      updated = true;
    }

    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId);
      await targetUser.save();
      updated = true;
    }

    /* ---------- 2️⃣  If follow happened (not duplicate) create notification ---- */
    if (updated) {
      await this.notificationService.createNotification({
        type: 'follow',
        content: 'started following you',
        user: {
          username: currentUser.username,
          avatar: currentUser.avatar,
        },
        recipientId: targetUser._id.toString(),
        recipient: targetUser._id.toString(),
        // postId: undefined  // not needed for follow notif
      });
    }

    return { message: updated ? 'Followed successfully' : 'Already following' };
  }

  async unfollowUser(currentUserId: string, targetUserId: string) {
    const currentUser = await this.userModel.findById(currentUserId);
    const targetUser = await this.userModel.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException('User to unfollow not found');
    }
    if (!currentUser) {
      throw new NotFoundException('Current user record not found');
    }
    currentUser.following = currentUser.following.filter(
      (id) => id !== targetUserId,
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => id !== currentUserId,
    );

    await currentUser.save();
    await targetUser.save();

    return { message: 'Unfollowed successfully' };
  }
}
