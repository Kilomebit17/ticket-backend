import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UpdateUserInfoRequestDto } from './dto/update-user-info.dto';
import { UserBoardRequestDto } from './dto/user-board.dto';

@Controller('user')
@UseGuards(TelegramAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get current user info
   * GET /api/user/me
   */
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    const fullUser = await this.userService.getUserById(user.id);
    return { user: fullUser };
  }

  /**
   * Update current user info
   * PUT /api/user/me
   */
  @Put('me')
  async updateMe(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateUserInfoRequestDto,
  ) {
    const updatedUser = await this.userService.updateUserInfo(user.id, updateDto);
    return { user: updatedUser };
  }

  /**
   * Search users by Telegram username (supports partial matching)
   * GET /api/user/search?username=username
   */
  @Get('search')
  async searchByUsername(@Query('username') username: string) {
    if (!username) {
      return { users: [] };
    }
    const users = await this.userService.getUserByTelegramUsername(username);
    return { users };
  }

  /**
   * Get user details by ID
   * GET /api/user/:id
   */
  @Get(':id')
  async getUserDetails(
    @Param('id') userId: string,
    @CurrentUser() currentUser: User,
  ) {
    const user = await this.userService.getUserDetails(userId, currentUser.id);
    return { user };
  }

  /**
   * Get user board - users from Telegram contacts
   * POST /api/user/board
   */
  @Post('board')
  async getUserBoard(
    @CurrentUser() user: User,
    @Body() boardDto: UserBoardRequestDto,
  ) {
    const users = await this.userService.getUserBoard(boardDto.telegramIds);
    return { users };
  }
}

