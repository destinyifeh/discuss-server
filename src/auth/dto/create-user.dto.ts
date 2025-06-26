import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @MinLength(2)
  password: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsObject()
  @IsOptional()
  cover?: string;

  @IsOptional()
  @IsBoolean()
  isAdvertiser?: boolean;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dob?: string;
}
