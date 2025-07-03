import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UploadApiResponse } from 'cloudinary';
import { Model } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Comment } from '../comments/schema/comment.schema';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { User } from '../users/schemas/user.schema';
import { CreatePostDto, PostImage, UpdatePostDto } from './dto/create-post.dto';
import { Post } from './schema/post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsService: NotificationsService,
    private readonly mediaUploadService: MediaUploadService,
  ) {}

  async createPost(data: CreatePostDto, images?: UploadApiResponse[] | null) {
    const formattedImages: PostImage[] = Array.isArray(images)
      ? images.map((img) => ({
          secure_url: img.secure_url,
          public_id: img.public_id,
        }))
      : [];

    const post = await this.postModel.create({
      ...data,
      images: formattedImages,
      author: data.userId,
      commentsClosed: data.commentsClosed ?? false,
    });

    return {
      code: HttpStatus.OK,
      message: 'Post created',
      data: post,
    };
  }

  async deletePost(id: string) {
    const post = await this.postModel.findById(id).exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const publicIds =
      post.images
        ?.filter((img: any) => img?.public_id)
        .map((img: any) => img.public_id) ?? [];

    if (publicIds.length > 0) {
      try {
        await this.mediaUploadService.deleteImages(publicIds);
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to delete images: ${error.message}`,
        );
      }
    }

    //   if (post.images && post.images.length > 0) {
    //   await Promise.all(
    //     post.images.map((image) =>
    //       image.public_id ? cloudinary.uploader.destroy(image.public_id) : null
    //     )
    //   );
    // }

    // Now delete the post
    await this.postModel.deleteOne({ _id: id }).exec();

    return {
      code: HttpStatus.OK,
      message: 'Post and associated images deleted',
    };
  }

  async updatePost(
    id: string,
    data: UpdatePostDto,
    newImages?: UploadApiResponse[] | null, // <-- now takes upload results
  ) {
    /* ---------- 0️⃣  Fetch post ------------------------------- */
    const post = await this.postModel.findById(id).exec();
    if (!post) throw new NotFoundException('Post not found');

    /* ---------- 1️⃣  Work out which current images to keep ---- */
    const keepIds = data.keepImagePublicIds ?? [];

    const keptImages: PostImage[] = post.images.filter((img) =>
      keepIds.includes(img.public_id),
    );

    const removedIds = post.images
      .filter((img) => !keepIds.includes(img.public_id))
      .map((img) => img.public_id);

    /* ---------- 2️⃣  Delete any images the user dropped ------- */
    if (removedIds.length) {
      await this.mediaUploadService.deleteImages(removedIds);
    }

    /* ---------- 3️⃣  Convert newly-uploaded images ------------ */
    let uploadedImages: PostImage[] = [];
    if (newImages?.length) {
      uploadedImages = newImages.map((res) => ({
        secure_url: res.secure_url,
        public_id: res.public_id,
      }));
    }

    /* ---------- 4️⃣  Assemble final image array --------------- */
    const finalImages = [...keptImages, ...uploadedImages];

    /* ---------- 5️⃣  Patch scalar fields ---------------------- */

    post.content = data.content ?? post.content;
    post.section = data.section ?? post.section;
    post.sectionId = data.sectionId ?? post.sectionId;
    post.commentsClosed = data.commentsClosed ?? post.commentsClosed;

    // Only overwrite images if user made any change
    if (data.keepImagePublicIds || uploadedImages.length) {
      post.images = finalImages;
    }

    await post.save();

    return {
      code: HttpStatus.OK,
      message: 'Post updated',
      data: post,
    };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const isLiked = post.likedBy.includes(userId);

    if (isLiked) {
      post.likedBy = post.likedBy.filter((id) => id !== userId);
      post.likes -= 1;
    } else {
      post.likedBy.push(userId);
      post.likes += 1;

      if (String(post.userId) !== userId) {
        const liker = await this.userModel.findById(userId);
        if (liker) {
          await this.notificationsService.createNotification({
            type: 'like',
            user: {
              username: liker.username,
              avatar: liker.avatar,
            },
            content: 'liked your post',
            recipientId: post.userId.toString(),
            recipient: post.userId.toString(),
          });
        }
      }
    }

    await post.save();

    return {
      liked: !isLiked,
      likesCount: post.likes,
    };
  }

  async incrementViews(postId: string) {
    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { views: 1 },
    });
  }

  async toggleBookmark(postId: string, userId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const isBookmarked = post.bookmarkedBy.includes(userId);

    if (isBookmarked) {
      post.bookmarkedBy = post.bookmarkedBy.filter((id) => id !== userId);
      post.bookmarks -= 1;
    } else {
      post.bookmarkedBy.push(userId);
      post.bookmarks += 1;
    }

    await post.save();

    return {
      bookmarked: !isBookmarked,
      bookmarks: post.bookmarks,
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
    const post = await this.postModel.findById(postId).lean();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const commentCount = await this.commentModel.countDocuments({ postId });

    return {
      ...post,
      commentCount,
    };
  }
}
