import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
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
  UserPostType,
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
    // images?: UploadApiResponse[] | null,
    images?: { url: string; key: string }[] | null,
  ) {
    // const formattedImages: PostImage[] = Array.isArray(images)
    //   ? images.map((img) => ({
    //       secure_url: img.secure_url,
    //       public_id: img.public_id,
    //     }))
    //   : [];

    const formattedImages: PostImage[] = Array.isArray(images)
      ? images.map((img) => ({
          secure_url: img.url,
          public_id: img.key,
        }))
      : [];

    const post = await this.postModel.create({
      ...data,
      images: formattedImages,
      user: new Types.ObjectId(currentUserId),
    });
    console.log(post, 'createdPost');
    return {
      code: '200',
      message: 'Post created',
      data: post,
    };
  }

  async getCurrentUserPosts(params: GetPostsParams & { type: UserPostType }) {
    const { page, limit, search, userId, type } = params;
    const currentUser = new Types.ObjectId(userId);
    try {
      const skip = (page - 1) * limit;

      // Build the base search query
      const searchQuery: any = {};

      if (search) {
        searchQuery.$or = [
          { content: { $regex: search, $options: 'i' } },
          { section: { $regex: search, $options: 'i' } },
        ];
      }

      let posts: any[] = [];
      let total: number = 0;

      if (type === 'replies') {
        const query = { commentBy: currentUser, ...searchQuery };

        [posts, total] = await Promise.all([
          this.commentModel
            .find(query)
            .populate('commentBy', 'username avatar')
            .populate({
              path: 'post',
              populate: {
                path: 'user',
                select: 'username avatar',
              },
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean(),
          this.commentModel.countDocuments(query),
        ]);
      } else if (type === 'mentions') {
        const query = {
          'quotedComment.quotedUserId': currentUser,
          ...searchQuery,
        };

        [posts, total] = await Promise.all([
          this.commentModel
            .find(query)
            .populate('commentBy', 'username avatar')
            .populate({
              path: 'post',
              populate: {
                path: 'user',
                select: 'username avatar',
              },
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean(),
          this.commentModel.countDocuments(query),
        ]);
      } else {
        const query =
          type === 'likes'
            ? { likedBy: currentUser, ...searchQuery }
            : { user: currentUser, ...searchQuery };

        [posts, total] = await Promise.all([
          this.postModel
            .find(query)
            .populate('user', 'username avatar')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean(),
          this.postModel.countDocuments(query),
        ]);
      }
      console.log('hereeeeeemes', posts, type);
      return {
        code: '200',
        message: 'Posts retrieved successfully',
        data: {
          posts,
          pagination: {
            totalItems: total,
            page,
            pages: Math.ceil(total / limit),
            limit,
          },
        },
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to get posts');
    }
  }

  async getUserPosts(params: GetPostsParams & { type: UserPostType }) {
    const { page, limit, search, userId, type } = params;
    const currentUser = new Types.ObjectId(userId);
    try {
      const skip = (page - 1) * limit;

      // Build the base search query
      const searchQuery: any = {};

      if (search) {
        searchQuery.$or = [
          { content: { $regex: search, $options: 'i' } },
          { section: { $regex: search, $options: 'i' } },
        ];
      }

      let posts: any[] = [];
      let total: number = 0;

      if (type === 'replies') {
        const query = { commentBy: currentUser, ...searchQuery };

        [posts, total] = await Promise.all([
          this.commentModel
            .find(query)
            .populate('commentBy', 'username avatar')
            .populate({
              path: 'post',
              populate: {
                path: 'user',
                select: 'username avatar',
              },
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean(),
          this.commentModel.countDocuments(query),
        ]);
      } else if (type === 'mentions') {
        const query = {
          'quotedComment.quotedUserId': currentUser,
          ...searchQuery,
        };

        [posts, total] = await Promise.all([
          this.commentModel
            .find(query)
            .populate('commentBy', 'username avatar')
            .populate({
              path: 'post',
              populate: {
                path: 'user',
                select: 'username avatar',
              },
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean(),
          this.commentModel.countDocuments(query),
        ]);
      } else {
        const query =
          type === 'likes'
            ? { likedBy: currentUser, ...searchQuery }
            : { user: currentUser, ...searchQuery };

        [posts, total] = await Promise.all([
          this.postModel
            .find(query)
            .populate('user', 'username avatar')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean(),
          this.postModel.countDocuments(query),
        ]);
      }
      console.log('hereeeeeemes', posts, type);
      return {
        code: '200',
        message: 'Posts retrieved successfully',
        data: {
          posts,
          pagination: {
            totalItems: total,
            page,
            pages: Math.ceil(total / limit),
            limit,
          },
        },
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to get posts');
    }
  }

  async getCurrentUserPostLikes(params: GetPostsParams) {
    const { page, limit, search, userId } = params;

    try {
      const skip = (page - 1) * limit;

      const query: any = {};
      query.likedBy = userId;

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
        message: 'Like posts retrieved successfully',
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
      throw new InternalServerErrorException('Failed to get like posts');
    }
  }

  async getCurrentUserPostReplies(params: GetPostsParams) {
    const { page, limit, search, userId } = params;

    try {
      const skip = (page - 1) * limit;

      const query: any = {};
      query.commentBy = userId;

      if (search) {
        query.$or = [
          { content: { $regex: search, $options: 'i' } },
          { section: { $regex: search, $options: 'i' } },
        ];
      }

      const [posts, total] = await Promise.all([
        this.commentModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.commentModel.countDocuments(query),
      ]);

      return {
        code: '200',
        message: 'Reply posts retrieved successfully',
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
      throw new InternalServerErrorException('Failed to get reply posts');
    }
  }

  async deletePost(id: string, userId: string, userRole: string) {
    try {
      const post = await this.postModel.findById(id);
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.user.toString() !== userId && userRole !== 'super_admin') {
        throw new NotFoundException(
          "You don't have permission to delete this post.",
        );
      }

      // 🔹 1. Collect public_ids of post images
      const postImagePublicIds =
        post.images
          ?.filter((img) => img?.public_id)
          .map((img) => img.public_id) ?? [];

      // 🔹 2. Fetch comments related to this post
      const comments = await this.commentModel.find({ post: id });

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
          await this.mediaUploadService.deleteFiles(allPublicIdsToDelete);
        } catch (error) {
          throw new InternalServerErrorException(
            `Failed to delete images: ${error.message}`,
          );
        }
      }

      // 🔹 5. Delete comments
      await this.commentModel.deleteMany({ post: new Types.ObjectId(id) });

      // 🔹 6. Delete post
      await this.postModel.deleteOne({ _id: id });

      return {
        code: '200',
        message: 'Post, comments, and related images deleted successfully',
      };
    } catch (error) {
      console.error('Delete post error:', error);
      throw new InternalServerErrorException(
        error?.message ?? 'Failed to delete post and associated data',
      );
    }
  }

  async updatePost(
    id: string,
    data: UpdatePostDto,
    newImages?: { url: string; key: string }[] | null,
  ) {
    const post = await this.postModel.findById(id).exec();
    if (!post) throw new NotFoundException('Post not found');

    console.log(data.removedImageIds, 'the removaldata');
    // Delete removed images from cloud
    if (data.removedImageIds) {
      const removedIds = Array.isArray(data.removedImageIds)
        ? data.removedImageIds
        : [data.removedImageIds];

      if (removedIds.length > 0) {
        await this.mediaUploadService.deleteFiles(removedIds);
      }
    }

    // Prepare new image data
    const uploadedImages: PostImage[] =
      newImages?.map((res) => ({
        secure_url: res.url,
        public_id: res.key,
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

    return {
      bookmarked: !isBookmarked,
      bookmarks: updatedPost?.bookmarkedBy.length,
    };
  }

  async toggleComments(postId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Toggle the value
    post.commentsClosed = !post.commentsClosed;
    await post.save();

    return {
      code: '200',
      message: `Comments for content #${postId} ${post.commentsClosed ? 'have been closed' : 'have been opened'}`,
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

  async getPaginatedPostsWithCommentCount(
    page: number,
    limit: number,
    search?: string,
    section?: string,
  ) {
    const skip = (page - 1) * limit;

    const match: any = {};
    if (search) {
      match.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }
    if (section) {
      match.section = section;
    }

    const result = await this.postModel.aggregate([
      { $match: match },

      // Join comments
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'post',
          as: 'comments',
        },
      },
      {
        $addFields: {
          commentCount: { $size: '$comments' },
        },
      },

      // Join user
      {
        $lookup: {
          from: 'users',
          let: { userId: '$user' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
            {
              $project: {
                _id: 1,
                username: 1,
                avatar: 1,
              },
            },
          ],
          as: 'user',
        },
      },
      { $unwind: '$user' },

      // Remove large comment array
      {
        $project: {
          comments: 0,
          'user.password': 0, // protect sensitive fields
          'user.email': 0,
        },
      },

      // Sort newest first
      { $sort: { createdAt: -1 } },

      // Pagination using $facet
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const posts = result[0].data;
    const totalItems = result[0].totalCount[0]?.count || 0;

    return {
      code: '200',
      message: 'Posts retrieved successfully',
      data: {
        posts,
        pagination: {
          totalItems: totalItems,
          page: page,
          pages: Math.ceil(totalItems / limit),
          limit: limit,
        },
      },
    };
  }
}
