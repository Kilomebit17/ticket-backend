import { IsString, IsNotEmpty } from 'class-validator';

export interface SolveTaskDto {
  taskId: string;
}

export class SolveTaskRequestDto implements SolveTaskDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;
}

