import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { MediaUploadModule } from '../media-upload/media-upload.module';
import { PostsModule } from '../posts/posts.module';
import { Post, PostSchema } from '../posts/schema/post.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment, CommentSchema } from './schema/comment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MediaUploadModule,
    NotificationsModule,
    forwardRef(() => PostsModule),
  ],

  providers: [CommentsService],
  controllers: [CommentsController],
  exports: [CommentsService],
})
export class CommentsModule {}
