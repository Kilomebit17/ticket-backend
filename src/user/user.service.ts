import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';
import { Types } from 'mongoose';

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
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userModel
      .findById(userId)
      .populate('families')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user by Telegram ID
   */
  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    return await this.userModel.findOne({ telegramId }).exec();
  }

  /**
   * Get user by Telegram username
   */
  async getUserByTelegramUsername(username: string): Promise<User | null> {
    if (!username) {
      return null;
    }
    // Remove @ if present
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    return await this.userModel.findOne({ username: cleanUsername }).exec();
  }

  /**
   * Update user info
   */
  async updateUserInfo(userId: string, updateDto: UpdateUserInfoDto): Promise<User> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.name !== undefined) {
      user.name = updateDto.name;
    }
    if (updateDto.bio !== undefined) {
      user.bio = updateDto.bio;
    }
    if (updateDto.photoUrl !== undefined) {
      user.photoUrl = updateDto.photoUrl;
    }

    return await user.save();
  }

  /**
   * Get user board - users from Telegram contacts that exist in database
   */
  async getUserBoard(telegramIds: string[]): Promise<User[]> {
    if (!telegramIds || telegramIds.length === 0) {
      return [];
    }

    const users = await this.userModel
      .find({
        telegramId: { $in: telegramIds },
      })
      .populate('families')
      .exec();

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
