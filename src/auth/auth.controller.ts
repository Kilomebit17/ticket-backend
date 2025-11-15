import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { RegisterDto } from './auth.service';
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { Sex } from '../entities/user.entity';

class RegisterRequestDto implements RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Sex)
  sex: Sex;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Check if user exists - returns user if exists, 404 if not
   * GET /api/auth/me
   */
  @Get('me')
  async checkUser(@Headers('x-telegram-init-data') initData: string) {
    const user = await this.authService.checkUser(initData);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { user };
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Headers('x-telegram-init-data') initData: string,
    @Body() registerDto: RegisterRequestDto,
  ) {
    const user = await this.authService.register(initData, registerDto);
    return { user };
  }
}

