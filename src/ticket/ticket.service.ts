import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Get user balance
   */
  async getUserBalance(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.balance;
  }

  /**
   * Add tickets to user balance (used when task is approved)
   */
  async addTickets(userId: string, amount: number): Promise<User> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Use atomic operation instead of transaction
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $inc: { balance: amount } },
        { new: true, runValidators: true }
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  /**
   * Deduct tickets from user balance (used when creating a task)
   */
  async deductTickets(userId: string, amount: number): Promise<User> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Use atomic operation with condition to ensure sufficient balance
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        {
          _id: userId,
          balance: { $gte: amount }, // Only update if balance is sufficient
        },
        { $inc: { balance: -amount } },
        { new: true, runValidators: true }
      )
      .exec();

    if (!updatedUser) {
      // Check if user exists to provide better error message
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Insufficient balance');
    }

    return updatedUser;
  }
}
