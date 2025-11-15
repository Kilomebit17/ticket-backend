import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get user balance
   */
  async getUserBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

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

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const updatedUser = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      updatedUser.balance += amount;
      return await userRepo.save(updatedUser);
    });
  }

  /**
   * Deduct tickets from user balance (used when creating a task)
   */
  async deductTickets(userId: string, amount: number): Promise<User> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const updatedUser = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      if (updatedUser.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      updatedUser.balance -= amount;
      return await userRepo.save(updatedUser);
    });
  }
}

