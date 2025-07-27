import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AdCTA, AdStatus } from 'src/common/utils/types/ad.types';

export type AdDocument = HydratedDocument<Ad>;

@Schema({ timestamps: true })
export class Ad {
  /* ---------- author (denormalised) ---------- */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop() authorName: string;

  @Prop() authorUsername: string;

  @Prop() authorAvatar: string;

  /* ---------- main ad info ------------------- */
  @Prop({ enum: ['sponsored', 'banner'], default: 'sponsored' })
  type: string;

  @Prop({ required: true }) title: string;

  @Prop({ required: true }) content: string;

  @Prop() imageUrl: string;

  @Prop({ enum: ['basic', 'professional', 'enterprise'], default: 'basic' })
  plan: string;

  @Prop({ required: true }) section: string;

  @Prop({ type: Number, default: 0 }) price: number;

  @Prop({
    enum: AdStatus,
    default: AdStatus.PENDING,
  })
  status: AdStatus;

  @Prop({ default: Date.now }) submittedDate: Date;

  @Prop() targetUrl: string;

  @Prop() duration: string;

  @Prop() approvedDate?: Date;

  @Prop() rejectedDate?: Date;

  // Rejection reason (optional)
  @Prop() rejectionReason?: string;

  @Prop({ enum: Object.values(AdCTA) })
  callToAction: AdCTA;
}

export const AdSchema = SchemaFactory.createForClass(Ad);
