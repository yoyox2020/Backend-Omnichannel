import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class QueryUserDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => (value as string)?.trim())
  search?: string;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  @Type(() => Number)
  role_id?: number;

  @IsBoolean()
  @IsOptional()
  // Query params arrive as strings; convert 'true'/'false' to boolean
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  is_active?: boolean;
}
