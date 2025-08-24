import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  type:
    | 'liked'
    | 'replied'
    | 'followed'
    | 'warning'
    | 'mentioned'
    | 'ad_approved'
    | 'ad_rejected'
    | 'ad_paused'
    | 'ad_activated'
    | 'admin';

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsString()
  senderName: string;

  @IsOptional()
  @IsString()
  senderAvatar?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
