import {
  IsArray,
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
  @IsObject()
  avatar: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsString()
  @IsOptional()
  joined: string;

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

  @IsArray()
  @IsOptional()
  following?: string[];

  @IsArray()
  @IsOptional()
  followers?: string[];

  @IsOptional()
  @IsBoolean()
  isAdvertiser?: boolean;
}
