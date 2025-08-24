import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  @IsString()
  dob?: string;
}

export class MailUserDto {
  @IsString()
  username: string;

  @IsString()
  email: string;

  @IsString()
  senderName: string;

  @IsString()
  senderEmail: string;

  @IsString()
  message: string;

  @IsString()
  subject: string;
}
