import { IsString, IsOptional, Length } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @Length(1, 100)
  module!: string;

  @IsString()
  @Length(1, 50)
  action!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
