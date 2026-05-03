import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from '../users/entities/user.entity';
import { AuthUser } from '../auth/auth.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,

    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────────

  findAll(): Promise<Role[]> {
    return this.roleRepo.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: { hierarchy: 'ASC' },
    });
  }

  // ── Single ────────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);
    return role;
  }

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(dto: CreateRoleDto): Promise<Role> {
    const [byName, byHierarchy] = await Promise.all([
      this.roleRepo.findOne({ where: { name: dto.name } }),
      this.roleRepo.findOne({ where: { hierarchy: dto.hierarchy } }),
    ]);

    if (byName) throw new ConflictException(`Role name '${dto.name}' is already taken`);
    if (byHierarchy) throw new ConflictException(`Hierarchy ${dto.hierarchy} is already in use`);

    const role = this.roleRepo.create({
      name: dto.name,
      label: dto.label,
      hierarchy: dto.hierarchy,
      description: dto.description ?? null,
      isActive: true,
    });
    return this.roleRepo.save(role);
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateRoleDto, currentUser: AuthUser): Promise<Role> {
    const role = await this.findOne(id);

    // Only Root can touch the Root role
    if (role.hierarchy === 1 && currentUser.role.hierarchy !== 1) {
      throw new ForbiddenException('Only Root can modify the Root role');
    }

    // Cannot elevate a role above the editor's own authority
    if (dto.hierarchy !== undefined && dto.hierarchy < currentUser.role.hierarchy) {
      throw new ForbiddenException(
        'Cannot set a role hierarchy above your own authority level',
      );
    }

    if (dto.hierarchy !== undefined && dto.hierarchy !== role.hierarchy) {
      const conflict = await this.roleRepo.findOne({ where: { hierarchy: dto.hierarchy } });
      if (conflict) throw new ConflictException(`Hierarchy ${dto.hierarchy} is already in use`);
    }

    if (dto.name !== undefined && dto.name !== role.name) {
      const conflict = await this.roleRepo.findOne({ where: { name: dto.name } });
      if (conflict) throw new ConflictException(`Role name '${dto.name}' is already taken`);
    }

    const patch: Partial<Role> = {};
    if (dto.name !== undefined)        patch.name        = dto.name;
    if (dto.label !== undefined)       patch.label       = dto.label;
    if (dto.hierarchy !== undefined)   patch.hierarchy   = dto.hierarchy;
    if (dto.description !== undefined) patch.description = dto.description;

    await this.roleRepo.update(id, patch);
    return this.findOne(id);
  }

  // ── Assign permissions ────────────────────────────────────────────────────────

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
    await this.findOne(roleId); // 404 guard

    // Validate all permission IDs exist
    if (permissionIds.length > 0) {
      const found = await this.permRepo.findByIds(permissionIds);
      if (found.length !== permissionIds.length) {
        const missing = permissionIds.filter((id) => !found.some((p) => p.id === id));
        throw new NotFoundException(`Permissions not found: [${missing.join(', ')}]`);
      }
    }

    // Replace atomically: delete old → insert new
    await this.rolePermRepo.delete({ roleId });

    if (permissionIds.length > 0) {
      const entries = permissionIds.map((pid) =>
        this.rolePermRepo.create({ roleId, permissionId: pid }),
      );
      await this.rolePermRepo.save(entries);
    }

    return this.findOne(roleId);
  }

  // ── User permission helpers ───────────────────────────────────────────────────

  async getUserPermissions(userId: string): Promise<Array<{ module: string; action: string }>> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });
    if (!user) throw new NotFoundException('User not found');

    return (user.role?.rolePermissions ?? []).map((rp) => ({
      module: rp.permission.module,
      action: rp.permission.action,
    }));
  }

  async checkPermission(userId: string, module: string, action: string): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    return perms.some((p) => p.module === module && p.action === action);
  }

  // ── Hierarchy comparison ──────────────────────────────────────────────────────

  /**
   * Returns -1 if role1 has MORE authority, 0 if equal, 1 if role1 has LESS authority.
   * (lower hierarchy number = higher authority)
   */
  async compareHierarchy(role1Id: number, role2Id: number): Promise<-1 | 0 | 1> {
    const [r1, r2] = await Promise.all([
      this.roleRepo.findOne({ where: { id: role1Id } }),
      this.roleRepo.findOne({ where: { id: role2Id } }),
    ]);
    if (!r1 || !r2) throw new NotFoundException('Role not found');

    if (r1.hierarchy < r2.hierarchy) return -1;
    if (r1.hierarchy > r2.hierarchy) return 1;
    return 0;
  }
}
