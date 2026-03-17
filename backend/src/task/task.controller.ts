import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  createTask(@Req() req, @Body() dto: CreateTaskDto) {
    return this.taskService.createTask(req.user.sub, dto);
  }

  @Get('project/:projectId')
  getProjectTasks(@Param('projectId') projectId: string, @Req() req) {
    return this.taskService.getProjectTasks(projectId, req.user.sub);
  }

  @Patch(':id')
  updateTask(
    @Param('id') taskId: string,
    @Req() req,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(taskId, req.user.sub, dto);
  }

  @Delete(':id')
  deleteTask(@Param('id') taskId: string, @Req() req) {
    return this.taskService.deleteTask(taskId, req.user.sub);
  }

  @Get('statuses')
  getStatuses() {
    return this.taskService.getStatuses();
  }

  @Get('priorities')
  getPriorities() {
    return this.taskService.getPriorities();
  }

  @Get('complexities')
  getComplexities() {
    return this.taskService.getComplexities();
  }
}
