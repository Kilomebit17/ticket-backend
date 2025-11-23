import { IsString, IsNotEmpty } from 'class-validator';

export interface ApproveTaskDto {
  taskId: string;
}

export class ApproveTaskRequestDto implements ApproveTaskDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;
}

