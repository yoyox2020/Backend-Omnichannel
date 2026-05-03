import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,          // makes ConfigService available everywhere without re-importing
      load: [appConfig, databaseConfig],
      envFilePath: '.env',     // resolved from cwd — the project root where npm is run
      cache: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
  ],
})
export class AppModule {}
