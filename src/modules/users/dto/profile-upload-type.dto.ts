import { IsIn } from 'class-validator';

export class ProfileUploadTypeDto {
  @IsIn(['profile_cover', 'profile_photo'])
  fileType: string;
}
