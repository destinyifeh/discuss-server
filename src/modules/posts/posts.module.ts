import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CommentsModule } from '../comments/comments.module';
import { Comment, CommentSchema } from '../comments/schema/comment.schema';
import { MediaUploadModule } from '../media-upload/media-upload.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post, PostSchema } from './schema/post.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MediaUploadModule,
    NotificationsModule,
    forwardRef(() => CommentsModule),
  ],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
