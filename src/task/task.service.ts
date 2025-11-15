import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { Family } from '../entities/family.entity';
import { TicketService } from '../ticket/ticket.service';

export interface CreateTaskDto {
  familyId: string;
  name: string;
  description?: string;
  price: number;
}

export interface PerformTaskDto {
  taskId: string;
}

export interface ApproveTaskDto {
  taskId: string;
}

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
    private readonly ticketService: TicketService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new task
   */
  async createTask(userId: string, createDto: CreateTaskDto): Promise<Task> {
    if (createDto.price <= 0) {
      throw new BadRequestException('Task price must be positive');
    }

    // Check if user has sufficient balance
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < createDto.price) {
      throw new BadRequestException('Insufficient balance to create task');
    }

    // Check if family exists and user is a member
    const family = await this.familyRepository.findOne({
      where: { id: createDto.familyId },
      relations: ['members'],
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const isMember = family.members.some((member) => member.id === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Use transaction to create task and deduct tickets
    return await this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Task);
      const userRepo = manager.getRepository(User);

      // Lock user row
      const lockedUser = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedUser || lockedUser.balance < createDto.price) {
        throw new BadRequestException('Insufficient balance');
      }

      // Deduct tickets
      lockedUser.balance -= createDto.price;
      await userRepo.save(lockedUser);

      // Create task
      const task = taskRepo.create({
        name: createDto.name,
        description: createDto.description ?? null,
        price: createDto.price,
        familyId: createDto.familyId,
        creatorId: userId,
        status: TaskStatus.CREATED,
      });

      return await taskRepo.save(task);
    });
  }

  /**
   * Get tasks for a family
   */
  async getFamilyTasks(familyId: string, userId: string): Promise<Task[]> {
    // Verify user is a member of the family
    const family = await this.familyRepository.findOne({
      where: { id: familyId },
      relations: ['members'],
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const isMember = family.members.some((member) => member.id === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    const tasks = await this.taskRepository.find({
      where: { familyId },
      relations: ['creator', 'solver', 'family'],
      order: { createdAt: 'DESC' },
    });

    return tasks;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['creator', 'solver', 'family', 'family.members'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is a member of the family
    const isMember = task.family.members.some((member) => member.id === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return task;
  }

  /**
   * Perform a task (mark as pending for approval)
   */
  async performTask(userId: string, performDto: PerformTaskDto): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: performDto.taskId },
      relations: ['family', 'family.members', 'creator', 'solver'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is a member of the family
    const isMember = task.family.members.some((member) => member.id === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Check if task can be performed
    if (task.status !== TaskStatus.CREATED) {
      throw new BadRequestException('Task is not available for performing');
    }

    // User cannot perform their own task
    if (task.creatorId === userId) {
      throw new BadRequestException('You cannot perform your own task');
    }

    // Update task
    task.status = TaskStatus.PENDING;
    task.solverId = userId;
    task.solvedAt = new Date();

    return await this.taskRepository.save(task);
  }

  /**
   * Approve a task (give reward to solver)
   */
  async approveTask(userId: string, approveDto: ApproveTaskDto): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: approveDto.taskId },
      relations: ['family', 'family.members', 'creator', 'solver'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is the creator
    if (task.creatorId !== userId) {
      throw new ForbiddenException('Only the task creator can approve it');
    }

    // Check if task is pending
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Task is not pending approval');
    }

    if (!task.solverId) {
      throw new BadRequestException('Task has no solver');
    }

    const solverId = task.solverId; // Store in variable for TypeScript

    // Use transaction to approve task and give reward
    return await this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Task);

      // Approve task
      task.status = TaskStatus.APPROVED;
      task.approvedAt = new Date();
      const approvedTask = await taskRepo.save(task);

      // Give reward to solver
      await this.ticketService.addTickets(solverId, task.price);

      return approvedTask;
    });
  }

  /**
   * Get user's tasks (created and solved)
   */
  async getUserTasks(userId: string): Promise<{
    created: Task[];
    solved: Task[];
  }> {
    const [created, solved] = await Promise.all([
      this.taskRepository.find({
        where: { creatorId: userId },
        relations: ['family', 'solver'],
        order: { createdAt: 'DESC' },
      }),
      this.taskRepository.find({
        where: { solverId: userId },
        relations: ['family', 'creator'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    return { created, solved };
  }
}

