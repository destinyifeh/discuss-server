import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import { NotificationsService } from 'src/notifications/notifications.service';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { Post } from '../posts/schema/post.schema';
import { User } from '../users/schemas/user.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
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
    user: any,
    image?: { secure_url: string; public_id: string } | null,
  ) {
    const post = await this.postModel.findById(data.postId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.commentsClosed) {
      throw new ForbiddenException('Comments are closed for this post.');
    }
    const comment = new this.commentModel({
      ...data,
      userId: user._id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      image,
      post: data.postId,
      user: user,
    });
    // Increment commentCount
    await this.postModel.findByIdAndUpdate(data.postId, {
      $inc: { commentCount: 1 },
    });
    await comment.save();

    return {
      code: HttpStatus.OK,
      message: 'Comment created',
      data: comment,
    };
  }

  async like2(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (!comment.likedBy.includes(userId)) {
      comment.likedBy.push(userId);
      comment.likes++;
      // remove dislike if present
      comment.dislikedBy = comment.dislikedBy.filter((id) => id !== userId);
      comment.dislikes = comment.dislikedBy.length;

      await comment.save();
    }

    return comment;
  }

  async like(commentId: string, userId: string) {
    // 1️⃣  Get the comment and its owner
    const comment = await this.commentModel
      .findById(commentId)
      .populate('userId', 'username displayName avatar'); // populate owner fields

    if (!comment) throw new NotFoundException('Comment not found');

    const alreadyLiked = comment.likedBy.includes(userId);

    /* ---------- 2️⃣  Apply like / unlike logic ------------------- */
    if (alreadyLiked) {
      // user is un-liking
      comment.likedBy = comment.likedBy.filter((id) => id !== userId);
      comment.likes--;
    } else {
      // user is liking
      comment.likedBy.push(userId);
      comment.likes++;

      // remove any previous dislike
      comment.dislikedBy = comment.dislikedBy.filter((id) => id !== userId);
      comment.dislikes = comment.dislikedBy.length;

      /* ---------- 3️⃣  Create notification (skip self-like) ------ */
      if (comment.userId && comment.userId.toString() !== userId) {
        const liker = await this.userModel.findById(userId).lean();
        if (liker) {
          await this.notificationsService.createNotification({
            type: 'like',
            content: 'liked your comment',
            user: {
              username: liker.username,
              displayName: liker.displayName,
              avatar: liker.avatar,
            },
            recipientId: comment.userId.toString(), // who gets the notif
            recipient: comment._id.toString(), // optional ref
          });
        }
      }
    }

    await comment.save();

    return {
      liked: !alreadyLiked,
      likesCount: comment.likes,
      dislikesCount: comment.dislikes,
    };
  }

  async dislike(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (!comment.dislikedBy.includes(userId)) {
      comment.dislikedBy.push(userId);
      comment.dislikes++;
      // remove like if present
      comment.likedBy = comment.likedBy.filter((id) => id !== userId);
      comment.likes = comment.likedBy.length;
      await comment.save();
    }

    return comment;
  }

  async findByPost(postId: string) {
    return this.commentModel.find({ postId }).sort({ createdAt: -1 });
  }

  async delete(commentId: string, postId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this comment',
      );
    }

    if (comment.postId.toString() !== postId) {
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
    commentId: string,
    data: UpdateCommentDto,
    file?: Express.Multer.File,
  ): Promise<any> {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    // Handle image logic
    let image = comment.image ?? null;

    // If new file is uploaded, replace image
    if (file) {
      if (image?.public_id) {
        await this.mediaUploadService.deleteImages([image.public_id]);
      }
      const uploaded = await this.mediaUploadService.uploadImage(file);
      image = {
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
    }

    // If keepImage is false and no new file, remove old image
    if (!file && data.keepImage === false && image?.public_id) {
      await this.mediaUploadService.deleteImages([image.public_id]);
      image = null;
    }

    comment.content = data.content ?? comment.content;
    comment.image = image;

    await comment.save();

    return {
      code: HttpStatus.OK,
      message: 'Comment updated successfully',
      data: comment,
    };
  }
}
