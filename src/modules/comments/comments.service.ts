import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { UploadApiResponse } from 'cloudinary';
import { Model, Types } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { Post } from '../posts/schema/post.schema';
import { User } from '../users/schemas/user.schema';
import {
  CommentImage,
  CreateCommentDto,
  UpdateCommentDto,
} from './dto/create-comment.dto';
import { Comment } from './schema/comment.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    private readonly mediaUploadService: MediaUploadService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    data: CreateCommentDto,
    currentUserId: string,
    images?: UploadApiResponse[] | null,
  ) {
    console.log(data, 'dataaa');
    const post = await this.postModel.findById(data.postId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.commentsClosed) {
      throw new ForbiddenException('Comments are closed for this post.');
    }

    const formattedImages: CommentImage[] = Array.isArray(images)
      ? images.map((img) => ({
          secure_url: img.secure_url,
          public_id: img.public_id,
        }))
      : [];
    const comment = new this.commentModel({
      ...data,
      images: formattedImages,
      post: new Types.ObjectId(data.postId),
      commentBy: new Types.ObjectId(currentUserId),
    });

    await comment.save();

    return {
      code: '200',
      message: 'Comment created',
      data: comment,
    };
  }

  async like(commentId: string, userId: string) {
    // 1️⃣ Fetch the comment (only fields needed for logic)
    const comment = await this.commentModel
      .findById(commentId)
      .select('likedBy dislikedBy commentBy');

    if (!comment) throw new NotFoundException('Comment not found');

    const alreadyLiked = comment.likedBy.some((id) => id.toString() === userId);
    console.log(alreadyLiked, 'destoLiked');
    // 2️⃣ Perform updates
    if (alreadyLiked) {
      // User is unliking
      await this.commentModel.findByIdAndUpdate(commentId, {
        $pull: { likedBy: userId },
      });
    } else {
      // User is liking (add to likedBy, remove from dislikedBy)
      await this.commentModel.findByIdAndUpdate(commentId, {
        $addToSet: { likedBy: userId },
        $pull: { dislikedBy: userId },
      });

      // 3️⃣ Send notification if not self-like
      if (comment.commentBy?.toString() !== userId) {
        const liker = await this.userModel.findById(userId).lean();
        if (liker) {
          await this.notificationsService.createNotification({
            type: 'liked',
            content: 'liked your comment',
            senderName: liker.username,
            senderAvatar: liker.avatar,
            recipient: comment.commentBy.toString(),
          });
        }
      }
    }

    // 4️⃣ Get updated like/dislike count
    const updatedComment = await this.commentModel
      .findById(commentId)
      .select('likedBy dislikedBy')
      .lean();

    return {
      liked: !alreadyLiked,
      likesCount: updatedComment?.likedBy?.length ?? 0,
      dislikesCount: updatedComment?.dislikedBy?.length ?? 0,
    };
  }

  async dislike(commentId: string, userId: string) {
    const comment = await this.commentModel
      .findById(commentId)
      .select('likedBy dislikedBy');

    if (!comment) throw new NotFoundException('Comment not found');

    const alreadyDisliked = comment.dislikedBy.some(
      (id) => id.toString() === userId,
    );

    if (!alreadyDisliked) {
      // Add to dislikedBy, remove from likedBy
      await this.commentModel.findByIdAndUpdate(commentId, {
        $addToSet: { dislikedBy: userId },
        $pull: { likedBy: userId },
      });
    }

    // Fetch updated counts
    const updated = await this.commentModel
      .findById(commentId)
      .select('likedBy dislikedBy')
      .lean();

    return {
      disliked: !alreadyDisliked,
      likesCount: updated?.likedBy?.length ?? 0,
      dislikesCount: updated?.dislikedBy?.length ?? 0,
    };
  }

  async findByPost(postId: string) {
    return this.commentModel.find({ postId }).sort({ createdAt: -1 });
  }

  async delete(commentId: string, postId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.commentBy.toString() !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this comment',
      );
    }

    if (comment.post.toString() !== postId) {
      throw new BadRequestException(
        'Comment does not belong to the specified post',
      );
    }

    await this.commentModel.deleteOne({ _id: commentId }).exec();
    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { commentCount: -1 },
    });

    return {
      code: HttpStatus.OK,
      message: 'Comment deleted successfully',
    };
  }

  // comment.service.ts

  async updateComment(
    id: string,
    data: UpdateCommentDto,
    newImages?: UploadApiResponse[] | null,
  ) {
    const comment = await this.commentModel.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');

    console.log(data, 'the removaldata');
    // Delete removed images from cloud
    if (data.removedImageIds && data.removedImageIds.length > 0) {
      await this.mediaUploadService.deleteImages(data.removedImageIds);
    }

    // Prepare new image data
    const uploadedImages: CommentImage[] =
      newImages?.map((res) => ({
        secure_url: res.secure_url,
        public_id: res.public_id,
      })) ?? [];

    // Filter out removed originals
    const remainingImages = comment.images.filter(
      (img) => !data.removedImageIds?.includes(img.public_id),
    );

    // Final image array
    comment.images = [...remainingImages, ...uploadedImages];

    // Update other fields
    comment.content = data.content ?? comment.content;

    await comment.save();

    return {
      code: '200',
      message: 'Comment updated',
      data: comment,
    };
  }
}
