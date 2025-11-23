import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export interface UserBoardDto {
  telegramIds: string[];
}

export class UserBoardRequestDto implements UserBoardDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  telegramIds: string[];
}

