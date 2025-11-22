import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { extractInitDataFromHeader } from '../../utils/telegram.util';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'];

    if (!initData) {
      throw new UnauthorizedException('Telegram init data is required');
    }

    try {
      const user = await this.authService.checkUser(initData);
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Telegram init data');
    }
  }
}

