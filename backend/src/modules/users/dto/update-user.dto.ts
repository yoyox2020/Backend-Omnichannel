import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// email, username, password, and role_id are intentionally excluded —
// those are changed via dedicated endpoints only.
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => (value as string)?.trim())
  full_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  employee_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
