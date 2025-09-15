import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters.' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Username can only contain letters, numbers, and underscores (no spaces).',
  })
  username: string;

  @IsEmail()
  email: string;

  @MinLength(2)
  password: string;

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

export class ForgotPassDto {
  @IsEmail()
  email: string;
}

export class ResetPassDto {
  @MinLength(2)
  password: string;

  @IsString()
  token: string;
}
