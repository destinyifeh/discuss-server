import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AdCTA, AdStatus } from 'src/common/utils/types/ad.types';

export type AdDocument = HydratedDocument<Ad>;

@Schema({ timestamps: true })
export class Ad {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ enum: ['sponsored', 'banner'], default: 'sponsored' })
  type: string;

  @Prop({ required: true }) title: string;

  @Prop({ required: false, default: null }) content: string;

  @Prop({ type: String, default: null })
  imageUrl: string;

  @Prop({ type: String, default: null })
  image_public_id: string;

  @Prop({ enum: ['basic', 'professional', 'enterprise'], default: 'basic' })
  plan: string;

  @Prop({ required: false }) section: string;

  @Prop({ type: String, default: '0' }) price: string;

  @Prop({
    enum: AdStatus,
    default: AdStatus.PENDING,
  })
  status: AdStatus;

  @Prop({ default: Date.now }) submittedDate: Date;

  @Prop() targetUrl: string;

  @Prop() duration: string;

  @Prop() approvedDate?: Date;

  @Prop({ default: null }) rejectedDate?: Date;

  @Prop({ default: null }) pausedDate?: Date;

  @Prop() activatedDate?: Date;

  @Prop() rejectionReason?: string;

  @Prop() expirationDate?: Date;

  @Prop() clicks?: number;

  @Prop() impressions?: number;

  @Prop({ enum: AdCTA })
  callToAction: AdCTA;
}

export const AdSchema = SchemaFactory.createForClass(Ad);
