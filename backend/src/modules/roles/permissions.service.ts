import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  findAll(): Promise<Permission[]> {
    return this.repo.find({ order: { module: 'ASC', action: 'ASC' } });
  }

  findByModule(module: string): Promise<Permission[]> {
    return this.repo.find({ where: { module }, order: { action: 'ASC' } });
  }

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.repo.findOne({
      where: { module: dto.module, action: dto.action },
    });
    if (existing) {
      throw new ConflictException(`Permission '${dto.module}:${dto.action}' already exists`);
    }

    const permission = this.repo.create({
      module: dto.module,
      action: dto.action,
      description: dto.description ?? null,
    });
    return this.repo.save(permission);
  }
}
