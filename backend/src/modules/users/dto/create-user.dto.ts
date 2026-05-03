import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }) => (value as string)?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(100)
  @Transform(({ value }) => (value as string)?.trim())
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (value as string)?.trim())
  full_name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsInt()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  role_id!: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  employee_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;
}
