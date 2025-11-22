import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectConnection()
    private readonly connection: Connection,
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

    // Use MongoDB session for transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const user = await this.userModel
        .findById(userId)
        .session(session)
        .exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.balance += amount;
      const updatedUser = await user.save({ session });

      await session.commitTransaction();
      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Deduct tickets from user balance (used when creating a task)
   */
  async deductTickets(userId: string, amount: number): Promise<User> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Use MongoDB session for transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const user = await this.userModel
        .findById(userId)
        .session(session)
        .exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      user.balance -= amount;
      const updatedUser = await user.save({ session });

      await session.commitTransaction();
      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
