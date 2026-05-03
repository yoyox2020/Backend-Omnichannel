import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../entities/role.entity';
import { AuthUser } from '../../auth/auth.service';

/**
 * Enforces hierarchical role protection on routes with a :id param.
 * A user can only manage roles whose hierarchy number is >= their own
 * (i.e. same or lower authority). Root (1) can manage all.
 *
 * Usage: @UseGuards(JwtAuthGuard, HierarchyGuard)
 */
@Injectable()
export class HierarchyGuard implements CanActivate {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: AuthUser; params: { id?: string } }>();
    const currentUser = request.user;

    if (!currentUser) throw new UnauthorizedException();

    const targetId = parseInt(request.params.id ?? '', 10);
    if (isNaN(targetId)) return true; // invalid id — let the controller/service handle it

    const targetRole = await this.roleRepo.findOne({ where: { id: targetId } });
    if (!targetRole) return true; // role not found — let the service throw 404

    // A user can only manage roles with >= hierarchy number (equal or lower authority)
    if (currentUser.role.hierarchy > targetRole.hierarchy) {
      throw new ForbiddenException(
        `Cannot manage a role with higher authority than yours ` +
          `(your level: ${currentUser.role.hierarchy}, target level: ${targetRole.hierarchy})`,
      );
    }

    return true;
  }
}
