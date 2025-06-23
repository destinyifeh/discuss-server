import { IsIn, IsOptional, IsString } from 'class-validator';

export class AccountRestrictionDto {
  @IsIn(['suspend', 'ban', 'unsuspend', 'unban'])
  action: 'suspend' | 'ban' | 'unsuspend' | 'unban';

  // required when action === 'suspend'
  @IsOptional()
  @IsIn(['1', '3', '7', '14', '21', '30'])
  period?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
