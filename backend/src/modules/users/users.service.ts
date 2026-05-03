import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { User } from './entities/user.entity';
import { UsersRepository, PaginatedUsers } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

const BCRYPT_ROUNDS = 12;

export type UserProfile = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  // ── List / search ────────────────────────────────────────────────────────────

  async findAll(query: QueryUserDto): Promise<{ data: UserProfile[]; meta: PaginatedUsers['meta'] }> {
    const result = await this.usersRepo.findPaginated(query);
    return {
      data: result.data.map((u) => this.strip(u)),
      meta: result.meta,
    };
  }

  async searchUsers(term: string): Promise<UserProfile[]> {
    const result = await this.usersRepo.findPaginated({ search: term, page: 1, limit: 20 });
    return result.data.map((u) => this.strip(u));
  }

  // ── Single user ───────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepo.findByUsername(username);
  }

  async getUserWithRole(userId: string): Promise<UserProfile> {
    return this.strip(await this.findOne(userId));
  }

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<UserProfile> {
    const [byEmail, byUsername] = await Promise.all([
      this.usersRepo.findByEmail(dto.email),
      this.usersRepo.findByUsername(dto.username),
    ]);

    if (byEmail) throw new ConflictException('Email is already registered');
    if (byUsername) throw new ConflictException('Username is already taken');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const repo = this.usersRepo.raw();
    const user = repo.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      fullName: dto.full_name,
      phone: dto.phone ?? null,
      roleId: dto.role_id,
      employeeId: dto.employee_id ?? null,
      department: dto.department ?? null,
      isActive: true,
    });

    const saved = await repo.save(user);
    return this.strip(saved);
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto): Promise<UserProfile> {
    await this.findOne(id); // 404 if not found

    const patch: Partial<User> = {};
    if (dto.full_name !== undefined) patch.fullName = dto.full_name;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.employee_id !== undefined) patch.employeeId = dto.employee_id;
    if (dto.department !== undefined) patch.department = dto.department;
    if (dto.is_active !== undefined) patch.isActive = dto.is_active;

    await this.usersRepo.raw().update(id, patch);
    return this.strip(await this.findOne(id));
  }

  // ── Soft delete / restore ─────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const user = await this.usersRepo.findByIdWithDeleted(id);
    if (!user) throw new NotFoundException(`User not found`);
    if (user.deletedAt) throw new BadRequestException('User is already deleted');

    await this.usersRepo.raw().softDelete(id);
  }

  async restore(id: string): Promise<void> {
    const user = await this.usersRepo.findByIdWithDeleted(id);
    if (!user) throw new NotFoundException(`User not found`);
    if (!user.deletedAt) throw new BadRequestException('User is not deleted');

    await this.usersRepo.raw().restore(id);
  }

  // ── Password ──────────────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findOne(userId);

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Current password is incorrect');

    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepo.raw().update(userId, { passwordHash: newHash });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private strip(user: User): UserProfile {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...rest } = user;
    return rest as UserProfile;
  }
}
