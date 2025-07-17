import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Post, PostSchema } from '../posts/schema/post.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UnsuspendCron } from './schedulers/unsuspend.cron';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },

      { name: Post.name, schema: PostSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [AdminService, UnsuspendCron],
  controllers: [AdminController],
})
export class AdminModule {}
