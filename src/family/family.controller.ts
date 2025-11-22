import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FamilyService, InviteToFamilyDto, RespondToInviteDto } from './family.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { IsString, IsNotEmpty, IsBoolean, IsUUID } from 'class-validator';

class InviteToFamilyRequestDto implements InviteToFamilyDto {
  @IsUUID()
  @IsNotEmpty()
  toUserId: string;
}

class RespondToInviteRequestDto implements RespondToInviteDto {
  @IsUUID()
  @IsNotEmpty()
  inviteId: string;

  @IsBoolean()
  accept: boolean;
}

@Controller('family')
@UseGuards(TelegramAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  /**
   * Get user's families
   * GET /api/family
   */
  @Get()
  async getUserFamilies(@CurrentUser() user: User) {
    const families = await this.familyService.getUserFamilies(user.id);
    return { families };
  }

  /**
   * Invite user to create family (family will be created when invite is accepted)
   * POST /api/family/invite
   */
  @Post('invite')
  async inviteToFamily(
    @CurrentUser() user: User,
    @Body() inviteDto: InviteToFamilyRequestDto,
  ) {
    const invite = await this.familyService.inviteToFamily(
      user.id,
      inviteDto,
    );
    return { invite };
  }

  /**
   * Get family by ID
   * GET /api/family/:id
   */
  @Get(':id')
  async getFamilyById(
    @Param('id') familyId: string,
    @CurrentUser() user: User,
  ) {
    const family = await this.familyService.getFamilyById(familyId, user.id);
    return { family };
  }

  /**
   * Get user's invites
   * GET /api/family/invites
   */
  @Get('invites')
  async getUserInvites(@CurrentUser() user: User) {
    const invites = await this.familyService.getUserInvites(user.id);
    return invites;
  }

  /**
   * Respond to invite
   * PUT /api/family/invites/respond
   */
  @Put('invites/respond')
  async respondToInvite(
    @CurrentUser() user: User,
    @Body() respondDto: RespondToInviteRequestDto,
  ) {
    const invite = await this.familyService.respondToInvite(user.id, respondDto);
    return { invite };
  }
}

