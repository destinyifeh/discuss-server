import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true, enum: ['post', 'comment', 'ad', 'user', 'abuse'] })
  targetType: 'post' | 'comment' | 'ad' | 'user' | 'abuse';
  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({ required: true }) reason: string;

  @Prop({ required: true }) abuseCategory: string;

  @Prop({ required: false }) isAnonymous: boolean;

  /* admin fields */
  @Prop({ default: 'open', enum: ['open', 'reviewing', 'closed'] })
  status: 'open' | 'reviewing' | 'closed' | 'warned';

  //   @Prop({
  //     type: [
  //       {
  //         reason: String,
  //         issuedAt: Date,
  //         resolved: Boolean,
  //         resolvedAt: Date,
  //         adminNote: String,
  //       },
  //     ],
  //     default: [],
  //   })
  //   warnings: {
  //     reason: string;
  //     issuedAt: Date;
  //     resolved: boolean;
  //     resolvedAt?: Date;
  //     adminNote?: string;
  //   }[];

  @Prop() adminNote?: string;
  @Prop() resolvedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });
