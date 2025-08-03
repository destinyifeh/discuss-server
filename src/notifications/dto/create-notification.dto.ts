import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  type: 'liked' | 'replied' | 'followed' | 'warning' | 'mentioned';

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
}
