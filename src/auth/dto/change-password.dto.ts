// dto/change-password.dto.ts
import { IsNotEmpty, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Old password is required' })
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(4, { message: 'New password must be at least 4 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).+$/, {
    message:
      'New password must include uppercase, lowercase letters, and at least one special character',
  })
  password: string;
}
