import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { TaskService } from './task.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { CreateTaskRequestDto } from './dto/create-task.dto';
import { PerformTaskRequestDto } from './dto/perform-task.dto';
import { ApproveTaskRequestDto } from './dto/approve-task.dto';
import { SolveTaskRequestDto } from './dto/solve-task.dto';

@Controller('task')
@UseGuards(TelegramAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * Create a new task
   * POST /api/task
   */
  @Post()
  async createTask(@CurrentUser() user: User, @Body() createDto: CreateTaskRequestDto) {
    const task = await this.taskService.createTask(user.id, createDto);
    return { task };
  }

  /**
   * Get user's tasks
   * GET /api/task/my
   */
  @Get('my')
  async getMyTasks(@CurrentUser() user: User) {
    const tasks = await this.taskService.getUserTasks(user.id);
    return { tasks };
  }

  /**
   * Get tasks for a family
   * GET /api/task/family/:familyId
   */
  @Get('family/:familyId')
  async getFamilyTasks(@Param('familyId') familyId: string, @CurrentUser() user: User) {
    const tasks = await this.taskService.getFamilyTasks(familyId, user.id);
    return { tasks };
  }

  /**
   * Get task by ID
   * GET /api/task/:id
   */
  @Get(':id')
  async getTaskById(@Param('id') taskId: string, @CurrentUser() user: User) {
    const task = await this.taskService.getTaskById(taskId, user.id);
    return { task };
  }

  /**
   * Perform a task
   * POST /api/task/perform
   */
  @Post('perform')
  async performTask(@CurrentUser() user: User, @Body() performDto: PerformTaskRequestDto) {
    const task = await this.taskService.performTask(user.id, performDto);
    return { task };
  }

  /**
   * Solve a task (transform to pending status)
   * POST /api/task/solve
   */
  @Post('solve')
  async solveTask(@CurrentUser() user: User, @Body() solveDto: SolveTaskRequestDto) {
    const task = await this.taskService.solveTask(user.id, solveDto);
    return { task };
  }

  /**
   * Approve a task
   * PUT /api/task/approve
   */
  @Put('approve')
  async approveTask(@CurrentUser() user: User, @Body() approveDto: ApproveTaskRequestDto) {
    const task = await this.taskService.approveTask(user.id, approveDto);
    return { task };
  }
}
