import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  AccountStatus,
  ModerationAction,
  Role,
} from 'src/common/utils/types/user.type';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, required: true })
  username: string;

  @Prop({ required: true, unique: true, index: true })
  usernameLower: string;

  @Prop({ type: String, default: null })
  googleId: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;

  @Prop({ default: null })
  dob: Date;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, default: null })
  avatar: string;

  @Prop({ type: String, default: null })
  avatar_public_id: string;

  @Prop({ type: String, default: null })
  bio: string;

  @Prop({ type: String, default: null })
  location: string;

  @Prop({ type: String, default: null })
  cover_avatar: string;

  @Prop({ type: String, default: null })
  cover_avatar_public_id: string;

  @Prop({ type: String, default: null })
  website: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  followers: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  following: Types.ObjectId[];

  @Prop()
  gender: string;

  @Prop({ type: Date, default: Date.now })
  lastActive: Date;

  @Prop({ enum: AccountStatus, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @Prop({ type: [ModerationAction], default: [] })
  statusHistory: ModerationAction[];

  @Prop({ type: Date, default: null })
  suspendedUntil: Date | null;

  @Prop({ type: String, default: null })
  suspensionReason: string | null;

  @Prop({ type: String, default: null })
  banReason: string | null;

  @Prop({ type: String })
  refreshToken: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
