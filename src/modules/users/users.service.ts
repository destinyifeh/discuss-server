import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';

import { USERS_AVATAR_FOLDER } from 'src/common/utils/constants/config';
import { capitalizeName } from 'src/common/utils/formatter';
import { selectedFields } from 'src/common/utils/user.mapper';
import { MailService } from 'src/mail/mail.service';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { GetUsersParams } from '../../auth/dto/user-types.dto';
import { Comment } from '../comments/schema/comment.schema';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { Post } from '../posts/schema/post.schema';
import { MailUserDto, UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly mediaUploadService: MediaUploadService,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationsService,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectConnection() private readonly connection: Connection,
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
      const { url, key } = await this.mediaUploadService.uploadFile(
        coverFile,
        USERS_AVATAR_FOLDER,
      );

      updates.cover_avatar = url;
      updates.cover_avatar_public_id = key;

      if (current.cover_avatar_public_id) {
        await this.mediaUploadService.deleteFile(
          current.cover_avatar_public_id,
        );
      }
    }

    /* -------- handle avatar ----------------------------------- */
    if (avatarFile) {
      const { url, key } = await this.mediaUploadService.uploadFile(
        avatarFile,
        USERS_AVATAR_FOLDER,
      );

      updates.avatar = url;
      updates.avatar_public_id = key;

      if (current.avatar_public_id) {
        await this.mediaUploadService.deleteFile(current.avatar_public_id);
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

  async deleteUser(userId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const user = await this.userModel.findById(userId).session(session);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // 1️⃣ Delete user's avatar
      if (user.avatar_public_id) {
        await this.mediaUploadService.deleteFile(user.avatar_public_id);
      }

      // 2️⃣ Get all posts by user
      const posts = await this.postModel.find({ user: userId }).lean();
      const postImagePublicIds = posts
        .flatMap((post) => post.images ?? [])
        .filter((img) => img?.public_id)
        .map((img) => img.public_id);

      // 3️⃣ Get all comments by user
      const comments = await this.commentModel
        .find({ commentBy: userId })
        .lean();
      const commentImagePublicIds = comments
        .flatMap((comment) => comment.images ?? [])
        .filter((img) => img?.public_id)
        .map((img) => img.public_id);

      // 4️⃣ Delete all post images and comment images
      const allImagePublicIds = [
        ...postImagePublicIds,
        ...commentImagePublicIds,
      ];
      if (allImagePublicIds.length > 0) {
        await this.mediaUploadService.deleteFiles(allImagePublicIds); // not in session
      }

      // 5️⃣ Delete posts
      await this.postModel.deleteMany({ user: userId }, { session });

      // 6️⃣ Remove likes/bookmarks/views/comments from other posts
      await this.postModel.updateMany(
        {},
        {
          $pull: {
            likedBy: userId,
            bookmarkedBy: userId,
            viewedBy: userId,
          },
        },
        { session },
      );

      // 7️⃣ Delete comments by user
      await this.commentModel.deleteMany({ commentBy: userId }, { session });

      // 8️⃣ Delete the user
      await this.userModel.deleteOne({ _id: userId }, { session });

      await session.commitTransaction();

      return {
        code: HttpStatus.OK,
        message: 'User and all associated data successfully deleted',
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error deleting user and related data:', error);
      throw new InternalServerErrorException(
        'Failed to delete user and related data',
      );
    } finally {
      session.endSession();
    }
  }

  async updateUserPhoto(
    id: string,
    fileType: string,
    avatar: { url: string; key: string } | null,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete existing image if it exists
    if (fileType === 'profile_cover') {
      if (user.cover_avatar_public_id) {
        await this.mediaUploadService.deleteFile(user.cover_avatar_public_id);
      }
      user.cover_avatar_public_id = avatar?.key as string;
      user.cover_avatar = avatar?.url as string;
    } else if (fileType === 'profile_photo') {
      if (user.avatar_public_id) {
        await this.mediaUploadService.deleteFile(user.avatar_public_id);
      }
      user.avatar_public_id = avatar?.key as string;
      user.avatar = avatar?.url as string;
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

  async getFollowing(username: string, page: number, limit: number) {
    // Find the user and only fetch their following IDs
    const user = await this.userModel
      .findOne({ username })
      .select('following _id')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Total followings for pagination
    const total = user.following.length;

    // Apply pagination to the following list
    const paginatedFollowing = await this.userModel
      .find({ _id: { $in: user.following } })
      .select('username avatar')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return {
      code: '200',
      message: 'Following retrieved successfully',
      data: {
        following: paginatedFollowing,
        pagination: {
          totalItems: total,
          userId: user._id,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    };
  }

  async getFollowers(username: string, page: number, limit: number) {
    // Find the user and only fetch their following IDs
    const user = await this.userModel
      .findOne({ username })
      .select('followers _id')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Total followings for pagination
    const total = user.followers.length;

    // Apply pagination to the followers list
    const paginatedFollowing = await this.userModel
      .find({ _id: { $in: user.followers } })
      .select('username avatar')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return {
      code: '200',
      message: 'Followers retrieved successfully',
      data: {
        followers: paginatedFollowing,
        pagination: {
          totalItems: total,
          userId: user._id,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    };
  }

  async mailUser(data: MailUserDto) {
    await this.mailService.sendWith(
      'ses',
      data.email,
      data.subject,
      'mail-user',
      {
        recipientName: capitalizeName(data.username),
        recipientEmail: data.email,
        messageContent: data.message,
        senderName: capitalizeName(data.senderName),
        senderEmail: data.senderEmail,
        appName: 'Discussday',
      },
    );

    return { code: HttpStatus.OK, message: 'Email delivered successfully' };
  }
}
