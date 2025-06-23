import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PostImage } from '../dto/create-post.dto';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true }) // adds createdAt, updatedAt
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  username: string;

  @Prop()
  displayName: string;

  @Prop()
  avatar: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop()
  sectionId: string;

  @Prop()
  section: string;

  @Prop()
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  reposts: number;

  @Prop({ default: 0 })
  bookmarks: number;

  @Prop({ default: 0 })
  comments: number;

  @Prop({ default: 0 })
  views: number;

  @Prop({ type: [String], default: [] })
  likedBy: string[];

  @Prop({ type: [String], default: [] })
  bookmarkedBy: string[];

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

  @Prop({ default: 0 })
  commentCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);
