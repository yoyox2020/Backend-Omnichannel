import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to specific role names.
 * Usage: @Roles('Root', 'Admin')
 * Role hierarchy: Root(1) > Admin(2) > Manager(3) > Staff(4)
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
