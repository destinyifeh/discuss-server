import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/common/utils/types/user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', ctx.getHandler());
    if (!requiredRoles) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return requiredRoles.some((r) => user.roles?.includes(r));
  }
}
