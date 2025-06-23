import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ enum: ['like', 'comment', 'follow'], required: true })
  type: string;

  @Prop({
    type: {
      username: String,
      displayName: String,
      avatar: String,
    },
    required: true,
  })
  user: {
    username: string;
    displayName: string;
    avatar: string;
  };

  @Prop({ required: true })
  content: string;

  //   @Prop({ type: Types.ObjectId, ref: 'Post', required: false })
  //   postId?: Types.ObjectId;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  recipientId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;
}

const NotificationSchema = SchemaFactory.createForClass(Notification);

// ✅ Add TTL index: delete after 30 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
); // 30 days

export { NotificationSchema };
