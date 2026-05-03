import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{
      user: { role: { name: string; hierarchy: number } };
    }>();

    if (!user?.role) {
      throw new ForbiddenException('Access denied: no role assigned');
    }

    const allowed = required.includes(user.role.name);
    if (!allowed) {
      throw new ForbiddenException(
        `Access denied: requires one of [${required.join(', ')}]`,
      );
    }

    return true;
  }
}
