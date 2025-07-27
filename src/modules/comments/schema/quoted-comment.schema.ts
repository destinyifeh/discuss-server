import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class QuotedComment {
  @Prop({ required: true })
  quotedContent: string;

  @Prop({ required: true })
  quotedUser: string;

  @Prop()
  quotedUserImage: string;

  @Prop({ required: true })
  quotedId: string;

  @Prop({ required: true })
  quotedUserId: string;

  @Prop({ type: [String], default: [] })
  quotedImage?: string[];
}

export const QuotedCommentSchema = SchemaFactory.createForClass(QuotedComment);
