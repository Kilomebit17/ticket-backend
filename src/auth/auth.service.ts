import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../entities/user.entity';
import { extractInitDataFromHeader } from '../utils/telegram.util';
import { parse, validate } from '@tma.js/init-data-node';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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

    const tgId = parse(initData).user?.id;

    if (!tgId) {
      throw new BadRequestException('AUTH__INVALID_INITDATA'); // Ошибка, если ID отсутствует
    }

    // Telegram ID
    const telegramId = String(tgId);

    const user = await this.userModel
      .findOne({
        telegramId,
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Registers a new user from Telegram init data
   * Validates init data, checks if user already exists, and creates new user
   * Returns created user or throws error if user already exists
   */
  async register(initData: string, registerDto: RegisterDto): Promise<User> {
    const botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    // Validate init data
    const parsed = parse(initData)
    

    if (!parsed.user) {
      throw new BadRequestException('AUTH__INVALID_INITDATA');
    }

    const telegramId = String(parsed.user.id);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      telegramId,
    }).exec();

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Create new user
    const newUser = new this.userModel({
      telegramId,
      firstName: parsed.user.first_name,
      lastName: parsed.user.last_name || null,
      username: parsed.user.username || null,
      name: registerDto.name,
      sex: registerDto.sex,
      photoUrl: parsed.user.photo_url || null,
      balance: 0,
      bio: null,
      families: [],
    });

    const savedUser = await newUser.save();
    return savedUser;
  }
}
