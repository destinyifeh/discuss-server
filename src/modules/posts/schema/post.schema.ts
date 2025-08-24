import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PostImage, PostStatus } from '../dto/create-post.dto';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true }) // adds createdAt, updatedAt
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop()
  section: string;

  @Prop()
  title: string;

  @Prop({ enum: PostStatus, default: PostStatus.PUBLISHED })
  status: PostStatus;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  bookmarkedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  viewedBy: Types.ObjectId[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({
    type: [
      {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    default: [],
  })
  images: PostImage[];

  @Prop({ default: false })
  commentsClosed: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);
