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
