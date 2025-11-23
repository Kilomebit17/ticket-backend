import { IsString, IsOptional } from 'class-validator';

export interface UpdateUserInfoDto {
  name?: string;
  bio?: string;
  photoUrl?: string;
}

export class UpdateUserInfoRequestDto implements UpdateUserInfoDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}

