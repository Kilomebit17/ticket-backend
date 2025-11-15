import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../entities/family.entity';
import { FamilyInvite, FamilyInviteStatus } from '../entities/family-invite.entity';
import { User } from '../entities/user.entity';

export interface CreateFamilyDto {
  name: string;
}

export interface InviteToFamilyDto {
  toUserId: string;
}

export interface RespondToInviteDto {
  inviteId: string;
  accept: boolean;
}

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
    @InjectRepository(FamilyInvite)
    private readonly familyInviteRepository: Repository<FamilyInvite>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new family
   */
  async createFamily(userId: string, createDto: CreateFamilyDto): Promise<Family> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['families'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const family = this.familyRepository.create({
      name: createDto.name,
      creatorId: userId,
      members: [user],
    });

    return await this.familyRepository.save(family);
  }

  /**
   * Get user's families
   */
  async getUserFamilies(userId: string): Promise<Family[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['families', 'families.members', 'families.tasks'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.families || [];
  }

  /**
   * Get family by ID
   */
  async getFamilyById(familyId: string, userId: string): Promise<Family> {
    const family = await this.familyRepository.findOne({
      where: { id: familyId },
      relations: ['members', 'tasks', 'tasks.creator', 'tasks.solver'],
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Check if user is a member
    const isMember = family.members.some((member) => member.id === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return family;
  }

  /**
   * Send invite to family
   */
  async inviteToFamily(
    familyId: string,
    fromUserId: string,
    inviteDto: InviteToFamilyDto,
  ): Promise<FamilyInvite> {
    const family = await this.familyRepository.findOne({
      where: { id: familyId },
      relations: ['members'],
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Check if user is a member
    const isMember = family.members.some((member) => member.id === fromUserId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Check if target user exists
    const toUser = await this.userRepository.findOne({
      where: { id: inviteDto.toUserId },
    });

    if (!toUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if user is already a member
    const isAlreadyMember = family.members.some(
      (member) => member.id === inviteDto.toUserId,
    );
    if (isAlreadyMember) {
      throw new BadRequestException('User is already a member of this family');
    }

    // Check if there's already a pending invite
    const existingInvite = await this.familyInviteRepository.findOne({
      where: {
        familyId,
        fromUserId,
        toUserId: inviteDto.toUserId,
        status: FamilyInviteStatus.PENDING,
      },
    });

    if (existingInvite) {
      throw new BadRequestException('Invite already sent');
    }

    // Create invite
    const invite = this.familyInviteRepository.create({
      familyId,
      fromUserId,
      toUserId: inviteDto.toUserId,
      status: FamilyInviteStatus.PENDING,
    });

    return await this.familyInviteRepository.save(invite);
  }

  /**
   * Get user's invites (sent and received)
   */
  async getUserInvites(userId: string): Promise<{
    sent: FamilyInvite[];
    received: FamilyInvite[];
  }> {
    const [sent, received] = await Promise.all([
      this.familyInviteRepository.find({
        where: { fromUserId: userId },
        relations: ['toUser', 'fromUser'],
        order: { createdAt: 'DESC' },
      }),
      this.familyInviteRepository.find({
        where: { toUserId: userId, status: FamilyInviteStatus.PENDING },
        relations: ['fromUser', 'toUser'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    return { sent, received };
  }

  /**
   * Respond to invite (accept or reject)
   */
  async respondToInvite(
    userId: string,
    respondDto: RespondToInviteDto,
  ): Promise<FamilyInvite> {
    const invite = await this.familyInviteRepository.findOne({
      where: { id: respondDto.inviteId },
      relations: ['fromUser', 'toUser'],
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.toUserId !== userId) {
      throw new ForbiddenException('You are not authorized to respond to this invite');
    }

    if (invite.status !== FamilyInviteStatus.PENDING) {
      throw new BadRequestException('Invite has already been responded to');
    }

    if (respondDto.accept) {
      // Add user to family
      const family = await this.familyRepository.findOne({
        where: { id: invite.familyId },
        relations: ['members'],
      });

      if (!family) {
        throw new NotFoundException('Family not found');
      }

      const toUser = await this.userRepository.findOne({
        where: { id: invite.toUserId },
      });

      if (!toUser) {
        throw new NotFoundException('User not found');
      }

      // Add user to family members
      if (!family.members.some((member) => member.id === toUser.id)) {
        family.members.push(toUser);
        await this.familyRepository.save(family);
      }

      invite.status = FamilyInviteStatus.ACCEPTED;
    } else {
      invite.status = FamilyInviteStatus.REJECTED;
    }

    return await this.familyInviteRepository.save(invite);
  }
}

