import { IsString, IsNotEmpty } from 'class-validator';

export interface PerformTaskDto {
  taskId: string;
}

export class PerformTaskRequestDto implements PerformTaskDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;
}

