import { Controller, Get, UseGuards } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('ticket')
@UseGuards(TelegramAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  /**
   * Get user balance
   * GET /api/ticket/balance
   */
  @Get('balance')
  async getBalance(@CurrentUser() user: User) {
    const balance = await this.ticketService.getUserBalance(user.id);
    return { balance };
  }
}

