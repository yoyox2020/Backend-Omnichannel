import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { QueryUserDto } from './dto/query-user.dto';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedUsers {
  data: User[];
  meta: PaginationMeta;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findPaginated(query: QueryUserDto): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { search, role_id, is_active } = query;

    // Base AND filters (always applied)
    const base: FindOptionsWhere<User> = {};
    if (role_id !== undefined) base.roleId = role_id;
    if (is_active !== undefined) base.isActive = is_active;

    // When searching, each OR branch must also carry the base AND filters
    const where: FindOptionsWhere<User>[] | FindOptionsWhere<User> = search
      ? [
          { ...base, fullName: ILike(`%${search}%`) },
          { ...base, email: ILike(`%${search}%`) },
          { ...base, username: ILike(`%${search}%`) },
        ]
      : base;

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['role'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  // Include soft-deleted rows — needed for restore and existence checks
  findByIdWithDeleted(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id }, withDeleted: true });
  }

  // Expose the raw repo for save/update/softDelete/restore operations in the service
  raw(): Repository<User> {
    return this.repo;
  }
}
