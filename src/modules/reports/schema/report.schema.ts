import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report {
  @Prop({
    required: true,
    enum: ['post', 'comment', 'ad', 'user', 'abuse', 'general'],
  })
  type: 'post' | 'comment' | 'ad' | 'user' | 'abuse' | 'general';
  @Prop({ type: Types.ObjectId, ref: 'Post', required: false })
  post?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Comment', required: false })
  comment?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ad', required: false })
  ad?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reportedBy?: Types.ObjectId;

  @Prop({ required: true }) reason: string;

  @Prop() isAnonymous: boolean;

  @Prop() note: string;

  @Prop({ default: 'open', enum: ['open', 'reviewing', 'closed'] })
  status: 'open' | 'reviewing' | 'closed' | 'warned';
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });
