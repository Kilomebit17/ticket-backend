import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family, FamilyDocument } from '../entities/family.entity';
import { FamilyInvite, FamilyInviteStatus, FamilyInviteDocument } from '../entities/family-invite.entity';
import { User, UserDocument } from '../entities/user.entity';
import { Types } from 'mongoose';

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
    @InjectModel(Family.name)
    private readonly familyModel: Model<FamilyDocument>,
    @InjectModel(FamilyInvite.name)
    private readonly familyInviteModel: Model<FamilyInviteDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new family
   */
  async createFamily(userId: string, createDto: CreateFamilyDto): Promise<Family> {
    const user = await this.userModel
      .findById(userId)
      .populate('families')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const family = new this.familyModel({
      name: createDto.name,
      creatorId: new Types.ObjectId(userId),
      members: [new Types.ObjectId(userId)],
    });

    const savedFamily = await family.save();

    // Add family to user's families array
    if (!user.families) {
      user.families = [];
    }
    user.families.push(savedFamily._id);
    await user.save();

    return savedFamily;
  }

  /**
   * Get user's families
   */
  async getUserFamilies(userId: string): Promise<Family[]> {
    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'families',
        populate: [
          { path: 'members' },
          { path: 'tasks' },
        ],
      })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return populated families (Mongoose populate returns full documents)
    // When populated, families are Family documents, not ObjectIds
    return (user.families as unknown as Family[]) || [];
  }

  /**
   * Get family by ID
   */
  async getFamilyById(familyId: string, userId: string): Promise<Family> {
    const family = await this.familyModel
      .findById(familyId)
      .populate('members')
      .populate({
        path: 'tasks',
        populate: [
          { path: 'creatorId', model: 'User' },
          { path: 'solverId', model: 'User' },
        ],
      })
      .exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Check if user is a member
    const userIdObj = new Types.ObjectId(userId);
    const isMember = family.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId ? member : member._id || member;
      return memberId.equals(userIdObj);
    });

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
    const family = await this.familyModel
      .findById(familyId)
      .populate('members')
      .exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Check if user is a member
    const fromUserIdObj = new Types.ObjectId(fromUserId);
    const isMember = family.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId ? member : member._id || member;
      return memberId.equals(fromUserIdObj);
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Check if target user exists
    const toUser = await this.userModel.findById(inviteDto.toUserId).exec();

    if (!toUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if user is already a member
    const toUserIdObj = new Types.ObjectId(inviteDto.toUserId);
    const isAlreadyMember = family.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId ? member : member._id || member;
      return memberId.equals(toUserIdObj);
    });

    if (isAlreadyMember) {
      throw new BadRequestException('User is already a member of this family');
    }

    // Check if there's already a pending invite
    const existingInvite = await this.familyInviteModel.findOne({
      familyId: new Types.ObjectId(familyId),
      fromUserId: new Types.ObjectId(fromUserId),
      toUserId: new Types.ObjectId(inviteDto.toUserId),
      status: FamilyInviteStatus.PENDING,
    }).exec();

    if (existingInvite) {
      throw new BadRequestException('Invite already sent');
    }

    // Create invite
    const invite = new this.familyInviteModel({
      familyId: new Types.ObjectId(familyId),
      fromUserId: new Types.ObjectId(fromUserId),
      toUserId: new Types.ObjectId(inviteDto.toUserId),
      status: FamilyInviteStatus.PENDING,
    });

    return await invite.save();
  }

  /**
   * Get user's invites (sent and received)
   */
  async getUserInvites(userId: string): Promise<{
    sent: FamilyInvite[];
    received: FamilyInvite[];
  }> {
    const userIdObj = new Types.ObjectId(userId);

    const [sent, received] = await Promise.all([
      this.familyInviteModel
        .find({ fromUserId: userIdObj })
        .populate('toUserId')
        .populate('fromUserId')
        .sort({ createdAt: -1 })
        .exec(),
      this.familyInviteModel
        .find({
          toUserId: userIdObj,
          status: FamilyInviteStatus.PENDING,
        })
        .populate('fromUserId')
        .populate('toUserId')
        .sort({ createdAt: -1 })
        .exec(),
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
    const invite = await this.familyInviteModel
      .findById(respondDto.inviteId)
      .populate('fromUserId')
      .populate('toUserId')
      .exec();

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const toUserIdObj = invite.toUserId instanceof Types.ObjectId 
      ? invite.toUserId 
      : new Types.ObjectId((invite.toUserId as any)._id || invite.toUserId);

    if (!toUserIdObj.equals(userIdObj)) {
      throw new ForbiddenException('You are not authorized to respond to this invite');
    }

    if (invite.status !== FamilyInviteStatus.PENDING) {
      throw new BadRequestException('Invite has already been responded to');
    }

    if (respondDto.accept) {
      // Add user to family
      const family = await this.familyModel
        .findById(invite.familyId)
        .populate('members')
        .exec();

      if (!family) {
        throw new NotFoundException('Family not found');
      }

      const toUser = await this.userModel.findById(userId).exec();

      if (!toUser) {
        throw new NotFoundException('User not found');
      }

      // Add user to family members
      const toUserIdObj2 = new Types.ObjectId(userId);
      const isAlreadyMember = family.members.some((member: any) => {
        const memberId = member instanceof Types.ObjectId ? member : member._id || member;
        return memberId.equals(toUserIdObj2);
      });

      if (!isAlreadyMember) {
        family.members.push(toUserIdObj2);
        await family.save();

        // Add family to user's families array
        if (!toUser.families) {
          toUser.families = [];
        }
        const familyIdObj = invite.familyId instanceof Types.ObjectId 
          ? invite.familyId 
          : new Types.ObjectId((invite.familyId as any)._id || invite.familyId);
        
        const familyExists = toUser.families.some((f: any) => {
          const fId = f instanceof Types.ObjectId ? f : f._id || f;
          return fId.equals(familyIdObj);
        });

        if (!familyExists) {
          toUser.families.push(familyIdObj);
          await toUser.save();
        }
      }

      invite.status = FamilyInviteStatus.ACCEPTED;
    } else {
      invite.status = FamilyInviteStatus.REJECTED;
    }

    return await invite.save();
  }
}
