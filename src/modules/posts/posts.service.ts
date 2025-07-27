import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { UploadApiResponse } from 'cloudinary';
import { Connection, Model, Types } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Comment } from '../comments/schema/comment.schema';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { User } from '../users/schemas/user.schema';
import {
  CreatePostDto,
  GetPostsParams,
  PostImage,
  UpdatePostDto,
} from './dto/create-post.dto';
import { Post } from './schema/post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsService: NotificationsService,
    private readonly mediaUploadService: MediaUploadService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createPost(
    currentUserId: string,
    data: CreatePostDto,
    images?: UploadApiResponse[] | null,
  ) {
    const formattedImages: PostImage[] = Array.isArray(images)
      ? images.map((img) => ({
          secure_url: img.secure_url,
          public_id: img.public_id,
        }))
      : [];

    const post = await this.postModel.create({
      ...data,
      images: formattedImages,
      user: new Types.ObjectId(currentUserId),
    });

    return {
      code: '200',
      message: 'Post created',
      data: post,
    };
  }

  async getPosts(params: GetPostsParams) {
    const { page, limit, search } = params;

    try {
      const skip = (page - 1) * limit;

      const query: any = {};

      if (search) {
        query.$or = [
          { content: { $regex: search, $options: 'i' } },
          { section: { $regex: search, $options: 'i' } },
        ];
      }

      const [posts, total] = await Promise.all([
        this.postModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.postModel.countDocuments(query),
      ]);

      return {
        code: '200',
        message: 'Posts retrieved successfully',
        data: {
          posts,
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
      throw new InternalServerErrorException('Failed to get posts');
    }
  }

  async deletePost(id: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const post = await this.postModel.findById(id).session(session);
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // 🔹 1. Collect public_ids of post images
      const postImagePublicIds =
        post.images
          ?.filter((img) => img?.public_id)
          .map((img) => img.public_id) ?? [];

      // 🔹 2. Fetch comments related to this post
      const comments = await this.commentModel
        .find({ post: id })
        .session(session);

      // 🔹 3. Collect public_ids of all comment images
      const commentImagePublicIds = comments
        .flatMap((comment) => comment.images ?? [])
        .filter((img) => img?.public_id)
        .map((img) => img.public_id);

      // 🔹 4. Combine all image public_ids to delete from Cloudinary
      const allPublicIdsToDelete = [
        ...postImagePublicIds,
        ...commentImagePublicIds,
      ];

      if (allPublicIdsToDelete.length > 0) {
        try {
          await this.mediaUploadService.deleteImages(allPublicIdsToDelete);
        } catch (error) {
          throw new InternalServerErrorException(
            `Failed to delete images: ${error.message}`,
          );
        }
      }

      // 🔹 5. Delete comments
      await this.commentModel.deleteMany({ post: id }).session(session);

      // 🔹 6. Delete post
      await this.postModel.deleteOne({ _id: id }).session(session);

      // ✅ 7. Commit transaction
      await session.commitTransaction();
      session.endSession();

      return {
        code: HttpStatus.OK,
        message: 'Post, comments, and related images deleted successfully',
      };
    } catch (error) {
      console.log(error, 'delete post err');
      await session.abortTransaction();
      session.endSession();
      throw new InternalServerErrorException(
        'Failed to delete post and associated data',
      );
    }
  }

  async updatePost(
    id: string,
    data: UpdatePostDto,
    newImages?: UploadApiResponse[] | null,
  ) {
    const post = await this.postModel.findById(id).exec();
    if (!post) throw new NotFoundException('Post not found');

    console.log(data, 'the removaldata');
    // Delete removed images from cloud
    if (data.removedImageIds && data.removedImageIds.length > 0) {
      await this.mediaUploadService.deleteImages(data.removedImageIds);
    }

    // Prepare new image data
    const uploadedImages: PostImage[] =
      newImages?.map((res) => ({
        secure_url: res.secure_url,
        public_id: res.public_id,
      })) ?? [];

    // Filter out removed originals
    const remainingImages = post.images.filter(
      (img) => !data.removedImageIds?.includes(img.public_id),
    );

    // Final image array
    post.images = [...remainingImages, ...uploadedImages];

    // Update other fields
    post.content = data.content ?? post.content;
    post.section = data.section ?? post.section;
    post.title = data.title ?? post.title;

    await post.save();

    return {
      code: '200',
      message: 'Post updated',
      data: post,
    };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const isLiked = post.likedBy.some((id) => id.toString() === userId);

    if (isLiked) {
      await this.postModel.findByIdAndUpdate(postId, {
        $pull: { likedBy: userId },
      });
    } else {
      await this.postModel.findByIdAndUpdate(postId, {
        $addToSet: { likedBy: userId },
      });

      // Notify if it's not self-like
      if (String(post.user) !== userId) {
        const liker = await this.userModel.findById(userId, 'username avatar');
        if (liker) {
          await this.notificationsService.createNotification({
            type: 'liked',
            senderName: liker.username,
            senderAvatar: liker.avatar,
            content: 'liked your post',
            recipient: String(post.user),
          });
        }
      }
    }

    const updatedPost = await this.postModel.findById(postId, 'likedBy');
    return {
      code: '200',
      liked: !isLiked,
      likesCount: updatedPost?.likedBy.length,
    };
  }

  async incrementViews(postId: string, userId: string) {
    const post = await this.postModel.findByIdAndUpdate(
      postId,
      { $addToSet: { viewedBy: userId } },
      { new: true, projection: 'viewedBy' }, // return updated document, only viewedBy field
    );

    const viewCount = post?.viewedBy.length;

    return {
      viewed: true,
      views: viewCount,
    };
  }

  async toggleBookmark(postId: string, userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const isBookmarked = post.bookmarkedBy.some(
      (id) => id.toString() === userId,
    );

    if (isBookmarked) {
      await this.postModel.updateOne(
        { _id: postId },
        { $pull: { bookmarkedBy: userObjectId } },
      );
    } else {
      await this.postModel.updateOne(
        { _id: postId },
        { $addToSet: { bookmarkedBy: userObjectId } }, // prevents duplicates
      );
    }

    const updatedPost = await this.postModel.findById(postId, 'bookmarkedBy');
    console.log(updatedPost, 'bookmark post');
    return {
      bookmarked: !isBookmarked,
      bookmarks: updatedPost?.bookmarkedBy.length,
    };
  }

  async toggleComments(postId: string, shouldClose: boolean) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');
    post.commentsClosed = shouldClose;
    await post.save();
    return {
      message: `Comments have been ${shouldClose ? 'closed' : 'opened'}`,
      post,
    };
  }

  async getPostById(postId: string) {
    // Increment the view count
    await this.postModel.findByIdAndUpdate(postId, { $inc: { viewCount: 1 } });

    const post = await this.postModel
      .findById(postId)
      .populate('user', 'username avatar')
      .lean();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      ...post,
    };
  }

  async countPostComments(postId: string) {
    const objectId = new Types.ObjectId(postId);
    const commentCount = await this.commentModel
      .countDocuments({ post: objectId })
      .exec();

    return {
      code: '200',
      commentCount: commentCount,
    };
  }
}
