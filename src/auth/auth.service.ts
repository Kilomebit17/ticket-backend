import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, Sex } from '../entities/user.entity';
import { extractInitDataFromHeader } from '../utils/telegram.util';
import { parse, validate } from '@tma.js/init-data-node';

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
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates Telegram init data and checks if user exists in DB
   * Returns JWT token if user exists, throws 401 if not
   */
  async checkUser(initDataHeader: string | undefined): Promise<string> {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const initDataRaw = extractInitDataFromHeader(initDataHeader);

    if (!initDataRaw) {
      console.error('Auth checkUser: No init data', { header: initDataHeader });
      throw new UnauthorizedException('Telegram init data is required');
    }

    // 1️⃣ Parse the incoming init data
    let parsed;
    try {
      parsed = parse(initDataRaw);
    } catch (e) {
      console.error('Auth checkUser: Failed to parse init data', e);
      throw new UnauthorizedException('Invalid Telegram init data');
    }

    // 2️⃣ Validate hash/signature
    try {
      validate(initDataRaw, botToken);
    } catch (e) {
      console.error('Auth checkUser: Validation failed', e);
      throw new UnauthorizedException('Unauthorized: Telegram data invalid');
    }

    if (!parsed.user) {
      throw new UnauthorizedException('No Telegram user data provided');
    }

    const tgUser = parsed.user;

    // Telegram ID
    const telegramId = String(tgUser.id);

    // 3️⃣ Check if user exists in DB
    const user = await this.userRepository.findOne({
      where: { telegramId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 4️⃣ Generate and return JWT token
    const payload = { sub: user.id, telegramId: user.telegramId };
    const token = this.jwtService.sign(payload);

    return token;
  }

  /**
   * Registers a new user with Telegram init data
   */
  async register(initDataHeader: string | undefined, registerDto: RegisterDto): Promise<User> {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;
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

    // Parse and validate init data
    let parsed;
    try {
      parsed = parse(initDataRaw);
      validate(initDataRaw, botToken);
    } catch (e) {
      console.error('Auth register: Validation failed', e);
      throw new UnauthorizedException('Invalid Telegram init data');
    }

    if (!parsed.user) {
      throw new UnauthorizedException('No Telegram user data provided');
    }

    const tgUser = parsed.user;
    const telegramId = String(tgUser.id);

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
      firstName: tgUser.firstName ?? '',
      lastName: tgUser.lastName ?? null,
      username: tgUser.username ?? null,
      name: registerDto.name,
      sex: registerDto.sex,
      balance: 0,
      photoUrl: tgUser.photoUrl ?? null,
    } as Partial<User>);

    return await this.userRepository.save(user);
  }

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
      validate(initDataRaw, botToken);
    } catch (e) {
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
