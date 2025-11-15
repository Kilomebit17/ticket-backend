import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../entities/user.entity';

export interface UpdateUserInfoDto {
  name?: string;
  bio?: string;
  photoUrl?: string;
}

export interface UserBoardDto {
  telegramIds: string[];
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['families'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user by Telegram ID
   */
  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { telegramId },
    });
  }

  /**
   * Update user info
   */
  async updateUserInfo(userId: string, updateDto: UpdateUserInfoDto): Promise<User> {
    const user = await this.getUserById(userId);

    if (updateDto.name !== undefined) {
      user.name = updateDto.name;
    }
    if (updateDto.bio !== undefined) {
      user.bio = updateDto.bio;
    }
    if (updateDto.photoUrl !== undefined) {
      user.photoUrl = updateDto.photoUrl;
    }

    return await this.userRepository.save(user);
  }

  /**
   * Get user board - users from Telegram contacts that exist in database
   */
  async getUserBoard(telegramIds: string[]): Promise<User[]> {
    if (!telegramIds || telegramIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: {
        telegramId: In(telegramIds),
      },
      relations: ['families'],
    });

    return users;
  }

  /**
   * Get user details (public info)
   */
  async getUserDetails(userId: string, requestingUserId: string): Promise<User> {
    const user = await this.getUserById(userId);

    // Users can see their own full details or other users' public details
    // For now, return full user object (can be filtered later if needed)
    return user;
  }
}

