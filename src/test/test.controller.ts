import { Controller, Get, Post, Headers, Body } from '@nestjs/common';
import { TestService } from './test.service';
import { AuthService } from '../auth/auth.service';

@Controller('test')
export class TestController {
  constructor(
    private readonly testService: TestService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Basic health check endpoint
   * GET /api/test/health
   */
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Backend is running',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Server info endpoint
   * GET /api/test/info
   */
  @Get('info')
  getServerInfo() {
    return this.testService.getServerInfo();
  }

  /**
   * Database connection test
   * GET /api/test/database
   */
  @Get('database')
  async testDatabase() {
    const result = await this.testService.testDatabase();
    return {
      ...result,
      message: result.connected
        ? 'Database connection successful'
        : 'Database connection failed',
    };
  }

  /**
   * Full system test
   * GET /api/test/system
   */
  @Get('system')
  async testSystem() {
    const serverInfo = this.testService.getServerInfo();
    const dbTest = await this.testService.testDatabase();

    return {
      server: serverInfo,
      database: dbTest,
      status: dbTest.connected ? 'all_systems_operational' : 'database_error',
    };
  }

  /**
   * Test Telegram init data validation
   * POST /api/test/telegram
   */
  @Post('telegram')
  async testTelegram(@Headers('x-telegram-init-data') initData: string) {
    try {
      const user = await this.authService.checkUser(initData);
      return {
        success: true,
        message: user ? 'User found' : 'User not found',
        user: user
          ? {
              id: user.id,
              telegramId: user.telegramId,
              name: user.name,
            }
          : null,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Echo endpoint for testing requests
   * POST /api/test/echo
   */
  @Post('echo')
  echo(@Body() body: unknown, @Headers() headers: Record<string, string>) {
    return {
      message: 'Echo test',
      received: {
        body,
        headers: {
          'x-telegram-init-data': headers['x-telegram-init-data']
            ? 'present'
            : 'missing',
          'content-type': headers['content-type'],
        },
        timestamp: new Date().toISOString(),
      },
    };
  }
}

