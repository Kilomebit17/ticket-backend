import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { Sex } from '../../entities/user.entity';

export interface RegisterDto {
  name: string;
  sex: Sex;
}

export class RegisterRequestDto implements RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Sex)
  sex: Sex;
}

