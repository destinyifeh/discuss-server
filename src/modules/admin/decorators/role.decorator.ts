import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/common/utils/types/user.type';
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
