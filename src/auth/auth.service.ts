import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, Sex } from '../entities/user.entity';
import { validateTelegramInitData, extractInitDataFromHeader } from '../utils/telegram.util';
import type { TelegramInitData } from '../utils/telegram.util';

export interface RegisterDto {
  name: string;
  sex: Sex;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates Telegram init data and returns user if exists
   */
  async checkUser(initDataHeader: string | undefined): Promise<User | null> {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') ||
      process.env.TELEGRAM_BOT_TOKEN;
  
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }
  
    const initDataRaw = extractInitDataFromHeader(initDataHeader);
  
    if (!initDataRaw) {
      console.error('Auth checkUser: No init data', {
        header: initDataHeader,
      });
      throw new UnauthorizedException('Telegram init data is required');
    }
  
    console.log('Auth checkUser: Validating init data', {
      initDataLength: initDataRaw.length,
      initDataHead: initDataRaw.substring(0, 120),
      initDataTail: initDataRaw.substring(initDataRaw.length - 120),
    });
  
    const validatedData = validateTelegramInitData(initDataRaw, botToken);
  
    if (!validatedData?.user) {
      console.error('Auth checkUser: Validation failed', {
        validatedData,
        hasUser: !!validatedData?.user,
      });
      throw new UnauthorizedException('Invalid Telegram init data');
    }
  
    const telegramId = validatedData.user.id;
  
    return await this.userRepository.findOne({
      where: { telegramId },
    });
  }
  

  /**
   * Registers a new user with Telegram init data
   */
  async register(
    initDataHeader: string | undefined,
    registerDto: RegisterDto,
  ): Promise<User> {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured in environment variables');
    }

    const initDataRaw = extractInitDataFromHeader(initDataHeader);
    if (!initDataRaw) {
      console.error('Auth register: No init data received', { header: initDataHeader });
      throw new UnauthorizedException('Telegram init data is required');
    }

    console.log('Auth register: Validating init data', {
      initDataLength: initDataRaw.length,
      initDataPreview: initDataRaw.substring(0, 100),
      hasBotToken: !!botToken,
    });

    const validatedData = validateTelegramInitData(initDataRaw, botToken);
    if (!validatedData || !validatedData.user) {
      console.error('Auth register: Validation failed', {
        hasValidatedData: !!validatedData,
        hasUser: !!validatedData?.user,
      });
      throw new UnauthorizedException('Invalid Telegram init data');
    }

    const telegramId = validatedData.user.id;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { telegramId },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Create new user
    const user = this.userRepository.create({
      telegramId,
      firstName: validatedData.user.first_name,
      lastName: validatedData.user.last_name ?? null,
      username: validatedData.user.username ?? null,
      name: registerDto.name,
      sex: registerDto.sex,
      balance: 0,
      photoUrl: validatedData.user.photo_url ?? null,
    } as Partial<User>);

    return await this.userRepository.save(user);
  }

  /**
   * Gets user by Telegram init data
   */
  async getUserByInitData(initDataHeader: string | undefined): Promise<User> {
    const user = await this.checkUser(initDataHeader);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}

