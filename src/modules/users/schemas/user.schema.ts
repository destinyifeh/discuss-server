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
  @Prop({ unique: true })
  username: string;

  @Prop({ unique: true })
  displayName: string;

  @Prop()
  googleId: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  posts: Types.ObjectId;

  @Prop({ type: [String], enum: Role, default: [Role.USER] })
  roles: Role[];

  @Prop()
  dob: number;

  @Prop({ unique: true })
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
  phone: string | null;

  @Prop({ type: String, default: null })
  location: string;

  @Prop({ type: String, default: null })
  cover_avatar: string;

  @Prop({ type: String, default: null })
  cover_avatar_public_id: string;

  @Prop({ type: String, default: null })
  website: string;

  @Prop({ type: [String], default: [] })
  following: string[];

  @Prop({ type: [String], default: [] })
  followers: string[];

  @Prop({ type: Boolean, default: false })
  isAdvertiser: boolean;

  @Prop()
  gender: string;

  @Prop()
  age?: number;

  @Prop({ type: Boolean, default: false })
  isAdmin: boolean;

  @Prop({ type: Boolean, default: false })
  isSuperAdmin: boolean;

  @Prop({ type: Boolean, default: false })
  isBanned: boolean;

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

  @Prop()
  verifyToken: string;

  @Prop()
  verifyTokenExpires: Date;

  @Prop({ type: String })
  refreshToken: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop()
  joined: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({
    type: [
      {
        reason: String,
        issuedAt: Date,
        resolved: Boolean,
        resolvedAt: Date,
        adminNote: String,
      },
    ],
    default: [],
  })
  warnings: {
    reason: string;
    issuedAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
    adminNote?: string;
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
