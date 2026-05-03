import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users?page=1&limit=20&search=john&role_id=4&is_active=true
   */
  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  /**
   * GET /users/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.getUserWithRole(id);
    return user;
  }

  /**
   * POST /users  — Admin / Root only
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('Root', 'Admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * PATCH /users/:id  — owner can edit own profile; Admin/Root can edit anyone
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    const isOwner = currentUser.id === id;
    const isAdminOrAbove = currentUser.role.hierarchy <= 2;

    if (!isOwner && !isAdminOrAbove) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Staff cannot change is_active on their own profile
    if (isOwner && !isAdminOrAbove && dto.is_active !== undefined) {
      throw new ForbiddenException('You cannot change your own active status');
    }

    return this.usersService.update(id, dto);
  }

  /**
   * DELETE /users/:id  — Admin / Root only (soft delete)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Root', 'Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: AuthUser) {
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.usersService.delete(id);
  }

  /**
   * POST /users/:id/restore  — Admin / Root only
   */
  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles('Root', 'Admin')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.restore(id);
    return { message: 'User restored successfully' };
  }

  /**
   * POST /users/:id/change-password  — owner only
   */
  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    if (currentUser.id !== id) {
      throw new ForbiddenException('You can only change your own password');
    }

    await this.usersService.changePassword(id, dto.old_password, dto.new_password);
    return { message: 'Password changed successfully' };
  }
}
