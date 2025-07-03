import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
