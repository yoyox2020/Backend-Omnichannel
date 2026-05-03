import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(99)
  hierarchy?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
