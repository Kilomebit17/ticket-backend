import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Test database connection
   */
  async testDatabase(): Promise<{ connected: boolean; userCount: number }> {
    try {
      const userCount = await this.userRepository.count();
      return {
        connected: true,
        userCount,
      };
    } catch (error) {
      return {
        connected: false,
        userCount: 0,
      };
    }
  }

  /**
   * Get server info
   */
  getServerInfo(): {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

