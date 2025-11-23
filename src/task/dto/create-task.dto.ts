import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export interface CreateTaskDto {
  familyId: string;
  name: string;
  description?: string;
  price: number;
}

export class CreateTaskRequestDto implements CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  familyId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  price: number;
}

