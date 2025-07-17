import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UploadApiResponse } from 'cloudinary';
import { Model, Types } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';

import { selectedFields } from 'src/common/utils/user.mapper';
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

  async getUserByUsername(username: string) {
    const user = await this.userModel
      .findOne({ username })
      .select(selectedFields)
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      code: '200',
      message: 'User retrieved successfully',
      user: user,
    };
  }

  async doesUserExistByUsername(username: string) {
    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      code: '200',
      message: 'User found',
    };
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
        code: '200',
        message: 'Users retrieved successfully',
        data: {
          users,
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
      throw new InternalServerErrorException('Failed to get users');
    }
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    avatarFile?: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ) {
    const current = await this.userModel.findById(id).lean().exec();
    if (!current) throw new NotFoundException('User not found');

    /* -------- username uniqueness check ----------------------- */
    if (dto.username && dto.username !== current.username) {
      const taken = await this.userModel
        .findOne({ username: dto.username })
        .lean();
      if (taken) throw new ConflictException('Username is already in use');
    }

    /* -------- build updates object ---------------------------- */
    const updates: any = {
      ...dto,
    };

    /* -------- handle cover image ------------------------------ */
    if (coverFile) {
      const { secure_url, public_id } =
        await this.mediaUploadService.uploadImage(coverFile, 'dee');

      updates.cover_avatar = secure_url;
      updates.cover_avatar_public_id = public_id;

      if (current.cover_avatar_public_id) {
        await this.mediaUploadService.deleteImage(
          current.cover_avatar_public_id,
        );
      }
    }

    /* -------- handle avatar ----------------------------------- */
    if (avatarFile) {
      const { secure_url, public_id } =
        await this.mediaUploadService.uploadImage(avatarFile, 'dee');

      updates.avatar = secure_url;
      updates.avatar_public_id = public_id;

      if (current.avatar_public_id) {
        await this.mediaUploadService.deleteImage(current.avatar_public_id);
      }
    }

    /* -------- perform update ---------------------------------- */
    const user = await this.userModel
      .findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      })
      .select([
        'website',
        'bio',
        'location',
        'username',
        'avatar',
        'cover_avatar',
      ])
      .lean()
      .exec();

    return {
      code: HttpStatus.OK,
      message: 'User record updated',
      user: user,
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
      (id) => id !== new Types.ObjectId(targetUserId),
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => id !== new Types.ObjectId(currentUserId),
    );

    await currentUser.save();
    await targetUser.save();

    return { message: 'Unfollowed successfully' };
  }

  //Follow and unfollow user functionality

  async followUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    /** 1️⃣ Fetch both users */
    const [currentUser, targetUser] = await Promise.all([
      this.userModel
        .findById(currentUserId)
        .select('following username avatar'),
      this.userModel.findById(targetUserId).select('followers following'),
    ]);

    if (!currentUser) throw new NotFoundException('Current user not found');
    if (!targetUser) throw new NotFoundException('Target user not found');

    /** 2️⃣ Check if already following */
    const isAlreadyFollowing = currentUser.following.some((id) =>
      id.equals(targetUserId),
    );
    console.log(isAlreadyFollowing, 'foll22');
    /** 3️⃣ Prepare atomic updates */
    const userUpdate = isAlreadyFollowing
      ? { $pull: { following: new Types.ObjectId(targetUserId) } }
      : { $addToSet: { following: new Types.ObjectId(targetUserId) } };

    const targetUpdate = isAlreadyFollowing
      ? { $pull: { followers: new Types.ObjectId(currentUserId) } }
      : { $addToSet: { followers: new Types.ObjectId(currentUserId) } };

    /** 4️⃣ Perform updates */
    await Promise.all([
      this.userModel.updateOne({ _id: currentUserId }, userUpdate),
      this.userModel.updateOne({ _id: targetUserId }, targetUpdate),
    ]);
    console.log(isAlreadyFollowing, 'foll25');

    /** 5️⃣ Optional: Send notification */
    if (!isAlreadyFollowing) {
      await this.notificationService.createNotification({
        type: 'followed',
        content: 'started following you',
        recipient: targetUserId,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
      });
      console.log(isAlreadyFollowing, 'foll29');
    }

    /** 6️⃣ Return updated counts */
    const [updatedCurrent, updatedTarget] = await Promise.all([
      this.userModel.findById(currentUserId).select('following'),
      this.userModel.findById(targetUserId).select('followers following'),
    ]);

    return {
      message: isAlreadyFollowing
        ? 'Unfollowed successfully'
        : 'Followed successfully',
      isFollowing: !isAlreadyFollowing,
      followers: updatedTarget?.followers ?? [],
      following: updatedTarget?.following ?? [],
      currentUserFollowings: updatedCurrent?.following ?? [],
      currentUserFollowers: updatedCurrent?.followers ?? [],
    };
  }

  async getFollowing(username: string) {
    const user = await this.userModel
      .findOne({ username })
      .select('following _id')
      .populate('following', 'username avatar') // choose fields
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    console.log(user, 'user followings...');
    return {
      code: '200',
      userId: user?._id,
      following: user?.following || [],
    };
  }

  async getFollowers(username: string) {
    const user = await this.userModel
      .findOne({ username })
      .select('followers _id')
      .populate('followers', 'username avatar') // choose fields
      .lean();

    if (!user) throw new NotFoundException('User not found');

    console.log(user, 'userrr');
    return {
      code: '200',
      userId: user?._id,
      followers: user?.followers || [],
    };
  }
}
