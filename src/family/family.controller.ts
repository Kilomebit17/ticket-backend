import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FamilyService, CreateFamilyDto, InviteToFamilyDto, RespondToInviteDto } from './family.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { IsString, IsNotEmpty, IsBoolean, IsUUID } from 'class-validator';

class CreateFamilyRequestDto implements CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

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
   * Create a new family
   * POST /api/family
   */
  @Post()
  async createFamily(
    @CurrentUser() user: User,
    @Body() createDto: CreateFamilyRequestDto,
  ) {
    const family = await this.familyService.createFamily(user.id, createDto);
    return { family };
  }

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
   * Invite user to family
   * POST /api/family/:id/invite
   */
  @Post(':id/invite')
  async inviteToFamily(
    @Param('id') familyId: string,
    @CurrentUser() user: User,
    @Body() inviteDto: InviteToFamilyRequestDto,
  ) {
    const invite = await this.familyService.inviteToFamily(
      familyId,
      user.id,
      inviteDto,
    );
    return { invite };
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

