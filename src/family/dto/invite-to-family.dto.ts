import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export interface InviteToFamilyDto {
  toUserId: string;
}

export class InviteToFamilyRequestDto implements InviteToFamilyDto {
  @IsMongoId()
  @IsNotEmpty()
  toUserId: string;
}

