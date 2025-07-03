import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class NotificationUserDto {
  @IsString()
  username: string;

  @IsString()
  avatar: string; // or use @IsUrl() if you want strict URL validation
}

export class CreateNotificationDto {
  @IsString()
  type: 'like' | 'comment' | 'follow' | 'warning';

  @ValidateNested()
  @Type(() => NotificationUserDto)
  user: NotificationUserDto;

  @IsString()
  content: string;

  @IsString()
  recipientId: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  // @IsString()
  // @IsOptional()
  // postId: string | undefined;
}
