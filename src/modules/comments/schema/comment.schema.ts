import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type CommentDocument = HydratedDocument<Comment>;
@Schema({ timestamps: true })
export class Comment {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  post: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop()
  username: string;

  @Prop()
  avatar: string;

  @Prop()
  content: string;

  @Prop({
    type: Object,
    default: null,
  })
  image?: {
    secure_url: string;
    public_id: string;
  } | null;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ type: [String], default: [] })
  likedBy: string[];

  @Prop({ default: 0 })
  dislikes: number;

  @Prop({ type: [String], default: [] })
  dislikedBy: string[];
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
