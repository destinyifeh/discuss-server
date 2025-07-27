import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CommentImage } from '../dto/create-comment.dto';
import { QuotedComment, QuotedCommentSchema } from './quoted-comment.schema';
export type CommentDocument = HydratedDocument<Comment>;
@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  post: Types.ObjectId;

  @Prop()
  content: string;

  @Prop()
  quoteId: string;

  @Prop({
    type: [
      {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    default: [],
  })
  images: CommentImage[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  dislikedBy: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  commentBy: Types.ObjectId;

  @Prop({ default: null, type: QuotedCommentSchema })
  quotedComment: QuotedComment;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
