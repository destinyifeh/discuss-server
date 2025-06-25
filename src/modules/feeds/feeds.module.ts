import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from '../ads/schema/ad.schema';
import { Comment, CommentSchema } from '../comments/schema/comment.schema';
import { Post, PostSchema } from '../posts/schema/post.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Ad.name, schema: AdSchema },
    ]),
  ],
  providers: [FeedsService],
  controllers: [FeedsController],
  exports: [FeedsService],
})
export class FeedsModule {}
