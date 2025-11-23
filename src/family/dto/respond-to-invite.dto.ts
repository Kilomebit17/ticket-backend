import { IsString, IsNotEmpty, IsBoolean, IsMongoId } from 'class-validator';

export interface RespondToInviteDto {
  inviteId: string;
  accept: boolean;
}

export class RespondToInviteRequestDto implements RespondToInviteDto {
  @IsMongoId()
  @IsNotEmpty()
  inviteId: string;

  @IsBoolean()
  accept: boolean;
}

