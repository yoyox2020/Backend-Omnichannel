import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';

import databaseConfig, { DatabaseConfig } from '../config/database.config';
import { Role } from '../modules/roles/entities/role.entity';
import { Permission } from '../modules/roles/entities/permission.entity';
import { RolePermission } from '../modules/roles/entities/role-permission.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserSession } from '../modules/auth/entities/user-session.entity';
import { AuditLog } from '../common/entities/audit-log.entity';

const logger = new Logger('DatabaseModule');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [databaseConfig.KEY],
      useFactory: (config: DatabaseConfig): TypeOrmModuleOptions => {
        logger.log(
          `Connecting to PostgreSQL → ${config.host}:${config.port}/${config.database}`,
        );

        return {
          type: 'postgres',
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          database: config.database,
          entities: [Role, Permission, RolePermission, User, UserSession, AuditLog],
          synchronize: config.synchronize,
          logging: config.logging,
          dropSchema: false,
          migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
          migrationsRun: false,
          ssl: config.ssl ? { rejectUnauthorized: false } : false,
          // Connection pool tuning
          extra: {
            max: 10,
            min: 2,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
          },
          // Surface connection errors clearly at startup
          retryAttempts: 5,
          retryDelay: 3_000,
          autoLoadEntities: false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
