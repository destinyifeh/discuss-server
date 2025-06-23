import { Prop } from '@nestjs/mongoose';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  ADVERTISER = 'advertiser',
}

export enum AccountStatus {
  ACTIVE = 'active',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
}

export class ModerationAction {
  @Prop({ required: true, enum: ['suspend', 'ban', 'unsuspend', 'unban'] })
  action: string;

  @Prop({ required: true })
  performedBy: string; // Admin name or ID

  @Prop({ required: true })
  performedAt: Date;

  @Prop()
  reason?: string;

  @Prop()
  suspensionPeriod?: string; // Optional: '7', '14', etc.
}
