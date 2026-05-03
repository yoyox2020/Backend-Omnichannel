import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { HierarchyGuard } from './guards/hierarchy.guard';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

// ── Roles ─────────────────────────────────────────────────────────────────────

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /roles
   * List all roles with their permissions. Accessible to all authenticated users.
   */
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  /**
   * GET /roles/:id
   * Single role with full permission list.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  /**
   * POST /roles
   * Create a new role. Root only.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('Root')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  /**
   * PATCH /roles/:id
   * Update role metadata. HierarchyGuard blocks users from editing roles with
   * more authority than their own. Additional service-level checks prevent
   * privilege escalation.
   */
  @Patch(':id')
  @UseGuards(HierarchyGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.rolesService.update(id, dto, currentUser);
  }

  /**
   * POST /roles/:id/permissions
   * Replace all permissions on a role. Root or Admin only.
   */
  @Post(':id/permissions')
  @UseGuards(RolesGuard)
  @Roles('Root', 'Admin')
  @HttpCode(HttpStatus.OK)
  assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto.permission_ids);
  }
}

// ── Permissions ───────────────────────────────────────────────────────────────

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * GET /permissions
   * GET /permissions?module=tickets   ← filter by module
   */
  @Get()
  findAll(@Query('module') module?: string) {
    if (module) return this.permissionsService.findByModule(module);
    return this.permissionsService.findAll();
  }
}
