// dto/change-password.dto.ts
import { IsNotEmpty, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'New password must include uppercase, lowercase letters, and a number',
  })
  newPassword: string;
}
