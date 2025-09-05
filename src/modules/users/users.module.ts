import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AdsModule } from '../ads/ads.module';
import { Ad, AdSchema } from '../ads/schema/ad.schema';
import { CommentsModule } from '../comments/comments.module';
import { Comment, CommentSchema } from '../comments/schema/comment.schema';
import { MediaUploadModule } from '../media-upload/media-upload.module';
import { PostsModule } from '../posts/posts.module';
import { Post, PostSchema } from '../posts/schema/post.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Ad.name, schema: AdSchema },
    ]),
    forwardRef(() => AuthModule),
    MediaUploadModule,
    NotificationsModule,
    CommentsModule,
    PostsModule,
    MailModule,
    AdsModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
