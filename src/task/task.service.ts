import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskStatus, TaskDocument } from '../entities/task.entity';
import { User, UserDocument } from '../entities/user.entity';
import { Family, FamilyDocument } from '../entities/family.entity';
import { TicketService } from '../ticket/ticket.service';
import { Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { PerformTaskDto } from './dto/perform-task.dto';
import { ApproveTaskDto } from './dto/approve-task.dto';
import { SolveTaskDto } from './dto/solve-task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Family.name)
    private readonly familyModel: Model<FamilyDocument>,
    private readonly ticketService: TicketService,
  ) {}

  /**
   * Create a new task
   */
  async createTask(userId: string, createDto: CreateTaskDto): Promise<Task> {
    if (createDto.price <= 0) {
      throw new BadRequestException('Task price must be positive');
    }

    // Check if user has sufficient balance
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < createDto.price) {
      throw new BadRequestException('Insufficient balance to create task');
    }

    // Check if family exists and user is a member
    const family = await this.familyModel
      .findById(createDto.familyId)
      .populate('members')
      .exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const isMember = family.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId ? member : member._id || member;
      return memberId.equals(userIdObj);
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Use atomic operations instead of transactions (works on standalone MongoDB)
    // Step 1: Atomically deduct balance (only if sufficient)
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        {
          _id: userId,
          balance: { $gte: createDto.price }, // Only update if balance is sufficient
        },
        { $inc: { balance: -createDto.price } },
        { new: true, runValidators: true }
      )
      .exec();

    if (!updatedUser) {
      // Check if user exists to provide better error message
      const userCheck = await this.userModel.findById(userId).exec();
      if (!userCheck) {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Insufficient balance to create task');
    }

    // Step 2: Create task
    const task = new this.taskModel({
      name: createDto.name,
      description: createDto.description ?? null,
      price: createDto.price,
      familyId: new Types.ObjectId(createDto.familyId),
      creatorId: new Types.ObjectId(userId),
      status: TaskStatus.CREATED,
    });

    const savedTask = await task.save();

    // Step 3: Atomically add task to family's tasks array
    const updatedFamily = await this.familyModel
      .findByIdAndUpdate(
        createDto.familyId,
        { $push: { tasks: savedTask._id } },
        { new: true, runValidators: true }
      )
      .exec();

    if (!updatedFamily) {
      // Rollback: refund the balance and delete the task
      await this.userModel.findByIdAndUpdate(
        userId,
        { $inc: { balance: createDto.price } }
      ).exec();
      await this.taskModel.findByIdAndDelete(savedTask._id).exec();
      throw new NotFoundException('Family not found after task creation');
    }

    return savedTask;
  }

  /**
   * Get tasks for a family
   */
  async getFamilyTasks(familyId: string, userId: string): Promise<Task[]> {
    // Verify user is a member of the family
    const family = await this.familyModel
      .findById(familyId)
      .populate('members')
      .exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const isMember = family.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId ? member : member._id || member;
      return memberId.equals(userIdObj);
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Query tasks directly by familyId to ensure we get full task documents
    const familyIdObj = new Types.ObjectId(familyId);
    const tasks = await this.taskModel
      .find({ familyId: familyIdObj })
      .populate('creatorId')
      .populate('solverId')
      .populate({
        path: 'familyId',
        populate: 'members',
      })
      .sort({ createdAt: -1 })
      .exec();

    return tasks;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskModel
      .findById(taskId)
      .populate('creatorId')
      .populate('solverId')
      .populate({
        path: 'familyId',
        populate: 'members',
      })
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is a member of the family
    const family = task.familyId as any;
    if (!family || !family.members) {
      throw new NotFoundException('Family not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const isMember = family.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId ? member : member._id || member;
      return memberId.equals(userIdObj);
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return task;
  }

  /**
   * Perform a task (mark as pending for approval)
   */
  async performTask(userId: string, performDto: PerformTaskDto): Promise<Task> {
    const task = await this.taskModel
      .findById(performDto.taskId)
      .populate({
        path: 'familyId',
        populate: 'members',
      })
      .populate('creatorId')
      .populate('solverId')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is a member of the family
    const family = task.familyId as any;
    if (!family || !family.members) {
      throw new NotFoundException('Family not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const isMember = family.members.some((member: any) => {
      const memberId = member instanceof Types.ObjectId ? member : member._id || member;
      return memberId.equals(userIdObj);
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Check if task can be performed
    if (task.status !== TaskStatus.CREATED) {
      throw new BadRequestException('Task is not available for performing');
    }

    // User cannot perform their own task
    const creatorId = task.creatorId instanceof Types.ObjectId 
      ? task.creatorId 
      : (task.creatorId as any)?._id || task.creatorId;

    if (creatorId && creatorId.equals(userIdObj)) {
      throw new BadRequestException('You cannot perform your own task');
    }

    // Update task
    task.status = TaskStatus.PENDING;
    task.solverId = new Types.ObjectId(userId);
    task.solvedAt = new Date();

    return await task.save();
  }

  /**
   * Solve a task (mark as pending for approval)
   * This is an alias for performTask with clearer semantic naming
   */
  async solveTask(userId: string, solveDto: SolveTaskDto): Promise<Task> {
    // Reuse performTask logic since it does exactly what we need
    const performDto: PerformTaskDto = { taskId: solveDto.taskId };
    return this.performTask(userId, performDto);
  }

  /**
   * Approve a task (give reward to solver)
   */
  async approveTask(userId: string, approveDto: ApproveTaskDto): Promise<Task> {
    const task = await this.taskModel
      .findById(approveDto.taskId)
      .populate({
        path: 'familyId',
        populate: 'members',
      })
      .populate('creatorId')
      .populate('solverId')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is the creator
    const creatorId = task.creatorId instanceof Types.ObjectId 
      ? task.creatorId 
      : (task.creatorId as any)?._id || task.creatorId;
    const userIdObj = new Types.ObjectId(userId);

    if (!creatorId || !creatorId.equals(userIdObj)) {
      throw new ForbiddenException('Only the task creator can approve it');
    }

    // Check if task is pending
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Task is not pending approval');
    }

    if (!task.solverId) {
      throw new BadRequestException('Task has no solver');
    }

    let solverId: string;
    if (task.solverId instanceof Types.ObjectId) {
      solverId = task.solverId.toString();
    } else if (task.solverId && typeof task.solverId === 'object' && '_id' in task.solverId) {
      solverId = (task.solverId as any)._id?.toString() || String(task.solverId);
    } else {
      solverId = String(task.solverId);
    }

    // Approve task
    task.status = TaskStatus.APPROVED;
    task.approvedAt = new Date();
    const approvedTask = await task.save();

    // Give reward to solver (this has its own transaction)
    await this.ticketService.addTickets(solverId, task.price);

    return approvedTask;
  }

  /**
   * Get user's tasks (created and solved)
   */
  async getUserTasks(userId: string): Promise<{
    created: Task[];
    solved: Task[];
  }> {
    const userIdObj = new Types.ObjectId(userId);

    const [created, solved] = await Promise.all([
      this.taskModel
        .find({ creatorId: userIdObj })
        .populate('familyId')
        .populate('solverId')
        .sort({ createdAt: -1 })
        .exec(),
      this.taskModel
        .find({ solverId: userIdObj })
        .populate('familyId')
        .populate('creatorId')
        .sort({ createdAt: -1 })
        .exec(),
    ]);

    return { created, solved };
  }
}
