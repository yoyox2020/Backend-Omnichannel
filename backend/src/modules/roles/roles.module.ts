import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from '../users/entities/user.entity';

import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { HierarchyGuard } from './guards/hierarchy.guard';
import { RolesController, PermissionsController } from './roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, User])],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, PermissionsService, HierarchyGuard],
  exports: [RolesService, PermissionsService],
})
export class RolesModule {}
