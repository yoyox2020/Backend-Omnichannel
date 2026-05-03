import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(0)
  permission_ids!: number[];
}
