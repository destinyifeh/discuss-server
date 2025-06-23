import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional() abuseCategory?: string;
  @IsOptional() isAnonymous?: boolean;
}
