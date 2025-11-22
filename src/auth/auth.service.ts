import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, Sex } from '../entities/user.entity';
import { extractInitDataFromHeader } from '../utils/telegram.util';
import { parse,validate, isValid } from '@tma.js/init-data-node';

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
   * Validates Telegram init data and checks if user exists in DB
   * Returns user if exists, throws 401 if not
   */
  async checkUser(initData: string): Promise<User> {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    console.log('Auth checkUser: Validating init data', { initData, botToken });
    const initDataRaw = isValid(initData, botToken);

    if (!initDataRaw) {
      console.error('Auth checkUser: No init data', { header: initData });
      throw new UnauthorizedException('Telegram init data is required');
    }

    // Парсим initData и достаем Telegram ID пользователя
    const tgId = parse(initData).user?.id;

    if (!tgId) {
      throw new BadRequestException('AUTH__INVALID_INITDATA'); // Ошибка, если ID отсутствует
    }

    // Telegram ID
    const telegramId = String(tgId);

    // Check if user exists in DB
    const user = await this.userRepository.findOne({
      where: { telegramId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Registers a new user with Telegram init data
   */
  // async register(initDataHeader: string | undefined, registerDto: RegisterDto): Promise<User> {
  //   const botToken =
  //     this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;
  //   if (!botToken) {
  //     throw new Error('TELEGRAM_BOT_TOKEN is not configured in environment variables');
  //   }

  //   const initDataRaw = extractInitDataFromHeader(initDataHeader);
  //   if (!initDataRaw) {
  //     console.error('Auth register: No init data received', { header: initDataHeader });
  //     throw new UnauthorizedException('Telegram init data is required');
  //   }


  //   // Create new user
  //   const user = this.userRepository.create({
  //     telegramId,
  //     firstName: tgUser.firstName ?? '',
  //     lastName: tgUser.lastName ?? null,
  //     username: tgUser.username ?? null,
  //     name: registerDto.name,
  //     sex: registerDto.sex,
  //     balance: 0,
  //     photoUrl: tgUser.photoUrl ?? null,
  //   } as Partial<User>);

  //   return await this.userRepository.save(user);
  // }

  /**
   * Gets user by Telegram init data
   */
  async getUserByInitData(initDataHeader: string | undefined): Promise<User> {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const initDataRaw = extractInitDataFromHeader(initDataHeader);

    if (!initDataRaw) {
      throw new UnauthorizedException('Telegram init data is required');
    }

    // Parse and validate init data
    let parsed;
    try {
      parsed = parse(initDataRaw);
      // Disable expiration check (client handles expiration)
      validate(initDataRaw, botToken, { expiresIn: 0 });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Auth getUserByInitData: Validation failed', {
        error: errorMessage,
        initDataLength: initDataRaw.length,
      });
      throw new UnauthorizedException('Invalid Telegram init data');
    }

    if (!parsed.user) {
      throw new UnauthorizedException('No Telegram user data provided');
    }

    const telegramId = String(parsed.user.id);
    const user = await this.userRepository.findOne({
      where: { telegramId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
