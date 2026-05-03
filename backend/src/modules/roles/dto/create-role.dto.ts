import { IsString, IsNumber, IsOptional, Min, Max, Length, IsNotEmpty } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  label!: string;

  @IsNumber()
  @Min(1)
  @Max(99)
  hierarchy!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
