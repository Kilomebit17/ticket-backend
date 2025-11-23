import { Controller, Get, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { RegisterDto } from './auth.service';
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { Sex, UserDocument } from '../entities/user.entity';
import { Types } from 'mongoose';

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
   * Check if user exists - returns user if exists, 401 if not
   * GET /api/auth/me
   */
  @Get('me')
  async checkUser(@Headers('x-telegram-init-data') initData: string) {
    const user = await this.authService.checkUser(initData);
    
    // Extract familyId from families array (since user can only have one family)
    const families = user.families || [];
    const familyId = families.length > 0 
      ? (families[0] instanceof Types.ObjectId 
          ? families[0].toString() 
          : String(families[0]))
      : null;
    
    // Create response object with familyId instead of families
    // Use toJSON() to get plain object with virtual fields (like id)
    const userDoc = user as UserDocument;
    const userPlain = userDoc.toJSON ? userDoc.toJSON() : (user as any);
    const { families: _, ...userWithoutFamilies } = userPlain;
    const userResponse = {
      ...userWithoutFamilies,
      familyId,
    };
    
    return { user: userResponse };
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
